const asyncHandler = require('../lib/asyncHandler');
const reminderService = require('../services/reminder.service');

const listPending = asyncHandler(async (req, res) => {
  res.json({ reminders: await reminderService.listPendingForTeam(req.user.role) });
});

const acknowledge = asyncHandler(async (req, res) => {
  res.json({ reminder: await reminderService.acknowledgeReminder(req.user, req.params.id) });
});

module.exports = { listPending, acknowledge };
