const asyncHandler = require('../lib/asyncHandler');
const clauseService = require('../services/clause.service');
const commentService = require('../services/comment.service');

const listByVersion = asyncHandler(async (req, res) => {
  res.json({ clauses: await clauseService.listClauses(req.params.versionId) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ clause: await clauseService.updateClause(req.user, req.params.clauseId, req.body) });
});

const add = asyncHandler(async (req, res) => {
  res.status(201).json({
    clause: await clauseService.addClause(req.user, req.params.versionId, req.body),
  });
});

const addComment = asyncHandler(async (req, res) => {
  res.status(201).json({
    comment: await commentService.addComment(req.user, req.params.clauseId, req.body),
  });
});

module.exports = { listByVersion, update, add, addComment };
