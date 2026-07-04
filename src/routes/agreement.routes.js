const express = require('express');
const ctrl = require('../controllers/agreement.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireTeamOwnership } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { ROLES } = require('../constants');
const V = require('../validators/agreement.validators');

const router = express.Router();

// All agreement routes require authentication.
router.use(authenticate);

// List + export (export before :id so it isn't captured as an id).
router.get('/', ctrl.list);
router.get('/export', ctrl.exportList);

// Create / read / update
router.post('/', requireRole(ROLES.LEGAL), validate(V.createAgreementSchema), ctrl.create);
router.get('/:id', ctrl.getOne);
router.patch('/:id', requireRole(ROLES.LEGAL), validate(V.updateAgreementSchema), ctrl.update);

// Team status circle (Legal any team; others own team only)
router.patch(
  '/:id/status/:team',
  requireTeamOwnership,
  validate(V.setStatusSchema),
  ctrl.setStatus
);

// Remarks & history
router.get('/:id/remarks', ctrl.listRemarks);
router.post('/:id/remarks', validate(V.remarkSchema), ctrl.addRemark);
router.get('/:id/history', ctrl.listHistory);

// Versions & compare
router.get('/:id/versions', ctrl.listVersions);
router.post(
  '/:id/versions',
  requireRole(ROLES.LEGAL),
  validate(V.createVersionSchema),
  ctrl.createVersion
);
router.get('/:id/compare', ctrl.compare);

// Reminders (Legal sends)
router.post(
  '/:id/reminders',
  requireRole(ROLES.LEGAL),
  validate(V.reminderSchema),
  ctrl.sendReminder
);

// Compliance queries (Compliance raises; Legal + Compliance view)
router.post(
  '/:id/compliance-queries',
  requireRole(ROLES.COMPLIANCE),
  validate(V.complianceQuerySchema),
  ctrl.raiseQuery
);
router.get(
  '/:id/compliance-queries',
  requireRole(ROLES.LEGAL, ROLES.COMPLIANCE),
  ctrl.listQueries
);

// Sign-off (Legal or Business)
router.post('/:id/signoff', requireRole(ROLES.LEGAL, ROLES.BUSINESS), ctrl.sign);

module.exports = router;
