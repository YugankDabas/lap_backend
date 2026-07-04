const express = require('express');
const ctrl = require('../controllers/comment.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.patch('/:id/resolve', ctrl.resolve);

module.exports = router;
