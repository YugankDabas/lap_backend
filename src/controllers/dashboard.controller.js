const asyncHandler = require('../lib/asyncHandler');
const dashboardService = require('../services/dashboard.service');

const summary = asyncHandler(async (req, res) => {
  const includeDemo = req.query.includeDemo === 'true';
  res.json({ summary: await dashboardService.getSummary(req.user, { includeDemo }) });
});

module.exports = { summary };
