const CalculatorData = require("../models/calculatorDataModel");

const findByVendorId = (vendorId) => CalculatorData.findOne({ vendorId }).lean();

const upsertByVendorId = ({ vendorId, updateData }) =>
  CalculatorData.findOneAndUpdate(
    { vendorId },
    { $set: updateData, $setOnInsert: { vendorId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

module.exports = { findByVendorId, upsertByVendorId };