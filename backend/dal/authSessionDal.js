const AuthSession = require("../models/authSessionModel");

const createSession = async (
  /** @type {Partial<{ _id:string, userId: string; refreshTokenHash: string; expiresAt: Date; revokedAt: Date; userAgent: string; ipAddress: string; } & import("mongoose").DefaultTimestampProps>} */ sessionData,
) => {
  return AuthSession.create(sessionData);
};

const findSessionById = async (/** @type {string} */ sessionId) => {
  return AuthSession.findById(sessionId).lean();
};

const rotateRefreshToken = async (
  /** @type {{ sessionId: string; currentTokenHash: string; newTokenHash: string; expiresAt: Date; }} */ {
    sessionId,
    currentTokenHash,
    newTokenHash,
    expiresAt,
  },
) => {
  return AuthSession.findOneAndUpdate(
    {
      _id: sessionId,
      refreshTokenHash: currentTokenHash,
      revokedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    },
    {
      $set: {
        refreshTokenHash: newTokenHash,
        expiresAt,
      },
    },
    {
      new: true,
    },
  ).lean();
};

const revokeSession = async (/** @type {string} */ sessionId) => {
  return AuthSession.findOneAndUpdate(
    {
      _id: sessionId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
    {
      new: true,
    },
  ).lean();
};

const revokeAllUserSessions = async (/** @type {string} */ userId) => {
  return AuthSession.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
};

module.exports = {
  createSession,
  findSessionById,
  rotateRefreshToken,
  revokeSession,
  revokeAllUserSessions,
};
