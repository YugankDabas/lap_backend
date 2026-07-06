const asyncHandler = require('../lib/asyncHandler');
const userService = require('../services/user.service');

const list = asyncHandler(async (req, res) => {
  res.json({ users: await userService.listUsers() });
});

module.exports = { list };
