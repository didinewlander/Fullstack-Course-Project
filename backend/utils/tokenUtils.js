const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const getRequiredEnvironmentVariable = (
  /** @type {string} */ name,
) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
};

const getAccessTokenMinutes = () => {
  const value = Number(
    process.env.ACCESS_TOKEN_MINUTES ?? 15,
  );

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      "ACCESS_TOKEN_MINUTES must be a positive integer",
    );
  }

  return value;
};

const getRefreshTokenDays = () => {
  const value = Number(
    process.env.REFRESH_TOKEN_DAYS ?? 7,
  );

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      "REFRESH_TOKEN_DAYS must be a positive integer",
    );
  }

  return value;
};

const getCommonJwtOptions = () => {
  return /** @type {import("jsonwebtoken").SignOptions} */ ({
    issuer:
      process.env.JWT_ISSUER ??
      "logistics-api",

    audience:
      process.env.JWT_AUDIENCE ??
      "logistics-client",

    algorithm: "HS256",
  });
};

const createAccessToken = (/** @type {{ username: any; role: any; _id: { toString: () => any; }; }} */ user) => {
  const secret =
    getRequiredEnvironmentVariable(
      "JWT_ACCESS_SECRET",
    );

  const minutes = getAccessTokenMinutes();

  return jwt.sign(
    {
      type: "access",
      username: user.username,
      role: user.role,
    },
    secret,
    {
      ...getCommonJwtOptions(),
      subject: user._id.toString(),
      expiresIn: `${minutes}m`,
      jwtid: crypto.randomUUID(),
    },
  );
};

const createRefreshToken = (/** @type {{ userId: string; sessionId: string; }} */ {
  userId,
  sessionId,
}) => {
  const secret =
    getRequiredEnvironmentVariable(
      "JWT_REFRESH_SECRET",
    );

  const days = getRefreshTokenDays();

  const token = jwt.sign(
    {
      type: "refresh",
      sid: sessionId.toString(),
    },
    secret,
    {
      ...getCommonJwtOptions(),
      subject: userId.toString(),
      expiresIn: `${days}d`,
      jwtid: crypto.randomUUID(),
    },
  );

  const expiresAt = new Date(
    Date.now() +
      days * 24 * 60 * 60 * 1000,
  );

  return {
    token,
    expiresAt,
  };
};

const verifyAccessToken = (/** @type {string} */ token) => {
  const secret =
    getRequiredEnvironmentVariable(
      "JWT_ACCESS_SECRET",
    );

  const payload = jwt.verify(
    token,
    secret,
    {
      issuer:
        process.env.JWT_ISSUER ??
        "logistics-api",

      audience:
        process.env.JWT_AUDIENCE ??
        "logistics-client",

      algorithms: ["HS256"],
    },
  );

  if (
    typeof payload !== "object" ||
    payload.type !== "access" ||
    !payload.sub
  ) {
    throw new Error("Invalid access token");
  }

  return payload;
};

const verifyRefreshToken = (/** @type {string} */ token) => {
  const secret =
    getRequiredEnvironmentVariable(
      "JWT_REFRESH_SECRET",
    );

  const payload = jwt.verify(
    token,
    secret,
    {
      issuer:
        process.env.JWT_ISSUER ??
        "logistics-api",

      audience:
        process.env.JWT_AUDIENCE ??
        "logistics-client",

      algorithms: ["HS256"],
    },
  );

  if (
    typeof payload !== "object" ||
    payload.type !== "refresh" ||
    !payload.sub ||
    !payload.sid
  ) {
    throw new Error("Invalid refresh token");
  }

  return payload;
};

const hashRefreshToken = (/** @type {string} */ token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const securelyCompareHashes = (
  /** @type {string} */ firstHash,
  /** @type {string} */ secondHash,
) => {
  if (
    typeof firstHash !== "string" ||
    typeof secondHash !== "string" ||
    firstHash.length !== secondHash.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(firstHash, "utf8"),
    Buffer.from(secondHash, "utf8"),
  );
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
  securelyCompareHashes,
  getRefreshTokenDays,
};