const prisma = require('../config/prisma');
const ApiError = require('../lib/ApiError');
const { recordHistory } = require('./history.service');
const { HISTORY_EVENT } = require('../constants');

// Legal-only: send a nudge to a team blocking an agreement.
async function sendReminder(actor, agreementId, { targetTeam, message }) {
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw ApiError.notFound('Agreement not found');

  return prisma.$transaction(async (tx) => {
    const reminder = await tx.reminder.create({
      data: { agreementId, senderId: actor.id, targetTeam, message },
    });
    await recordHistory(tx, {
      agreementId,
      actor,
      eventType: HISTORY_EVENT.REMINDER_SENT,
      payload: { targetTeam, reminderId: reminder.id },
    });
    return reminder;
  });
}

// Pending (unacknowledged) reminders addressed to the caller's team -> banner feed.
async function listPendingForTeam(team) {
  return prisma.reminder.findMany({
    where: { targetTeam: team, acknowledgedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      agreement: { select: { id: true, title: true, clientName: true } },
      sender: { select: { id: true, name: true, role: true } },
    },
  });
}

async function acknowledgeReminder(actor, reminderId) {
  const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
  if (!reminder) throw ApiError.notFound('Reminder not found');
  // Only the targeted team may acknowledge its own nudge.
  if (reminder.targetTeam !== actor.role) {
    throw ApiError.forbidden('You can only acknowledge reminders addressed to your team');
  }
  return prisma.reminder.update({
    where: { id: reminderId },
    data: { acknowledgedAt: new Date() },
  });
}

module.exports = { sendReminder, listPendingForTeam, acknowledgeReminder };
