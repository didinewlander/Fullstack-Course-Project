const Product = require("../models/productModel");
const { buildSearchFilter } = require("../utils/regexUtils");

const createProduct = async (productData, session) => {
  if (session) {
    const [product] = await Product.create([productData], { session });

    return product;
  }

  return Product.create(productData);
};

const findProductById = async (/** @type {string} */ productId) => {
  return Product.findById(productId).lean();
};
const findProductsByIds = async (/** @type {string[]} */ productIds) => {
  return Product.find({
    _id: {
      $in: productIds,
    },
  }).lean();
};
const findPublicProductById = async (/** @type {string} */ productId) => {
  return Product.findOne({
    _id: productId,
    visibility: "Public",
  })
    .populate("supplierId", "username email role")
    .lean();
};

const findProductBySupplierAndSku = async (
  /** @type {{ supplierId: string, sku: string }} */ data,
) => {
  const { supplierId, sku } = data;
  return Product.findOne({
    supplierId,
    sku,
  }).lean();
};

const findPublicProducts = async (
  /** @type {{ search?: string, supplierId?: string, skip?: number, limit?: number }} */ {
    search,
    supplierId,
    skip = 0,
    limit = 20,
  },
) => {
  const filter = /** @type {any} */ ({
    visibility: "Public",
    ...buildSearchFilter(search),
  });

  if (supplierId) {
    filter.supplierId = supplierId;
  }

  return Product.find(filter)
    .populate("supplierId", "username")
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countPublicProducts = async (
  /** @type {{ search?: string, supplierId?: string }} */ {
    search,
    supplierId,
  },
) => {
  const filter = /** @type {any} */ ({
    visibility: "Public",
    ...buildSearchFilter(search),
  });

  if (supplierId) {
    filter.supplierId = supplierId;
  }

  return Product.countDocuments(filter);
};

const findProductsBySupplierId = async (
  /** @type {{ supplierId: string, search?: string, visibility?: string, skip?: number, limit?: number }} */ {
    supplierId,
    search,
    visibility,
    skip = 0,
    limit = 20,
  },
) => {
  const filter = /** @type {any} */ ({
    supplierId,
    ...buildSearchFilter(search),
  });

  if (visibility) {
    filter.visibility = visibility;
  }

  return Product.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countProductsBySupplierId = async (
  /** @type {{ supplierId: string, search?: string, visibility?: string }} */ {
    supplierId,
    search,
    visibility,
  },
) => {
  const filter = /** @type {any} */ ({
    supplierId,
    ...buildSearchFilter(search),
  });

  if (visibility) {
    filter.visibility = visibility;
  }

  return Product.countDocuments(filter);
};

const findAllProducts = async (
  /** @type {{ search?: string, supplierId?: string, visibility?: string, skip?: number, limit?: number }} */ {
    search,
    supplierId,
    visibility,
    skip = 0,
    limit = 20,
  },
) => {
  const filter = /** @type {any} */ ({
    ...buildSearchFilter(search),
  });

  if (supplierId) {
    filter.supplierId = supplierId;
  }

  if (visibility) {
    filter.visibility = visibility;
  }

  return Product.find(filter)
    .populate("supplierId", "username email role")
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countAllProducts = async (
  /** @type {{ search?: string, supplierId?: string, visibility?: string }} */ {
    search,
    supplierId,
    visibility,
  },
) => {
  const filter = /** @type {any} */ ({
    ...buildSearchFilter(search),
  });

  if (supplierId) {
    filter.supplierId = supplierId;
  }

  if (visibility) {
    filter.visibility = visibility;
  }

  return Product.countDocuments(filter);
};

const findPendingProducts = async (
  /** @type {{ actor: any, search?: string, skip?: number, limit?: number }} */ {
    actor,
    search,
    skip = 0,
    limit = 20,
  },
) => {
  const filter = /** @type {any} */ ({
    status: {
      $eq: "Pending",
    },
    ...buildSearchFilter(search),
  });

  return Product.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countPendingProducts = async (
  /** @type {{ actor: any, search?: string }} */ { actor, search },
) => {
  const filter = /** @type {any} */ ({
    status: {
      $eq: "Pending",
    },
    ...buildSearchFilter(search),
  });

  return Product.countDocuments(filter);
};

const updateProductById = async (
  /** @type {{ productId: string, updateData: object }} */ {
    productId,
    updateData,
  },
) => {
  return Product.findByIdAndUpdate(
    productId,
    {
      $set: updateData,
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

const deleteProductById = async (
  /** @type {{ productId: string }} */ { productId },
) => {
  return Product.findByIdAndDelete(productId).lean();
};

module.exports = {
  createProduct,
  findProductById,
  findProductsByIds,
  findPublicProductById,
  findProductBySupplierAndSku,
  findPublicProducts,
  countPublicProducts,
  findProductsBySupplierId,
  countProductsBySupplierId,
  findAllProducts,
  countAllProducts,
  findPendingProducts,
  countPendingProducts,
  updateProductById,
  deleteProductById,
};
