const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { calculateEOQ } = require('../utils/inventoryUtils');

const getSupplierInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.find({ supplierId: req.user.id }).populate('productId');
    res.status(200).json(inventory);
  } catch (error) {
    next(error);
  }
};

const getAllInventoryAdmin = async (_req, res, next) => {
  try {
    const inventory = await Inventory.find().populate('productId supplierId');
    res.status(200).json(inventory);
  } catch (error) {
    next(error);
  }
};

const getInventoryByProduct = async (req, res, next) => {
  try {
    const inventory = await Inventory.find({ productId: req.params.productId }).populate('productId supplierId');
    res.status(200).json(inventory);
  } catch (error) {
    next(error);
  }
};

const countAllInventory = async (_req, res, next) => {
  try {
    const [summary] = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalCurrentStock: { $sum: '$currentStock' },
          totalReservedStock: { $sum: '$reservedStock' },
          inventoryItems: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json(
      summary || {
        totalCurrentStock: 0,
        totalReservedStock: 0,
        inventoryItems: 0,
      }
    );
  } catch (error) {
    next(error);
  }
};

const countInventoryById = async (req, res, next) => {
  try {
    const inventory = await Inventory.findById(req.params.invnetoryId);

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    inventory.lastStackTakeAt = new Date();
    await inventory.save();

    return res.status(200).json({
      inventoryId: inventory.id,
      currentStock: inventory.currentStock,
      reservedStock: inventory.reservedStock,
      availableStock: inventory.currentStock - inventory.reservedStock,
      lastStackTakeAt: inventory.lastStackTakeAt,
    });
  } catch (error) {
    return next(error);
  }
};

const createOrLoadInventoryForProduct = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    if (quantity === undefined || Number(quantity) < 0) {
      return res.status(400).json({ message: 'quantity must be a non-negative number' });
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (String(product.supplierId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Cannot manage inventory for this product' });
    }

    const inventory = await Inventory.findOneAndUpdate(
      { productId: req.params.productId, supplierId: req.user.id },
      {
        $inc: { currentStock: Number(quantity) },
        $set: { lastRestockedAt: new Date() },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json(inventory);
  } catch (error) {
    return next(error);
  }
};

const restockInventory = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    if (quantity === undefined || Number(quantity) <= 0) {
      return res.status(400).json({ message: 'quantity must be a positive number' });
    }

    const inventory = await Inventory.findById(req.params.inventoryId);

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    if (String(inventory.supplierId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    inventory.currentStock += Number(quantity);
    inventory.lastRestockedAt = new Date();
    await inventory.save();

    return res.status(200).json(inventory);
  } catch (error) {
    return next(error);
  }
};

const updateMinimumStock = async (req, res, next) => {
  try {
    const { minimumStockLevel, annualDemand, orderCost, holdingCost } = req.body;
    const inventory = await Inventory.findById(req.params.inventoryId);

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    if (String(inventory.supplierId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (
      annualDemand !== undefined &&
      orderCost !== undefined &&
      holdingCost !== undefined
    ) {
      inventory.minimumStockLevel = calculateEOQ({
        annualDemand: Number(annualDemand),
        orderCost: Number(orderCost),
        holdingCost: Number(holdingCost),
      });
    } else {
      if (minimumStockLevel === undefined || Number(minimumStockLevel) < 0) {
        return res.status(400).json({ message: 'minimumStockLevel must be a non-negative number' });
      }

      inventory.minimumStockLevel = Number(minimumStockLevel);
    }

    await inventory.save();
    return res.status(200).json(inventory);
  } catch (error) {
    return next(error);
  }
};

const adjustInventoryLevel = async (req, res, next) => {
  try {
    const { adjustment = 0, isReturn = false } = req.body;
    const adjustmentAmount = Number(adjustment);

    if (!Number.isFinite(adjustmentAmount) || adjustmentAmount === 0) {
      return res.status(400).json({ message: 'adjustment must be a non-zero number' });
    }

    const inventory = await Inventory.findById(req.params.inventoryId);

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    if (String(inventory.supplierId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (adjustmentAmount > 0 && isReturn) {
      const product = await Product.findById(inventory.productId);
      if (product && product.expiryDate) {
        return res.status(400).json({
          message: 'Cannot auto-return stock for products with expiry date',
        });
      }
    }

    const updatedStock = inventory.currentStock + adjustmentAmount;

    if (updatedStock < 0) {
      return res.status(400).json({ message: 'currentStock cannot be negative' });
    }

    inventory.currentStock = updatedStock;
    await inventory.save();

    return res.status(200).json({
      ...inventory.toObject(),
      availableStock: inventory.currentStock - inventory.reservedStock,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSupplierInventory,
  getAllInventoryAdmin,
  getInventoryByProduct,
  countAllInventory,
  countInventoryById,
  createOrLoadInventoryForProduct,
  restockInventory,
  updateMinimumStock,
  adjustInventoryLevel,
};
