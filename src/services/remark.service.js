const prisma = require('../config/prisma');
const ApiError = require('../lib/ApiError');
const { recordHistory } = require('./history.service');
const { HISTORY_EVENT } = require('../constants');

async function listRemarks(agreementId) {
  await assertAgreement(agreementId);
  return prisma.remark.findMany({
    where: { agreementId },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
}

// All authenticated roles may add remarks (plan §18 note).
async function addRemark(actor, agreementId, { body }) {
  await assertAgreement(agreementId);
  return prisma.$transaction(async (tx) => {
    const remark = await tx.remark.create({
      data: { agreementId, authorId: actor.id, authorRole: actor.role, body },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
    await recordHistory(tx, {
      agreementId,
      actor,
      eventType: HISTORY_EVENT.REMARK_ADDED,
      payload: { remarkId: remark.id },
    });
    return remark;
  });
}

async function listHistory(agreementId) {
  await assertAgreement(agreementId);
  return prisma.historyLog.findMany({
    where: { agreementId },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { id: true, name: true, role: true } } },
  });
}

async function assertAgreement(agreementId) {
  const a = await prisma.agreement.findUnique({ where: { id: agreementId }, select: { id: true } });
  if (!a) throw ApiError.notFound('Agreement not found');
}

module.exports = { listRemarks, addRemark, listHistory };
