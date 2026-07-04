const asyncHandler = require('../lib/asyncHandler');
const dashboardService = require('../services/dashboard.service');

const summary = asyncHandler(async (req, res) => {
  res.json({ summary: await dashboardService.getSummary(req.user) });
});

module.exports = { summary };
