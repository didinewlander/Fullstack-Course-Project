const mongoose = require("mongoose");
const productDal = require("../dal/productDal");
const userDal = require("../dal/userDal");
const inventoryDal = require("../dal/inventoryDal");
const { USER_ROLES } = require("../utils/usersUtils");
const {
  validateObjectId,
  validateName,
  validateDescription,
  validateSku,
  validateUnitPrice,
  validateVisibility,
  validateImageUrl,
  validateExpiryDate,
} = require("../utils/product.validationUtils");
const AppError = require("../utils/AppError");

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const getPagination = (
  /** @type {{ page?: any, limit?: any }} */ {
    page: pageInput,
    limit: limitInput,
  },
) => {
  const parsedPage = Number.parseInt(pageInput, 10);

  const parsedLimit = Number.parseInt(limitInput, 10);

  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const requestedLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : DEFAULT_PAGE_SIZE;

  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildPaginatedResult = (
  /** @type {{ products: any[], total: number, page: number, limit: number }} */ {
    products,
    total,
    page,
    limit,
  },
) => {
  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const verifySupplier = async (/** @type {string} */ supplierId) => {
  validateObjectId(supplierId, "supplier ID");

  const supplier = await userDal.findUserById(supplierId);

  if (!supplier) {
    throw new AppError("Supplier not found", 404, "SUPPLIER_NOT_FOUND");
  }

  if (supplier.role !== USER_ROLES.SUPPLIER) {
    throw new AppError(
      "The selected user is not a supplier",
      400,
      "USER_IS_NOT_SUPPLIER",
    );
  }

  return supplier;
};

const resolveSupplierIdForCreation = async (
  /** @type {{ requestedSupplierId: string, actor: any }} */ {
    requestedSupplierId,
    actor,
  },
) => {
  if (actor.role === USER_ROLES.SUPPLIER) {
    return actor.userId;
  }

  if (actor.role === USER_ROLES.LOGISTICS_MANAGER) {
    if (!requestedSupplierId) {
      throw new AppError(
        "supplierId is required when a manager creates a product",
        400,
        "SUPPLIER_ID_REQUIRED",
      );
    }

    await verifySupplier(requestedSupplierId);

    return requestedSupplierId;
  }

  throw new AppError("You cannot create products", 403, "FORBIDDEN");
};

const assertCanManageProduct = (
  /** @type {{ product: any, actor: any }} */ { product, actor },
) => {
  if (actor.role === USER_ROLES.LOGISTICS_MANAGER) {
    return;
  }

  const ownsProduct =
    actor.role === USER_ROLES.SUPPLIER &&
    product.supplierId.toString() === actor.userId;

  if (!ownsProduct) {
    throw new AppError(
      "You do not have permission to manage this product",
      403,
      "FORBIDDEN",
    );
  }
};

const createProduct = async (
  /** @type {{ productInput: any, actor: any }} */ { productInput, actor },
) => {
  const supplierId = await resolveSupplierIdForCreation({
    requestedSupplierId: productInput.supplierId,
    actor,
  });

  /*
   * Supplier accounts have already been verified
   * during account creation. Managers may supply
   * another supplier ID, which was verified above.
   */
  if (actor.role === USER_ROLES.SUPPLIER) {
    await verifySupplier(supplierId);
  }

  const name = validateName(productInput.name);

  const description = validateDescription(productInput.description);

  const sku = validateSku(productInput.sku);

  const unitPrice = validateUnitPrice(productInput.unitPrice);

  const visibility =
    actor.role === USER_ROLES.SUPPLIER || productInput.visibility === undefined
      ? "Hidden"
      : validateVisibility(productInput.visibility);

  const imageUrl = validateImageUrl(productInput.imageUrl);

  const expiryDate = validateExpiryDate(productInput.expiryDate);

  const existingProduct = await productDal.findProductBySupplierAndSku({
    supplierId,
    sku,
  });

  if (existingProduct) {
    throw new AppError(
      "This supplier already has a product with that SKU",
      409,
      "PRODUCT_SKU_ALREADY_EXISTS",
    );
  }

  const session = await mongoose.startSession();

  let product;

  try {
    await session.withTransaction(async () => {
      product = await productDal.createProduct(
        {
          name,
          description,
          sku,
          imageUrl,
          visibility,
          supplierId,
          unitPrice,
          expiryDate,
        },
        session,
      );

      await inventoryDal.createInventory(
        {
          productId: product._id,
          supplierId,
          currentStock: 0,
          reservedStock: 0,
          minimumStockLevel: 0,
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }

  return product;
};

const getPublicProducts = async (
  /** @type {{ page: number, limit: number, search: string, supplierId: string }} */ {
    page: pageInput,
    limit: limitInput,
    search,
    supplierId,
  },
) => {
  if (supplierId) {
    validateObjectId(supplierId, "supplier ID");
  }

  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const normalizedSearch = typeof search === "string" ? search.trim() : "";

  const [products, total] = await Promise.all([
    productDal.findPublicProducts({
      search: normalizedSearch,
      supplierId,
      skip,
      limit,
    }),

    productDal.countPublicProducts({
      search: normalizedSearch,
      supplierId,
    }),
  ]);

  return buildPaginatedResult({
    products,
    total,
    page,
    limit,
  });
};

const getPendingProducts = async (
  /** @type {{ actor: any, page: number, limit: number, search: string }} */ {
    actor,
    page: pageInput,
    limit: limitInput,
    search,
  },
) => {
  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const normalizedSearch = typeof search === "string" ? search.trim() : "";

  const [products, total] = await Promise.all([
    productDal.findPendingProducts({
      actor,
      search: normalizedSearch,
      skip,
      limit,
    }),

    productDal.countPendingProducts({
      actor,
      search: normalizedSearch,
    }),
  ]);

  return buildPaginatedResult({
    products,
    total,
    page,
    limit,
  });
};

const getPublicProductById = async (/** @type {string} */ productId) => {
  validateObjectId(productId, "product ID");

  const product = await productDal.findPublicProductById(productId);

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  return product;
};

const getMyProducts = async (
  /** @type {{ actor: any, page: number, limit: number, search: string, visibility: string }} */ {
    actor,
    page: pageInput,
    limit: limitInput,
    search,
    visibility,
  },
) => {
  if (actor.role !== USER_ROLES.SUPPLIER) {
    throw new AppError(
      "Only suppliers can access their product list",
      403,
      "FORBIDDEN",
    );
  }

  if (visibility) {
    validateVisibility(visibility);
  }

  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const normalizedSearch = typeof search === "string" ? search.trim() : "";

  const [products, total] = await Promise.all([
    productDal.findProductsBySupplierId({
      supplierId: actor.userId,
      search: normalizedSearch,
      visibility,
      skip,
      limit,
    }),

    productDal.countProductsBySupplierId({
      supplierId: actor.userId,
      search: normalizedSearch,
      visibility,
    }),
  ]);

  return buildPaginatedResult({
    products,
    total,
    page,
    limit,
  });
};

const getAllProducts = async (
  /** @type {{ actor: any, page: number, limit: number, search: string, supplierId: string, visibility: string }} */ {
    actor,
    page: pageInput,
    limit: limitInput,
    search,
    supplierId,
    visibility,
  },
) => {
  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError(
      "Only logistics managers can access all products",
      403,
      "FORBIDDEN",
    );
  }

  if (supplierId) {
    validateObjectId(supplierId, "supplier ID");
  }

  if (visibility) {
    validateVisibility(visibility);
  }

  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const normalizedSearch = typeof search === "string" ? search.trim() : "";

  const [products, total] = await Promise.all([
    productDal.findAllProducts({
      search: normalizedSearch,
      supplierId,
      visibility,
      skip,
      limit,
    }),

    productDal.countAllProducts({
      search: normalizedSearch,
      supplierId,
      visibility,
    }),
  ]);

  return buildPaginatedResult({
    products,
    total,
    page,
    limit,
  });
};

const updateProduct = async (
  /** @type {{ productId: string, productInput: any, actor: any }} */ {
    productId,
    productInput,
    actor,
  },
) => {
  validateObjectId(productId, "product ID");

  const product = await productDal.findProductById(productId);

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  assertCanManageProduct({ product, actor });

  const updateData = {};

  if (productInput.name !== undefined) {
    updateData.name = validateName(productInput.name);
  }

  if (productInput.description !== undefined) {
    updateData.description = validateDescription(productInput.description);
  }

  if (productInput.sku !== undefined) {
    updateData.sku = validateSku(productInput.sku);
  }

  if (productInput.unitPrice !== undefined) {
    updateData.unitPrice = validateUnitPrice(productInput.unitPrice);
  }

  if (productInput.imageUrl !== undefined) {
    updateData.imageUrl = validateImageUrl(productInput.imageUrl);
  }

  if (productInput.expiryDate !== undefined) {
    updateData.expiryDate = validateExpiryDate(productInput.expiryDate);
  }

  let targetSupplierId = product.supplierId.toString();

  /*
   * Only a manager may reassign a product to
   * another supplier.
   */
  if (productInput.supplierId !== undefined) {
    if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
      throw new AppError(
        "Suppliers cannot reassign products",
        403,
        "FORBIDDEN",
      );
    }

    await verifySupplier(productInput.supplierId);

    targetSupplierId = productInput.supplierId;

    updateData.supplierId = productInput.supplierId;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(
      "No valid fields were provided for updating",
      400,
      "NO_UPDATE_FIELDS",
    );
  }

  const targetSku = updateData.sku ?? product.sku;

  const skuOrSupplierChanged =
    targetSku !== product.sku ||
    targetSupplierId !== product.supplierId.toString();

  if (skuOrSupplierChanged) {
    const duplicateProduct = await productDal.findProductBySupplierAndSku({
      supplierId: targetSupplierId,
      sku: targetSku,
    });

    if (duplicateProduct && duplicateProduct._id.toString() !== productId) {
      throw new AppError(
        "This supplier already has a product with that SKU",
        409,
        "PRODUCT_SKU_ALREADY_EXISTS",
      );
    }
  }

  const updatedProduct = await productDal.updateProductById({
    productId,
    updateData,
  });

  if (!updatedProduct) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  return updatedProduct;
};

const setProductStatus = async ({ productId, status, actor }) => {
  validateObjectId(productId, "product ID");

  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError("Only logistics managers can review products", 403, "FORBIDDEN");
  }

  const product = await productDal.updateProductById({
    productId,
    updateData: { status },
  });

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  return product;
};

const updateProductVisibility = async ({ productId, visibility, actor }) => {
  validateObjectId(productId, "product ID");

  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError("Only logistics managers can change product visibility", 403, "FORBIDDEN");
  }

  const product = await productDal.updateProductById({
    productId,
    updateData: { visibility: validateVisibility(visibility) },
  });

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  return product;
};

module.exports = {
  createProduct,
  getPublicProducts,
  getPublicProductById,
  getMyProducts,
  getAllProducts,
  getPendingProducts,
  updateProduct,
  setProductStatus,
  updateProductVisibility,
};
