const prisma = require('../config/prisma');
const ApiError = require('../lib/ApiError');
const { recordHistory } = require('./history.service');
const { HISTORY_EVENT } = require('../constants');

async function listVersions(agreementId) {
  return prisma.documentVersion.findMany({
    where: { agreementId },
    orderBy: { versionNumber: 'asc' },
    include: {
      clauses: { orderBy: { orderIndex: 'asc' } },
      createdBy: { select: { id: true, name: true, role: true } },
    },
  });
}

// Legal creates a new draft version (Dn) with its clauses. If clauses are omitted,
// clone the previous version's clauses so the new draft starts as an editable copy.
async function createVersion(actor, agreementId, { versionLabel, clauses }) {
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!agreement) throw ApiError.notFound('Agreement not found');

  const last = await prisma.documentVersion.findFirst({
    where: { agreementId },
    orderBy: { versionNumber: 'desc' },
    include: { clauses: { orderBy: { orderIndex: 'asc' } } },
  });

  const versionNumber = last ? last.versionNumber + 1 : 1;
  const label = versionLabel || `D${versionNumber}`;

  let clauseData = clauses;
  if (!clauseData || clauseData.length === 0) {
    // Clone from previous version (reset outcomes to PENDING for the new round).
    clauseData = (last?.clauses || []).map((c) => ({
      clauseKey: c.clauseKey,
      title: c.title,
      bodyText: c.bodyText,
      orderIndex: c.orderIndex,
    }));
  }

  const version = await prisma.$transaction(async (tx) => {
    const created = await tx.documentVersion.create({
      data: {
        agreementId,
        versionLabel: label,
        versionNumber,
        createdById: actor.id,
        clauses: {
          create: clauseData.map((c, i) => ({
            clauseKey: c.clauseKey || `clause-${i + 1}`,
            title: c.title,
            bodyText: c.bodyText,
            orderIndex: c.orderIndex ?? i,
          })),
        },
      },
      include: { clauses: { orderBy: { orderIndex: 'asc' } } },
    });
    await recordHistory(tx, {
      agreementId,
      actor,
      eventType: HISTORY_EVENT.VERSION_ADDED,
      payload: { versionLabel: label, versionNumber },
    });
    return created;
  });

  return version;
}

// Clause-matched word-level diff between two versions (FR-5).
async function compareVersions(agreementId, fromNumber, toNumber) {
  const { wordDiff } = require('../lib/diff');
  const versions = await prisma.documentVersion.findMany({
    where: { agreementId, versionNumber: { in: [fromNumber, toNumber] } },
    include: { clauses: { orderBy: { orderIndex: 'asc' } } },
  });
  const fromV = versions.find((v) => v.versionNumber === fromNumber);
  const toV = versions.find((v) => v.versionNumber === toNumber);
  if (!fromV || !toV) throw ApiError.notFound('One or both versions not found');

  const keys = new Set([
    ...fromV.clauses.map((c) => c.clauseKey),
    ...toV.clauses.map((c) => c.clauseKey),
  ]);

  const rows = [...keys].map((key) => {
    const a = fromV.clauses.find((c) => c.clauseKey === key);
    const b = toV.clauses.find((c) => c.clauseKey === key);
    return {
      clauseKey: key,
      title: (b || a).title,
      from: a ? { title: a.title, bodyText: a.bodyText, outcome: a.outcome } : null,
      to: b ? { title: b.title, bodyText: b.bodyText, outcome: b.outcome } : null,
      diff: wordDiff(a ? a.bodyText : '', b ? b.bodyText : ''),
      changeType: !a ? 'ADDED' : !b ? 'REMOVED' : 'MODIFIED',
    };
  });

  return {
    from: { versionNumber: fromV.versionNumber, versionLabel: fromV.versionLabel },
    to: { versionNumber: toV.versionNumber, versionLabel: toV.versionLabel },
    clauses: rows,
  };
}

module.exports = { listVersions, createVersion, compareVersions };
