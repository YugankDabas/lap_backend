const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ROLES } = require('../constants');
const { registerSchema, loginSchema } = require('../validators/auth.validators');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

// Account provisioning is Legal-only — roles are assigned by Legal, never self-chosen.
// (Initial Legal accounts come from the seed.)
router.post('/register', authenticate, requireRole(ROLES.LEGAL), validate(registerSchema), ctrl.register);
router.post('/login', loginLimiter, validate(loginSchema), ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
