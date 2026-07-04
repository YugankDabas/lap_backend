const prisma = require('../config/prisma');
const ApiError = require('../lib/ApiError');
const { recordHistory } = require('./history.service');
const {
  HISTORY_EVENT,
  TEAM_STATUS,
  RESOLVED_CLAUSE_OUTCOMES,
  SIGN_DISCLAIMER_VERSION,
  CLAUSE_OUTCOME,
} = require('../constants');

// Legal/Business record a digital signature once all clauses in the latest version
// are resolved (outcome != PENDING). Also flips the signer's team circle to APPROVED.
async function signAgreement(actor, agreementId) {
  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
        include: { clauses: true },
      },
      signoffs: true,
    },
  });
  if (!agreement) throw ApiError.notFound('Agreement not found');

  const latest = agreement.versions[0];
  const clauses = latest ? latest.clauses : [];
  if (clauses.length === 0) {
    throw ApiError.badRequest('Cannot sign: the agreement has no clauses to resolve');
  }
  const unresolved = clauses.filter((c) => !RESOLVED_CLAUSE_OUTCOMES.includes(c.outcome));
  if (unresolved.length > 0) {
    throw ApiError.badRequest(
      `Cannot sign: ${unresolved.length} clause(s) still ${CLAUSE_OUTCOME.PENDING}`
    );
  }

  const already = agreement.signoffs.find((s) => s.signatoryRole === actor.role);
  if (already) throw ApiError.conflict('You have already signed this agreement');

  return prisma.$transaction(async (tx) => {
    const signoff = await tx.signoff.create({
      data: {
        agreementId,
        signatoryId: actor.id,
        signatoryName: actor.name,
        signatoryRole: actor.role,
        disclaimerVersion: SIGN_DISCLAIMER_VERSION,
      },
    });
    // Update the signer's own team circle to APPROVED (FR-7).
    await tx.teamStatus.update({
      where: { agreementId_team: { agreementId, team: actor.role } },
      data: { status: TEAM_STATUS.APPROVED, updatedById: actor.id },
    });
    await recordHistory(tx, {
      agreementId,
      actor,
      eventType: HISTORY_EVENT.SIGN_OFF,
      payload: { signatoryRole: actor.role },
    });
    return signoff;
  });
}

module.exports = { signAgreement };
