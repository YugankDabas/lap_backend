const prisma = require('../config/prisma');
const ApiError = require('../lib/ApiError');
const { recordHistory } = require('./history.service');
const { HISTORY_EVENT } = require('../constants');

// Set a team's status circle and/or "My Status" note. Ownership is enforced by
// middleware (requireTeamOwnership) before this runs.
async function setTeamStatus(actor, agreementId, team, { status, myStatusNote }) {
  const existing = await prisma.teamStatus.findUnique({
    where: { agreementId_team: { agreementId, team } },
  });
  if (!existing) throw ApiError.notFound('Agreement or team status not found');

  const data = {};
  if (status !== undefined) data.status = status;
  if (myStatusNote !== undefined) data.myStatusNote = myStatusNote;
  data.updatedById = actor.id;

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.teamStatus.update({
      where: { agreementId_team: { agreementId, team } },
      data,
    });
    await recordHistory(tx, {
      agreementId,
      actor,
      eventType: HISTORY_EVENT.STATUS_CHANGE,
      payload: {
        team,
        from: existing.status,
        to: row.status,
        noteChanged: myStatusNote !== undefined,
      },
    });
    return row;
  });

  return updated;
}

module.exports = { setTeamStatus };
