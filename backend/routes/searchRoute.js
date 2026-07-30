const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { search } = require("../controllers/searchController");

/*
 * Cross-resource search: GET /api/v1/search?q=...
 *
 * Every result is scoped to what the caller may already see, so this is a
 * convenience over the existing endpoints, never a way around their rules.
 */
const router = express.Router();

router.use(authenticate);

router.get("/", search);

module.exports = router;
