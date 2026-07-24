const DeliverySettings = require("../models/deliverySettingsModel");

const getSettings = async () =>
  DeliverySettings.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

const updateSettings = async ({ autoApprovalThreshold }) =>
  DeliverySettings.findOneAndUpdate(
    { key: "default" },
    { $set: { autoApprovalThreshold } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

module.exports = { getSettings, updateSettings };