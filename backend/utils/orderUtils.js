const { validateObjectId } = require("./product.validationUtils");
const userDal = require("../dal/userDal");
const AppError = require("./AppError");

const ORDER_STATUSES = Object.freeze({
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  CANCELLED: "Cancelled",
});

const ORDER_STATUS_VALUES = Object.freeze(Object.values(ORDER_STATUSES));

const CANCELLATION_PENALTY_RATE = 0.15;

const INVENTORY_RESERVATION_STATUSES = Object.freeze({
  NONE: "None",
  RESERVED: "Reserved",
  RELEASED: "Released",
  COMMITTED: "Committed",
});

const INVENTORY_RESERVATION_STATUS_VALUES = Object.freeze(
  Object.values(INVENTORY_RESERVATION_STATUSES),
);

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_ORDER_ITEMS = 100;

const getPagination = (
  /** @type {{ page: number, limit: number }} */ {
    page: pageInput,
    limit: limitInput,
  },
) => {
  const page = Number.isInteger(pageInput) && pageInput > 0 ? pageInput : 1;

  const requestedLimit =
    Number.isInteger(limitInput) && limitInput > 0
      ? limitInput
      : DEFAULT_PAGE_SIZE;

  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const validateSupplier = async (/** @type {string} */ supplierId) => {
  validateObjectId(supplierId, "supplier ID");

  const supplier = await userDal.findUserById(supplierId);

  if (!supplier) {
    throw new AppError("Supplier not found", 404, "SUPPLIER_NOT_FOUND");
  }

  if (supplier.role !== "Supplier") {
    throw new AppError(
      "The selected user is not a supplier",
      400,
      "USER_IS_NOT_SUPPLIER",
    );
  }

  return supplier;
};

const validatePickupDate = (/** @type {string} */ requestedPickupDate) => {
  const date = new Date(requestedPickupDate);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(
      "Invalid requested pickup date",
      400,
      "INVALID_PICKUP_DATE",
    );
  }

  if (date <= new Date()) {
    throw new AppError(
      "Requested pickup date must be in the future",
      400,
      "PICKUP_DATE_MUST_BE_FUTURE",
    );
  }

  return date;
};

const normalizeOrderItems = (
  /** @type {Array<{ productId: string, quantity: number }>} */ items,
) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(
      "An order must contain at least one item",
      400,
      "ORDER_ITEMS_REQUIRED",
    );
  }

  if (items.length > MAX_ORDER_ITEMS) {
    throw new AppError(
      `An order cannot contain more than ${MAX_ORDER_ITEMS} items`,
      400,
      "TOO_MANY_ORDER_ITEMS",
    );
  }

  /*
   * Combine duplicate product entries.
   *
   * Input:
   * product A, quantity 2
   * product A, quantity 3
   *
   * Result:
   * product A, quantity 5
   */
  const quantitiesByProductId = new Map();

  for (const item of items) {
    if (!item || typeof item !== "object") {
      throw new AppError("Invalid order item", 400, "INVALID_ORDER_ITEM");
    }

    validateObjectId(item.productId, "product ID");

    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError(
        "Order item quantity must be a positive integer",
        400,
        "INVALID_ORDER_ITEM_QUANTITY",
      );
    }

    const productId = item.productId.toString();

    quantitiesByProductId.set(
      productId,
      (quantitiesByProductId.get(productId) ?? 0) + quantity,
    );
  }

  return Array.from(quantitiesByProductId, ([productId, quantity]) => ({
    productId,
    quantity,
  }));
};
module.exports = {
  ORDER_STATUSES,
  ORDER_STATUS_VALUES,
  CANCELLATION_PENALTY_RATE,
  validatePickupDate,
  normalizeOrderItems,
  validateSupplier,
  getPagination,
  MAX_ORDER_ITEMS,
  MAX_PAGE_SIZE,
  INVENTORY_RESERVATION_STATUSES,
  INVENTORY_RESERVATION_STATUS_VALUES,
};
