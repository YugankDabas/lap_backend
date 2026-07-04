const prisma = require('../config/prisma');
const ApiError = require('../lib/ApiError');
const { recordHistory } = require('./history.service');
const { HISTORY_EVENT } = require('../constants');

// Compliance-only: raise a query against an agreement (visible to Legal).
async function raiseQuery(actor, agreementId, { queryText }) {
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw ApiError.notFound('Agreement not found');

  return prisma.$transaction(async (tx) => {
    const query = await tx.complianceQuery.create({
      data: {
        agreementId,
        raisedById: actor.id,
        raisedByName: actor.name,
        queryText,
      },
      include: { raisedBy: { select: { id: true, name: true, role: true } } },
    });
    await recordHistory(tx, {
      agreementId,
      actor,
      eventType: HISTORY_EVENT.COMPLIANCE_QUERY_RAISED,
      payload: { queryId: query.id },
    });
    return query;
  });
}

async function listQueries(agreementId) {
  return prisma.complianceQuery.findMany({
    where: { agreementId },
    orderBy: { createdAt: 'desc' },
    include: { raisedBy: { select: { id: true, name: true, role: true } } },
  });
}

module.exports = { raiseQuery, listQueries };
