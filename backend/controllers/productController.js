

const asyncHandler = require("../utils/routerHandler");
const productService = require("../services/product.service");

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct({
    productInput: {
      ...req.body,
      imageUrl: req.file ? `uploads/products/${req.file.filename}` : req.body.imageUrl,
    },
    actor: req.auth,
  });

  res.status(201).json({
    success: true,
    data: product,
  });
});

const getPublicProducts = asyncHandler(async (req, res) => {
  const result = await productService.getPublicProducts({
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    supplierId: req.query.supplierId,
  });

  res.status(200).json({
    success: true,
    data: result.products,
    pagination: result.pagination,
  });
});
const getPendingProducts = asyncHandler(async (req, res) => {
  const result = await productService.getPendingProducts({
    actor: req.auth,
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
  });

  res.status(200).json({
    success: true,
    data: result.products,
    pagination: result.pagination,
  });
});

const getPublicProductById = asyncHandler(async (req, res) => {
  const product = await productService.getPublicProductById(
    req.params.productId,
  );

  res.status(200).json({
    success: true,
    data: product,
  });
});

const getMyProducts = asyncHandler(async (req, res) => {
  const result = await productService.getMyProducts({
    actor: req.auth,
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    visibility: req.query.visibility,
  });

  res.status(200).json({
    success: true,
    data: result.products,
    pagination: result.pagination,
  });
});

const getAllProducts = asyncHandler(async (req, res) => {
  const result = await productService.getAllProducts({
    actor: req.auth,
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    supplierId: req.query.supplierId,
    visibility: req.query.visibility,
  });

  res.status(200).json({
    success: true,
    data: result.products,
    pagination: result.pagination,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct({
    productId: req.params.productId,
    productInput: req.body,
    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: product,
  });
});

const approveProduct = asyncHandler(async (req, res) => {
  const product = await productService.setProductStatus({
    productId: req.params.productId,
    status: "Approved",
    actor: req.auth,
  });

  res.status(200).json({ success: true, data: product });
});

const rejectProduct = asyncHandler(async (req, res) => {
  const product = await productService.setProductStatus({
    productId: req.params.productId,
    status: "Rejected",
    actor: req.auth,
  });

  res.status(200).json({ success: true, data: product });
});

const updateProductVisibility = asyncHandler(async (req, res) => {
  const product = await productService.updateProductVisibility({
    productId: req.params.productId,
    visibility: req.body.visibility,
    actor: req.auth,
  });

  res.status(200).json({ success: true, data: product });
});

module.exports = {
  createProduct,
  getPublicProducts,
  getPublicProductById,
  getMyProducts,
  getAllProducts,
  updateProduct,
  approveProduct,
  rejectProduct,
  updateProductVisibility,
  getPendingProducts,
};
