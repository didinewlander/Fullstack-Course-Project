const AppError = require("../utils/AppError");
const { verifyAccessToken } = require("../utils/tokenUtils");
//@ts-ignore
const authenticate = (req, res, next) => {
  const authorizationHeader = req.get("authorization");

  if (!authorizationHeader) {
    return next(
      new AppError(
        "Authentication is required",
        401,
        "AUTHENTICATION_REQUIRED",
      ),
    );
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(
      new AppError(
        "Invalid authorization header",
        401,
        "INVALID_AUTHORIZATION_HEADER",
      ),
    );
  }

  try {
    const payload = verifyAccessToken(token);

    req.auth = {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      tokenId: payload.jti,
    };

    req.user = {
      ...req.auth,
      id: payload.sub,
    };

    return next();
  } catch {
    return next(
      new AppError(
        "Invalid or expired access token",
        401,
        "INVALID_ACCESS_TOKEN",
      ),
    );
  }
};

const authorizeRoles = (/** @type {string[]} */ ...allowedRoles) => {
  //@ts-ignore
  return (req, res, next) => {
    if (!req.auth) {
      return next(
        new AppError(
          "Authentication is required",
          401,
          "AUTHENTICATION_REQUIRED",
        ),
      );
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(
        new AppError(
          "You do not have permission to perform this operation",
          403,
          "FORBIDDEN",
        ),
      );
    }

    return next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
};
