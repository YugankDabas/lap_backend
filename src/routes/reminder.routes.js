const express = require('express');
const ctrl = require('../controllers/reminder.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/pending', ctrl.listPending);
router.patch('/:id/acknowledge', ctrl.acknowledge);

module.exports = router;
