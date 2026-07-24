const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getAvailableProducts,
  getPendingProducts,
  getMyProducts,
  getAllProductsAdmin,
  createProduct,
  approveProduct,
  rejectProduct,
  updateProductVisibility,
} = require('../controllers/productsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads', 'products'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.get('/', protect, authorize('admin', 'vendor'), getAvailableProducts);
router.get('/pending', protect, authorize('admin'), getPendingProducts);
router.get('/mine', protect, authorize('supplier'), getMyProducts);
router.get('/admin', protect, authorize('admin'), getAllProductsAdmin);
router.post('/create', protect, authorize('supplier'), upload.single('image'), createProduct);
router.patch('/:id/approve', protect, authorize('admin'), approveProduct);
router.patch('/:id/reject', protect, authorize('admin'), rejectProduct);
router.patch('/:id/visibility', protect, authorize('admin'), updateProductVisibility);

module.exports = router;
