//@ts-nocheck

const asyncHandler = require("../utils/routerHandler");
const productService = require("../services/product.service");

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct({
    productInput: req.body,
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

const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct({
    productId: req.params.productId,
    actor: req.auth,
  });

  res.status(204).send();
});

module.exports = {
  createProduct,
  getPublicProducts,
  getPublicProductById,
  getMyProducts,
  getAllProducts,
  updateProduct,
  deleteProduct,
};
