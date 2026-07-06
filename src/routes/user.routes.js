const express = require('express');
const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../constants');

const router = express.Router();

// User directory is used by Legal to assign SPOCs.
router.get('/', authenticate, requireRole(ROLES.LEGAL), ctrl.list);

module.exports = router;
