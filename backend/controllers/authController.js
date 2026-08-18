
const authService = require("../services/auth.service");
const userService = require("../services/user.service");
const asyncHandler = require("../utils/routerHandler");
const { getRefreshTokenDays } = require("../utils/tokenUtils");

const REFRESH_COOKIE_NAME = "refreshToken";

const getRefreshCookieOptions = () => {
  const days = getRefreshTokenDays();
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/v1/auth",
    maxAge: days * 24 * 60 * 60 * 1000,
  };
};

const getClearCookieOptions = () => {
  const { maxAge, ...options } = getRefreshCookieOptions();

  return options;
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
};

const register = asyncHandler(async (req, res) => {
  const result = await authService.register({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  });

  setRefreshTokenCookie(res, result.refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  });

  setRefreshTokenCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const currentRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  const result = await authService.refresh({
    refreshToken: currentRefreshToken,
  });

  setRefreshTokenCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  await authService.logout({ refreshToken });

  clearRefreshTokenCookie(res);

  res.status(204).send();
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll({ userId: req.auth.userId });

  clearRefreshTokenCookie(res);

  res.status(204).send();
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.auth.userId);

  res.status(200).json({
    success: true,
    data: user,
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getCurrentUser,
};
