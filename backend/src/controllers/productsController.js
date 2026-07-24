const Product = require('../models/Product');

const getAvailableProducts = async (_req, res, next) => {
  try {
    const products = await Product.find({ status: 'approved', visibility: 'public' });
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

const getPendingProducts = async (_req, res, next) => {
  try {
    const products = await Product.find({ status: 'pending' });
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

const getMyProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ supplierId: req.user.id });
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

const getAllProductsAdmin = async (_req, res, next) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, description = '', price, expiryDate = null } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: 'name and price are required' });
    }

    const product = await Product.create({
      name,
      description,
      price,
      image: req.file ? `/uploads/products/${req.file.filename}` : '',
      supplierId: req.user.id,
      expiryDate: expiryDate || null,
      status: 'pending',
      visibility: 'private',
    });

    return res.status(201).json(product);
  } catch (error) {
    return next(error);
  }
};

const approveProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error) {
    return next(error);
  }
};

const rejectProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error) {
    return next(error);
  }
};

const updateProductVisibility = async (req, res, next) => {
  try {
    const { visibility } = req.body;

    if (!['public', 'private'].includes(visibility)) {
      return res.status(400).json({ message: 'visibility must be public or private' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { visibility },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAvailableProducts,
  getPendingProducts,
  getMyProducts,
  getAllProductsAdmin,
  createProduct,
  approveProduct,
  rejectProduct,
  updateProductVisibility,
};
