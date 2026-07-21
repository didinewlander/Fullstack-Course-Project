//@ts-nocheck
const Inventory = require("../models/inventoryModel");

const createInventory = async (inventoryData, session) => {
  if (session) {
    const [inventory] = await Inventory.create([inventoryData], { session });

    return inventory;
  }

  return Inventory.create(inventoryData);
};

const findInventoryById = async (inventoryId, session) => {
  const query = Inventory.findById(inventoryId);

  if (session) {
    query.session(session);
  }

  return query.lean();
};

const findInventoryByProductId = async (productId, session) => {
  const query = Inventory.findOne({
    productId,
  });

  if (session) {
    query.session(session);
  }

  return query.lean();
};

const findInventoryByIdWithProduct = async (inventoryId) => {
  return Inventory.findById(inventoryId)
    .populate({
      path: "productId",
      select: "name sku imageUrl visibility unitPrice supplierId",
    })
    .populate("supplierId", "username email role")
    .lean();
};

const findInventories = async ({ filter, skip = 0, limit = 20 }) => {
  return Inventory.find(filter)
    .populate({
      path: "productId",
      select: "name sku imageUrl visibility unitPrice",
    })
    .populate("supplierId", "username email role")
    .sort({
      updatedAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countInventories = async (filter) => {
  return Inventory.countDocuments(filter);
};

const restockInventory = async ({ inventoryId, quantity, session }) => {
  const query = Inventory.findByIdAndUpdate(
    inventoryId,
    {
      $inc: {
        currentStock: quantity,
      },

      $set: {
        lastRestockedAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (session) {
    query.session(session);
  }

  return query.lean();
};

const setMinimumStockLevel = async ({
  inventoryId,
  minimumStockLevel,
  session,
}) => {
  const query = Inventory.findByIdAndUpdate(
    inventoryId,
    {
      $set: {
        minimumStockLevel,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (session) {
    query.session(session);
  }

  return query.lean();
};

/*
 * A manager may perform a physical stock correction.
 *
 * currentStock may not be set lower than reservedStock.
 */
const setCurrentStock = async ({ inventoryId, currentStock, session }) => {
  const query = Inventory.findOneAndUpdate(
    {
      _id: inventoryId,

      $expr: {
        $lte: ["$reservedStock", currentStock],
      },
    },
    {
      $set: {
        currentStock,
        lastStocktakeAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (session) {
    query.session(session);
  }

  return query.lean();
};

/*
 * Automatic reservation:
 *
 * availableStock >= quantity + minimumStockLevel
 *
 * Manual reservation:
 *
 * availableStock >= quantity
 */
const reserveProductStock = async ({
  productId,
  quantity,
  preserveMinimumStock,
  session,
}) => {
  const availableStockExpression = {
    $subtract: ["$currentStock", "$reservedStock"],
  };

  const requiredStockExpression = preserveMinimumStock
    ? {
        $add: [quantity, "$minimumStockLevel"],
      }
    : quantity;

  const query = Inventory.findOneAndUpdate(
    {
      productId,

      $expr: {
        $gte: [availableStockExpression, requiredStockExpression],
      },
    },
    {
      $inc: {
        reservedStock: quantity,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (session) {
    query.session(session);
  }

  return query.lean();
};

/*
 * Used when an approved order is cancelled.
 *
 * Physical stock remains unchanged because the units
 * never left the warehouse.
 */
const releaseReservedProductStock = async ({
  productId,
  quantity,
  session,
}) => {
  const query = Inventory.findOneAndUpdate(
    {
      productId,

      reservedStock: {
        $gte: quantity,
      },
    },
    {
      $inc: {
        reservedStock: -quantity,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (session) {
    query.session(session);
  }

  return query.lean();
};

/*
 * Used when the reserved units physically leave
 * the warehouse.
 *
 * Both currentStock and reservedStock are reduced.
 */
const commitReservedProductStock = async ({ productId, quantity, session }) => {
  const query = Inventory.findOneAndUpdate(
    {
      productId,

      currentStock: {
        $gte: quantity,
      },

      reservedStock: {
        $gte: quantity,
      },
    },
    {
      $inc: {
        currentStock: -quantity,
        reservedStock: -quantity,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (session) {
    query.session(session);
  }

  return query.lean();
};

const updateInventorySupplierByProductId = async ({
  productId,
  supplierId,
  session,
}) => {
  const query = Inventory.findOneAndUpdate(
    {
      productId,
    },
    {
      $set: {
        supplierId,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (session) {
    query.session(session);
  }

  return query.lean();
};

module.exports = {
  createInventory,
  findInventoryById,
  findInventoryByProductId,
  findInventoryByIdWithProduct,
  findInventories,
  countInventories,
  restockInventory,
  setMinimumStockLevel,
  setCurrentStock,
  reserveProductStock,
  releaseReservedProductStock,
  commitReservedProductStock,
  updateInventorySupplierByProductId,
};
