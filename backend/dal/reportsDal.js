const Order = require("../models/orderModel");
const Inventory = require("../models/inventoryModel");
const Delivery = require("../models/deliveryModel");
const Invoice = require("../models/invoiceModel");
const mongoose = require("mongoose");

const asObjectId = (id) => new mongoose.Types.ObjectId(id);

const getManagerAnalytics = async () => {
  const [orders, inventory, deliveries, invoices] = await Promise.all([
    Order.countDocuments(),
    Inventory.aggregate([
      { $group: { _id: null, currentStock: { $sum: "$currentStock" }, reservedStock: { $sum: "$reservedStock" }, belowMinimum: { $sum: { $cond: [{ $lt: [{ $subtract: ["$currentStock", "$reservedStock"] }, "$minimumStockLevel"] }, 1, 0] } } } },
    ]),
    Delivery.countDocuments(),
    Invoice.aggregate([{ $group: { _id: null, totalAmount: { $sum: "$amount" } } }]),
  ]);

  return {
    orders,
    deliveries,
    inventory: inventory[0] ?? { currentStock: 0, reservedStock: 0, belowMinimum: 0 },
    invoicedAmount: invoices[0]?.totalAmount ?? 0,
  };
};

const getSupplierAnalytics = async (supplierId) => {
  const supplierObjectId = asObjectId(supplierId);
  const [deliveries, deliveryCosts, inventory] = await Promise.all([
    Delivery.countDocuments({ supplierId: supplierObjectId }),
    Delivery.aggregate([
      { $match: { supplierId: supplierObjectId } },
      { $unwind: { path: "$extraCosts", preserveNullAndEmptyArrays: true } },
      { $match: { "extraCosts.status": "Approved" } },
      { $group: { _id: null, approvedExtraCosts: { $sum: "$extraCosts.amount" } } },
    ]),
    Inventory.aggregate([
      { $match: { supplierId: supplierObjectId } },
      { $group: { _id: null, currentStock: { $sum: "$currentStock" }, availableStock: { $sum: { $subtract: ["$currentStock", "$reservedStock"] } } } },
    ]),
  ]);

  return {
    deliveries,
    approvedExtraCosts: deliveryCosts[0]?.approvedExtraCosts ?? 0,
    capacity: inventory[0] ?? { currentStock: 0, availableStock: 0 },
  };
};

const getVendorAnalytics = async (vendorId) => {
  const vendorObjectId = asObjectId(vendorId);
  const [orders, invoices] = await Promise.all([
    Order.aggregate([
      { $match: { orderedByUserId: vendorObjectId } },
      { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: "$calculatedTotal" } } },
    ]),
    Invoice.aggregate([
      { $match: { orderedByUserId: vendorObjectId } },
      { $group: { _id: null, invoicedAmount: { $sum: "$amount" } } },
    ]),
  ]);

  return { orders: orders[0] ?? { count: 0, totalAmount: 0 }, invoicedAmount: invoices[0]?.invoicedAmount ?? 0 };
};

module.exports = { getManagerAnalytics, getSupplierAnalytics, getVendorAnalytics };