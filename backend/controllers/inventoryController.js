const inventoryService = require("../services/inventory.service");

const asyncHandler = require("../utils/routerHandler");

const createInventoryForProduct = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.createInventoryForProduct({
    productId: req.params.productId,
    session: req.mongoSession,
    inventoryInput: req.body,

    actor: req.auth,
  });

  res.status(201).json({
    success: true,
    data: inventory,
  });
});

const getInventoryById = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.getInventoryById({
    inventoryId: req.params.inventoryId,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: inventory,
  });
});

const getMyInventory = asyncHandler(async (req, res) => {
  const result = await inventoryService.getMyInventory({
    actor: req.auth,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    data: result.inventories,
    pagination: result.pagination,
  });
});

const getAllInventory = asyncHandler(async (req, res) => {
  const result = await inventoryService.getAllInventory({
    actor: req.auth,
    page: req.query.page,
    limit: req.query.limit,

    supplierId: req.query.supplierId,

    belowMinimumOnly: req.query.belowMinimumOnly,
  });

  res.status(200).json({
    success: true,
    data: result.inventories,
    pagination: result.pagination,
  });
});

const restockInventory = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.restockInventory({
    inventoryId: req.params.inventoryId,

    quantity: req.body.quantity,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: inventory,
  });
});

const updateMinimumStockLevel = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.updateMinimumStockLevel({
    inventoryId: req.params.inventoryId,

    minimumStockLevel: req.body.minimumStockLevel,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: inventory,
  });
});

const adjustCurrentStock = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.adjustCurrentStock({
    inventoryId: req.params.inventoryId,

    currentStock: req.body.currentStock,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: inventory,
  });
});

module.exports = {
  createInventoryForProduct,
  getInventoryById,
  getMyInventory,
  getAllInventory,
  restockInventory,
  updateMinimumStockLevel,
  adjustCurrentStock,
};
