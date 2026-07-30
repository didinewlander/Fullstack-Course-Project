const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getCurrentUser,
} = require(
  "../controllers/authController",
);

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.post(
  "/logout-all",
  authenticate,
  logoutAll,
);

router.get(
  "/me",
  authenticate,
  getCurrentUser,
);

module.exports = router;
module.exports = router;