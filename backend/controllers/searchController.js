const asyncHandler = require("../utils/routerHandler");
const searchService = require("../services/search.service");

const search = asyncHandler(async (req, res) => {
  const result = await searchService.search({
    term: req.query.q,
    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = { search };
