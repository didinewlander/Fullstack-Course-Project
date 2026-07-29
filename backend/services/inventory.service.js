const { getPagination } = require("../utils/orderUtils");
const { validateObjectId } = require("../utils/product.validationUtils");
const { USER_ROLES } = require("../utils/usersUtils");
const inventoryDal = require("../dal/inventoryDal");
const productDal = require("../dal/productDal");
const AppError = require("../utils/AppError");

const validateNonNegativeInteger = (value, fieldName) => {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new AppError(
      `${fieldName} must be a non-negative integer`,
      400,
      "INVALID_INVENTORY_VALUE",
    );
  }

  return numericValue;
};

const validatePositiveInteger = (value, fieldName) => {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new AppError(
      `${fieldName} must be a positive integer`,
      400,
      "INVALID_INVENTORY_VALUE",
    );
  }

  return numericValue;
};

const formatInventory = (inventory) => {
  const result =
    typeof inventory.toObject === "function"
      ? inventory.toObject()
      : { ...inventory };

  const availableStock = result.currentStock - result.reservedStock;

  return {
    ...result,

    availableStock,

    isBelowMinimum: availableStock < result.minimumStockLevel,

    canAutoApproveAnyUnits: availableStock > result.minimumStockLevel,
  };
};

const assertCanManageInventory = (inventory, actor) => {
  if (actor.role === USER_ROLES.LOGISTICS_MANAGER) {
    return;
  }

  const isOwningSupplier =
    actor.role === USER_ROLES.SUPPLIER &&
    inventory.supplierId.toString() === actor.userId;

  if (!isOwningSupplier) {
    throw new AppError(
      "You do not have permission to manage this inventory",
      403,
      "FORBIDDEN",
    );
  }
};

const createInventoryForProduct = async ({
  productId,
  inventoryInput,
  actor,
  session,
}) => {
  validateObjectId(productId, "product ID");

  const product = await productDal.findProductById(productId);

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  const isManager = actor.role === USER_ROLES.LOGISTICS_MANAGER;

  const isOwningSupplier =
    actor.role === USER_ROLES.SUPPLIER &&
    product.supplierId.toString() === actor.userId;

  if (!isManager && !isOwningSupplier) {
    throw new AppError(
      "You cannot create inventory for this product",
      403,
      "FORBIDDEN",
    );
  }

  const existingInventory = await inventoryDal.findInventoryByProductId(
    productId,
    session,
  );

  if (existingInventory) {
    throw new AppError(
      "Inventory already exists for this product",
      409,
      "INVENTORY_ALREADY_EXISTS",
    );
  }

  const currentStock = validateNonNegativeInteger(
    inventoryInput.currentStock ?? 0,
    "Current stock",
  );

  const minimumStockLevel = validateNonNegativeInteger(
    inventoryInput.minimumStockLevel ?? 0,
    "Minimum stock level",
  );

  const inventory = await inventoryDal.createInventory(
    {
      productId: product._id,
      supplierId: product.supplierId,
      currentStock,
      reservedStock: 0,
      minimumStockLevel,

      lastRestockedAt: currentStock > 0 ? new Date() : null,
    },
    session,
  );

  return formatInventory(inventory);
};

const getInventoryById = async ({ inventoryId, actor }) => {
  validateObjectId(inventoryId, "inventory ID");

  const inventory = await inventoryDal.findInventoryById(inventoryId);

  if (!inventory) {
    throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
  }

  assertCanManageInventory(inventory, actor);

  const detailedInventory =
    await inventoryDal.findInventoryByIdWithProduct(inventoryId);

  return formatInventory(detailedInventory);
};

const getInventoryByProductId = async ({ productId, actor }) => {
  validateObjectId(productId, "product ID");
  const inventory = await inventoryDal.findInventoryByProductId(productId);

  if (!inventory) {
    throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
  }

  assertCanManageInventory(inventory, actor);
  return formatInventory(inventory);
};

