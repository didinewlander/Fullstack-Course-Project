const express = require('express');
const {
  getSupplierInventory,
  getAllInventoryAdmin,
  getInventoryByProduct,
  countAllInventory,
  countInventoryById,
  createOrLoadInventoryForProduct,
  restockInventory,
  updateMinimumStock,
  adjustInventoryLevel,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/mine', protect, authorize('supplier'), getSupplierInventory);
router.get('/admin', protect, authorize('admin'), getAllInventoryAdmin);
router.get('/count', protect, authorize('admin'), countAllInventory);
router.get('/count/:invnetoryId', protect, authorize('admin', 'supplier'), countInventoryById);
router.get('/:productId', protect, authorize('admin', 'supplier', 'vendor'), getInventoryByProduct);
router.post('/:productId', protect, authorize('supplier'), createOrLoadInventoryForProduct);
router.patch('/:inventoryId/restock', protect, authorize('admin', 'supplier'), restockInventory);
router.patch('/:inventoryId/minimum-stock', protect, authorize('admin', 'supplier'), updateMinimumStock);
router.patch('/:inventoryId/adjust', protect, authorize('admin', 'supplier'), adjustInventoryLevel);

module.exports = router;
