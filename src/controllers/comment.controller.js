const asyncHandler = require('../lib/asyncHandler');
const commentService = require('../services/comment.service');

const resolve = asyncHandler(async (req, res) => {
  res.json({ comment: await commentService.resolveComment(req.user, req.params.id) });
});

module.exports = { resolve };
