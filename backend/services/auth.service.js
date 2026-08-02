const AppError = require("../utils/AppError");
const { USER_ROLES } = require("../utils/usersUtils");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const userDal = require("../dal/userDal");
const authSessionDal = require("../dal/authSessionDal");

const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  securelyCompareHashes,
} = require("../utils/tokenUtils");

const normalizeEmail = (/** @type {string} */ email) => {
  return email.trim().toLowerCase();
};

const normalizeUsername = (/** @type {string} */ username) => {
  return username.trim().toLowerCase();
};

const toPublicUser = (
  /** @type {{ toObject?: () => any; password?: string; }} */ user,
) => {
  const publicUser =
    typeof user.toObject === "function" ? user.toObject() : { ...user };

  delete publicUser.password;

  return publicUser;
};

const validateRegistrationInput = (
  /** @type {{ username: string; email: string; password: string; }} */ {
    username,
    email,
    password,
  },
) => {
  if (typeof username !== "string" || username.trim().length < 3) {
    throw new AppError(
      "Username must contain at least 3 characters",
      400,
      "INVALID_USERNAME",
    );
  }

  if (typeof email !== "string" || !email.trim()) {
    throw new AppError("Email is required", 400, "EMAIL_REQUIRED");
  }

  const normalizedEmail = normalizeEmail(email);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw new AppError("Invalid email address", 400, "INVALID_EMAIL");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw new AppError(
      "Password must contain at least 8 characters",
      400,
      "INVALID_PASSWORD",
    );
  }

  return {
    username: normalizeUsername(username),
    email: normalizedEmail,
    password,
  };
};

const createAuthenticatedSession = async (
  /** @type {{ user: any; userAgent?: string; ipAddress?: string; }} */ {
    user,
    userAgent,
    ipAddress,
  },
) => {
  const sessionId = new mongoose.Types.ObjectId().toString();

  const refreshTokenResult = createRefreshToken({
    userId: user._id,
    sessionId,
  });

  await authSessionDal.createSession({
    _id: sessionId,
    userId: user._id,
    refreshTokenHash: hashRefreshToken(refreshTokenResult.token),
    expiresAt: refreshTokenResult.expiresAt,
    userAgent: userAgent ?? undefined,
    ipAddress: ipAddress ?? undefined,
  });

  return {
    accessToken: createAccessToken(user),
    refreshToken: refreshTokenResult.token,
    refreshTokenExpiresAt: refreshTokenResult.expiresAt,
  };
};

const register = async (
  /** @type {{ username: string; email: string; password: string; userAgent?: string; ipAddress?: string; }} */ {
    username,
    email,
    password,
    userAgent,
    ipAddress,
  },
) => {
  const validated = validateRegistrationInput({
    username,
    email,
    password,
  });

  const [existingEmail, existingUsername] = await Promise.all([
    userDal.findUserByEmail(validated.email),

    userDal.findUserByUsername(validated.username),
  ]);

  if (existingEmail) {
    throw new AppError(
      "A user with this email already exists",
      409,
      "EMAIL_ALREADY_EXISTS",
    );
  }

  if (existingUsername) {
    throw new AppError(
      "A user with this username already exists",
      409,
      "USERNAME_ALREADY_EXISTS",
    );
  }

  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10) {
    throw new Error("BCRYPT_ROUNDS must be an integer of at least 10");
  }

  const passwordHash = await bcrypt.hash(validated.password, bcryptRounds);

  /*
   * Never use req.body.role here.
   *
   * Public registration must not be able to create
   * Logistics Manager or Supplier accounts.
   */
  const user = await userDal.createUser({
    username: validated.username,
    email: validated.email,
    password: passwordHash,
    role: USER_ROLES.VENDOR,
  });

  const tokens = await createAuthenticatedSession({
    user,
    userAgent,
    ipAddress,
  });

  return {
    user: toPublicUser(user),
    ...tokens,
  };
};

const login = async (
  /** @type {{ email: string; password: string; userAgent?: string; ipAddress?: string; }} */ {
    email,
    password,
    userAgent,
    ipAddress,
  },
) => {
  if (typeof email !== "string" || typeof password !== "string") {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await userDal.findUserByEmailWithPassword(normalizedEmail);

  /*
   * Always use the same error for:
   * - unknown email
   * - incorrect password
   */
  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const tokens = await createAuthenticatedSession({
    user,
    userAgent,
    ipAddress,
  });

  return {
    user: toPublicUser(user),
    ...tokens,
  };
};

const refresh = async (
  /** @type {{ refreshToken: string }} */ { refreshToken },
) => {
  if (!refreshToken) {
    throw new AppError(
      "Refresh token is required",
      401,
      "REFRESH_TOKEN_REQUIRED",
    );
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(
      "Invalid or expired refresh token",
      401,
      "INVALID_REFRESH_TOKEN",
    );
  }

  if (
    !mongoose.isValidObjectId(payload.sid) ||
    !mongoose.isValidObjectId(payload.sub)
  ) {
    throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  const session = await authSessionDal.findSessionById(payload.sid);

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.userId.toString() !== payload.sub
  ) {
    throw new AppError(
      "Invalid or expired refresh token",
      401,
      "INVALID_REFRESH_TOKEN",
    );
  }

  const providedTokenHash = hashRefreshToken(refreshToken);

  const tokenHashMatches = securelyCompareHashes(
    providedTokenHash,
    session.refreshTokenHash,
  );

  /*
   * The JWT is valid, but its hash no longer matches
   * the current token stored for this session.
   *
   * This can indicate that an already-rotated token
   * was reused.
   */
  if (!tokenHashMatches) {
    await authSessionDal.revokeAllUserSessions(session.userId.toString());

    throw new AppError(
      "Refresh token reuse detected",
      401,
      "REFRESH_TOKEN_REUSED",
    );
  }

  const user = await userDal.findUserById(payload.sub);

  if (!user) {
    await authSessionDal.revokeSession(session._id.toString());

    throw new AppError("User no longer exists", 401, "USER_NOT_FOUND");
  }

  const newRefreshTokenResult = createRefreshToken({
    userId: user._id.toString(),
    sessionId: session._id.toString(),
  });

  const newRefreshTokenHash = hashRefreshToken(newRefreshTokenResult.token);

  const rotatedSession = await authSessionDal.rotateRefreshToken({
    sessionId: session._id.toString(),
    currentTokenHash: providedTokenHash,
    newTokenHash: newRefreshTokenHash,
    expiresAt: newRefreshTokenResult.expiresAt,
  });

  /*
   * Another refresh request may have rotated
   * the token between our read and update.
   */
  if (!rotatedSession) {
    await authSessionDal.revokeAllUserSessions(session.userId.toString());

    throw new AppError(
      "Refresh token reuse detected",
      401,
      "REFRESH_TOKEN_REUSED",
    );
  }

  return {
    user,
    accessToken: createAccessToken(user),
    refreshToken: newRefreshTokenResult.token,
    refreshTokenExpiresAt: newRefreshTokenResult.expiresAt,
  };
};

const logout = async (
  /** @type {{ refreshToken: string }} */ { refreshToken },
) => {
  if (!refreshToken) {
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    if (mongoose.isValidObjectId(payload.sid)) {
      await authSessionDal.revokeSession(payload.sid);
    }
  } catch {
    /*
     * The cookie should still be cleared even
     * when it contains an invalid or expired token.
     */
  }
};

const logoutAll = async (/** @type {{ userId: string }} */ { userId }) => {
  await authSessionDal.revokeAllUserSessions(userId);
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
};
