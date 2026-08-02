const NotificationRule = require("../models/notificationRuleModel");

const createRule = async (/** @type {{ ruleData: object }} */ { ruleData }) => {
  return NotificationRule.create(ruleData);
};

const findRuleById = async (/** @type {{ ruleId: string }} */ { ruleId }) => {
  return NotificationRule.findById(ruleId).lean();
};

const findRuleByEventKey = async (
  /** @type {{ eventKey: string }} */ { eventKey },
) => {
  return NotificationRule.findOne({
    eventKey,
  }).lean();
};

const findRules = async () => {
  return NotificationRule.find({})
    .sort({
      isSystemEvent: -1,
      displayName: 1,
    })
    .lean();
};

const updateRuleById = async (
  /** @type {{ ruleId: string, updateData: object }} */ { ruleId, updateData },
) => {
  return NotificationRule.findByIdAndUpdate(
    ruleId,
    {
      $set: updateData,
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

module.exports = {
  createRule,
  findRuleById,
  findRuleByEventKey,
  findRules,
  updateRuleById,
};