const getInventoryCount = async ({ actor }) => {
  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError("Only logistics managers can count all inventory", 403, "FORBIDDEN");
  }

  const inventories = await inventoryDal.findInventories({ filter: {}, limit: 1000 });
  return {
    inventoryRecords: inventories.length,
    currentStock: inventories.reduce((total, inventory) => total + inventory.currentStock, 0),
    reservedStock: inventories.reduce((total, inventory) => total + inventory.reservedStock, 0),
    availableStock: inventories.reduce((total, inventory) => total + inventory.currentStock - inventory.reservedStock, 0),
  };
};

const getInventoryItemCount = async ({ inventoryId, actor }) => {
  const inventory = await getInventoryById({ inventoryId, actor });
  return {
    inventoryId: inventory._id,
    productId: inventory.productId,
    currentStock: inventory.currentStock,
    reservedStock: inventory.reservedStock,
    availableStock: inventory.availableStock,
  };
};

const getMyInventory = async ({
  actor,
  page: pageInput,
  limit: limitInput,
}) => {
  if (actor.role !== USER_ROLES.SUPPLIER) {
    throw new AppError(
      "Only suppliers can access their inventory list",
      403,
      "FORBIDDEN",
    );
  }

  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const filter = {
    supplierId: actor.userId,
  };

  const [inventories, total] = await Promise.all([
    inventoryDal.findInventories({
      filter,
      skip,
      limit,
    }),

    inventoryDal.countInventories(filter),
  ]);

  return {
    inventories: inventories.map(formatInventory),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAllInventory = async ({
  actor,
  page: pageInput,
  limit: limitInput,
  supplierId,
  belowMinimumOnly,
}) => {
  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError(
      "Only logistics managers can access all inventory",
      403,
      "FORBIDDEN",
    );
  }

  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const filter = {};

  if (supplierId) {
    validateObjectId(supplierId, "supplier ID");

    filter.supplierId = supplierId;
  }

  if (belowMinimumOnly === true || belowMinimumOnly === "true") {
    filter.$expr = {
      $lt: [
        {
          $subtract: ["$currentStock", "$reservedStock"],
        },
        "$minimumStockLevel",
      ],
    };
  }

  const [inventories, total] = await Promise.all([
    inventoryDal.findInventories({
      filter,
      skip,
      limit,
    }),

    inventoryDal.countInventories(filter),
  ]);

  return {
    inventories: inventories.map(formatInventory),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const restockInventory = async ({ inventoryId, quantity, actor }) => {
  validateObjectId(inventoryId, "inventory ID");

  const normalizedQuantity = validatePositiveInteger(
    quantity,
    "Restock quantity",
  );

  const inventory = await inventoryDal.findInventoryById(inventoryId);

  if (!inventory) {
    throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
  }

  assertCanManageInventory(inventory, actor);

  const updatedInventory = await inventoryDal.restockInventory({
    inventoryId,
    quantity: normalizedQuantity,
  });

  return formatInventory(updatedInventory);
};

const updateMinimumStockLevel = async ({
  inventoryId,
  minimumStockLevel,
  actor,
}) => {
  validateObjectId(inventoryId, "inventory ID");

  const normalizedMinimum = validateNonNegativeInteger(
    minimumStockLevel,
    "Minimum stock level",
  );

  const inventory = await inventoryDal.findInventoryById(inventoryId);

  if (!inventory) {
    throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
  }

  assertCanManageInventory(inventory, actor);

  const updatedInventory = await inventoryDal.setMinimumStockLevel({
    inventoryId,
    minimumStockLevel: normalizedMinimum,
  });

  return formatInventory(updatedInventory);
};

const adjustCurrentStock = async ({ inventoryId, currentStock, actor }) => {
  validateObjectId(inventoryId, "inventory ID");

  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError(
      "Only logistics managers can perform stock corrections",
      403,
      "FORBIDDEN",
    );
  }

  const normalizedStock = validateNonNegativeInteger(
    currentStock,
    "Current stock",
  );

  const inventory = await inventoryDal.findInventoryById(inventoryId);

  if (!inventory) {
    throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
  }

  if (normalizedStock < inventory.reservedStock) {
    throw new AppError(
      "Current stock cannot be lower than reserved stock",
      409,
      "STOCK_BELOW_RESERVED_QUANTITY",
    );
  }

  const updatedInventory = await inventoryDal.setCurrentStock({
    inventoryId,
    currentStock: normalizedStock,
  });

  if (!updatedInventory) {
    throw new AppError(
      "Inventory changed before the stock correction could be applied",
      409,
      "INVENTORY_CONFLICT",
    );
  }

  return formatInventory(updatedInventory);
};

const calculateEoqMinimumStock = async ({
  inventoryId,
  annualDemand,
  orderingCost,
  holdingCost,
  actor,
}) => {
  validateObjectId(inventoryId, "inventory ID");

  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError("Only logistics managers can calculate EOQ", 403, "FORBIDDEN");
  }

  const demand = Number(annualDemand);
  const orderCost = Number(orderingCost);
  const storageCost = Number(holdingCost);
  if (![demand, orderCost, storageCost].every(Number.isFinite) || demand < 0 || orderCost < 0 || storageCost <= 0) {
    throw new AppError("annualDemand and orderingCost must be non-negative, and holdingCost must be positive", 400, "INVALID_EOQ_INPUT");
  }

  const eoq = Math.ceil(Math.sqrt((2 * demand * orderCost) / storageCost));
  const updatedInventory = await inventoryDal.setMinimumStockLevel({ inventoryId, minimumStockLevel: eoq });
  if (!updatedInventory) {
    throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
  }
  return { ...formatInventory(updatedInventory), eoq };
};

/*
 * Internal order operation.
 *
 * preserveMinimumStock:
 * true  -> automatic order approval
 * false -> human-approved order
 */
const reserveOrderItems = async ({ items, preserveMinimumStock, session }) => {
  for (const item of items) {
    const updatedInventory = await inventoryDal.reserveProductStock({
      productId: item.productId,
      quantity: item.quantity,
      preserveMinimumStock,
      session,
    });

    if (updatedInventory) {
      continue;
    }

    const inventory = await inventoryDal.findInventoryByProductId(
      item.productId,
      session,
    );

    if (!inventory) {
      throw new AppError(
        `Inventory is not configured for product ${item.productId}`,
        409,
        "INVENTORY_NOT_INITIALIZED",
      );
    }

    if (preserveMinimumStock) {
      throw new AppError(
        "The order cannot be automatically approved without crossing a minimum stock level",
        409,
        "AUTO_APPROVAL_STOCK_THRESHOLD",
      );
    }

    throw new AppError(
      `Insufficient available stock for product ${item.productId}`,
      409,
      "INSUFFICIENT_STOCK",
    );
  }
};

const releaseOrderItems = async ({ items, session }) => {
  for (const item of items) {
    const updatedInventory = await inventoryDal.releaseReservedProductStock({
      productId: item.productId,
      quantity: item.quantity,
      session,
    });

    if (!updatedInventory) {
      throw new AppError(
        `Unable to release reserved stock for product ${item.productId}`,
        409,
        "INVENTORY_RESERVATION_CONFLICT",
      );
    }
  }
};

const commitOrderItems = async ({ items, session }) => {
  for (const item of items) {
    const updatedInventory = await inventoryDal.commitReservedProductStock({
      productId: item.productId,
      quantity: item.quantity,
      session,
    });

    if (!updatedInventory) {
      throw new AppError(
        `Unable to commit reserved stock for product ${item.productId}`,
        409,
        "INVENTORY_RESERVATION_CONFLICT",
      );
    }
  }
};

module.exports = {
  createInventoryForProduct,
  getInventoryById,
  getInventoryByProductId,
  getInventoryCount,
  getInventoryItemCount,
  getMyInventory,
  getAllInventory,
  restockInventory,
  updateMinimumStockLevel,
  adjustCurrentStock,
  calculateEoqMinimumStock,

  /*
   * Internal service methods.
   */
  reserveOrderItems,
  releaseOrderItems,
  commitOrderItems,
};
