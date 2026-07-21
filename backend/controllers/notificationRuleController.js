//@ts-nocheck

const notificationRuleService = require("../services/notificationRule.service");

const asyncHandler = require("../utils/routerHandler");

const getRules = asyncHandler(async (req, res) => {
  const rules = await notificationRuleService.getRules();

  res.status(200).json({
    success: true,
    data: rules,
  });
});

const createCustomRule = asyncHandler(async (req, res) => {
  const rule = await notificationRuleService.createCustomRule({
    ruleInput: req.body,
    actor: req.auth,
  });

  res.status(201).json({
    success: true,
    data: rule,
  });
});

const updateRule = asyncHandler(async (req, res) => {
  const rule = await notificationRuleService.updateRule({
    ruleId: req.params.ruleId,
    ruleInput: req.body,
    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: rule,
  });
});

module.exports = {
  getRules,
  createCustomRule,
  updateRule,
};
