const prisma = require('../config/prisma');
const ApiError = require('../lib/ApiError');
const { recordHistory } = require('./history.service');
const { HISTORY_EVENT } = require('../constants');

// Legal-only: add a new clause to an existing version.
async function addClause(actor, versionId, { title, bodyText, clauseKey, outcome }) {
  const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
  if (!version) throw ApiError.notFound('Version not found');

  const count = await prisma.clause.count({ where: { versionId } });
  return prisma.clause.create({
    data: {
      versionId,
      clauseKey: clauseKey || `clause-${count + 1}-${Date.now()}`,
      title,
      bodyText,
      outcome: outcome || 'PENDING',
      orderIndex: count,
    },
  });
}

async function listClauses(versionId) {
  return prisma.clause.findMany({
    where: { versionId },
    orderBy: { orderIndex: 'asc' },
    include: {
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  });
}

// Legal-only: edit clause body/title and/or set its outcome.
async function updateClause(actor, clauseId, { title, bodyText, outcome }) {
  const clause = await prisma.clause.findUnique({
    where: { id: clauseId },
    include: { version: true },
  });
  if (!clause) throw ApiError.notFound('Clause not found');

  const data = {};
  if (title !== undefined) data.title = title;
  if (bodyText !== undefined) data.bodyText = bodyText;
  if (outcome !== undefined) data.outcome = outcome;

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.clause.update({ where: { id: clauseId }, data });
    if (outcome !== undefined && outcome !== clause.outcome) {
      await recordHistory(tx, {
        agreementId: clause.version.agreementId,
        actor,
        eventType: HISTORY_EVENT.CLAUSE_OUTCOME_CHANGED,
        payload: { clauseId, clauseKey: clause.clauseKey, from: clause.outcome, to: outcome },
      });
    }
    return row;
  });

  return updated;
}

module.exports = { listClauses, updateClause, addClause };
