//@ts-nocheck
const { USER_ROLE_VALUES } = require("../utils/usersUtils");

const mongoose = require("mongoose");

const notificationRuleDal = require("../dal/notificationRuleDal");

const AppError = require("../utils/AppError");

const validateRuleId = (/** @type {{ ruleId: string }} */ { ruleId }) => {
  if (!mongoose.isValidObjectId(ruleId)) {
    throw new AppError(
      "Invalid notification rule ID",
      400,
      "INVALID_NOTIFICATION_RULE_ID",
    );
  }
};

const validateRecipientRoles = (recipientRoles) => {
  if (!Array.isArray(recipientRoles)) {
    throw new AppError(
      "recipientRoles must be an array",
      400,
      "INVALID_RECIPIENT_ROLES",
    );
  }

  const invalidRole = recipientRoles.find(
    (role) => !USER_ROLE_VALUES.includes(role),
  );

  if (invalidRole) {
    throw new AppError(
      `Invalid recipient role: ${invalidRole}`,
      400,
      "INVALID_RECIPIENT_ROLE",
    );
  }

  return [...new Set(recipientRoles)];
};

const getRules = async () => {
  return notificationRuleDal.findRules();
};

const createCustomRule = async (
  /** @type {{ ruleInput: { eventKey: string, recipientRoles?: string[], displayName?: string, description?: string, enabled?: boolean, parameters?: object, template?: { title?: string, message?: string } }, actor: { userId: string } }} */ {
    ruleInput,
    actor,
  },
) => {
  if (typeof ruleInput.eventKey !== "string" || !ruleInput.eventKey.trim()) {
    throw new AppError("eventKey is required", 400, "EVENT_KEY_REQUIRED");
  }

  const eventKey = ruleInput.eventKey.trim().toUpperCase();

  if (!eventKey.startsWith("CUSTOM_")) {
    throw new AppError(
      "Custom event keys must start with CUSTOM_",
      400,
      "INVALID_CUSTOM_EVENT_KEY",
    );
  }

  if (!/^[A-Z][A-Z0-9_]*$/.test(eventKey)) {
    throw new AppError("Invalid event key", 400, "INVALID_EVENT_KEY");
  }

  const existingRule = await notificationRuleDal.findRuleByEventKey({
    eventKey,
  });

  if (existingRule) {
    throw new AppError(
      "A notification rule with this event key already exists",
      409,
      "NOTIFICATION_RULE_ALREADY_EXISTS",
    );
  }

  const recipientRoles = validateRecipientRoles(ruleInput.recipientRoles ?? []);

  return notificationRuleDal.createRule({
    // @ts-ignore
    eventKey,
    displayName: String(ruleInput.displayName ?? "").trim(),

    description: String(ruleInput.description ?? "").trim(),

    enabled: ruleInput.enabled !== false,

    isSystemEvent: false,

    recipientRoles,

    parameters: ruleInput.parameters ?? {},

    template: {
      title: String(ruleInput.template?.title ?? "").trim(),

      message: String(ruleInput.template?.message ?? "").trim(),
    },

    createdByUserId: actor.userId,

    updatedByUserId: actor.userId,
  });
};

const updateRule = async (
  /** @type {{ ruleId: string, ruleInput: object, actor: { userId: string } }} */ {
    ruleId,
    ruleInput,
    actor,
  },
) => {
  validateRuleId({ ruleId });

  const rule = await notificationRuleDal.findRuleById({ ruleId });

  if (!rule) {
    throw new AppError(
      "Notification rule not found",
      404,
      "NOTIFICATION_RULE_NOT_FOUND",
    );
  }

  const updateData = {
    updatedByUserId: actor.userId,
  };

  if (ruleInput.enabled !== undefined) {
    updateData.enabled = Boolean(ruleInput.enabled);
  }

  if (ruleInput.displayName !== undefined) {
    updateData.displayName = String(ruleInput.displayName).trim();
  }

  if (ruleInput.description !== undefined) {
    updateData.description = String(ruleInput.description).trim();
  }

  if (ruleInput.recipientRoles !== undefined) {
    updateData.recipientRoles = validateRecipientRoles(
      ruleInput.recipientRoles,
    );
  }

  if (ruleInput.parameters !== undefined) {
    updateData.parameters = ruleInput.parameters;
  }

  if (ruleInput.template !== undefined) {
    updateData.template = {
      title: String(ruleInput.template.title ?? rule.template.title).trim(),

      message: String(
        ruleInput.template.message ?? rule.template.message,
      ).trim(),
    };
  }

  /*
   * eventKey and isSystemEvent cannot be changed.
   */
  return notificationRuleDal.updateRuleById({ ruleId, updateData });
};

module.exports = {
  getRules,
  createCustomRule,
  updateRule,
};
