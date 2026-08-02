const { USER_ROLE_VALUES } = require("../utils/usersUtils");

const mongoose = require("mongoose");

const NotificationRuleSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z][A-Z0-9_]*$/,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    /*
     * Identifies rules that are built into the
     * system and cannot be deleted or renamed.
     */
    isSystemEvent: {
      type: Boolean,
      default: false,
    },

    recipientRoles: {
      type: [
        {
          type: String,
          enum: USER_ROLE_VALUES,
        },
      ],
      default: [],
    },

    /*
     * Event-specific configuration:
     *
     * {
     *   thresholdHours: 24
     * }
     */
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    template: {
      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
      },
    },

    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const NotificationRule = mongoose.model(
  "NotificationRule",
  NotificationRuleSchema,
);

module.exports = NotificationRule;
