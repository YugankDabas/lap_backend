const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const agreementRoutes = require('./agreement.routes');
const reminderRoutes = require('./reminder.routes');
const clauseRoutes = require('./clause.routes');
const commentRoutes = require('./comment.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/agreements', agreementRoutes);
router.use('/reminders', reminderRoutes);
router.use('/clauses', clauseRoutes);
router.use('/comments', commentRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
