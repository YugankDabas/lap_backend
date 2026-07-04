const express = require('express');
const ctrl = require('../controllers/clause.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { ROLES } = require('../constants');
const V = require('../validators/agreement.validators');

const router = express.Router();
router.use(authenticate);

// List clauses of a version (any authenticated role).
router.get('/version/:versionId', ctrl.listByVersion);

// Add a clause to a version (Legal only).
router.post('/version/:versionId', requireRole(ROLES.LEGAL), validate(V.addClauseSchema), ctrl.add);

// Edit clause / set outcome (Legal only).
router.patch('/:clauseId', requireRole(ROLES.LEGAL), validate(V.updateClauseSchema), ctrl.update);

// Add inline comment (any authenticated role).
router.post('/:clauseId/comments', validate(V.commentSchema), ctrl.addComment);

module.exports = router;
