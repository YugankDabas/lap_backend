const prisma = require('../config/prisma');
const ApiError = require('../lib/ApiError');
const { recordHistory } = require('./history.service');
const { TEAMS, TEAM_STATUS, HISTORY_EVENT, ROLES } = require('../constants');

// Derive a single overall status from the four team circles (plan §14 item 1 - impl decision).
function deriveOverallStatus(teamStatuses) {
  const values = teamStatuses.map((t) => t.status);
  if (values.length && values.every((v) => v === TEAM_STATUS.APPROVED)) return 'APPROVED';
  if (values.some((v) => v === TEAM_STATUS.UNDER_REVIEW)) return 'UNDER_REVIEW';
  return 'PENDING';
}

function withOverall(agreement) {
  return { ...agreement, overallStatus: deriveOverallStatus(agreement.teamStatuses || []) };
}

async function listAgreements(filters = {}) {
  const { search, type, status, myStatus, myTeam, isDemo } = filters;

  const where = {};
  if (search) where.clientName = { contains: search, mode: 'insensitive' };
  if (type) where.type = type;
  if (typeof isDemo === 'boolean') where.isDemo = isDemo;

  // Filter by the requesting user's own team status.
  if (myStatus && myTeam) {
    where.teamStatuses = { some: { team: myTeam, status: myStatus } };
  }

  let agreements = await prisma.agreement.findMany({
    where,
    orderBy: { lastUpdatedAt: 'desc' },
    include: {
      teamStatuses: true,
      createdBy: { select: { id: true, name: true, role: true } },
      spocs: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
  });

  agreements = agreements.map(withOverall);

  // Overall-status filter is applied after derivation.
  if (status) agreements = agreements.filter((a) => a.overallStatus === status);

  return agreements;
}

async function getAgreementById(id) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: {
      teamStatuses: true,
      createdBy: { select: { id: true, name: true, role: true } },
      spocs: { include: { user: { select: { id: true, name: true, role: true } } } },
      versions: {
        orderBy: { versionNumber: 'asc' },
        include: {
          clauses: { orderBy: { orderIndex: 'asc' } },
          createdBy: { select: { id: true, name: true, role: true } },
        },
      },
      remarks: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
      history: {
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, role: true } } },
      },
      reminders: { orderBy: { createdAt: 'desc' } },
      signoffs: true,
      complianceQueries: {
        orderBy: { createdAt: 'desc' },
        include: { raisedBy: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!agreement) throw ApiError.notFound('Agreement not found');
  return withOverall(agreement);
}

async function createAgreement(actor, data) {
  const { title, clientName, type, startDate, isDemo = false, spocs = [] } = data;

  const created = await prisma.$transaction(async (tx) => {
    const agreement = await tx.agreement.create({
      data: {
        title,
        clientName,
        type,
        startDate: new Date(startDate),
        isDemo,
        createdById: actor.id,
        // Initialize one status circle per team at PENDING.
        teamStatuses: {
          create: Object.values(TEAMS).map((team) => ({
            team,
            status: TEAM_STATUS.PENDING,
          })),
        },
      },
    });

    // Optional SPOC assignments.
    for (const s of spocs) {
      await tx.agreementSpoc.create({
        data: { agreementId: agreement.id, team: s.team, userId: s.userId },
      });
    }

    await recordHistory(tx, {
      agreementId: agreement.id,
      actor,
      eventType: HISTORY_EVENT.AGREEMENT_CREATED,
      payload: { title, clientName, type },
    });

    return agreement;
  });

  return getAgreementById(created.id);
}

async function updateAgreement(actor, id, data) {
  const existing = await prisma.agreement.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Agreement not found');

  const patch = {};
  ['title', 'clientName', 'type'].forEach((k) => {
    if (data[k] !== undefined) patch[k] = data[k];
  });
  if (data.startDate !== undefined) patch.startDate = new Date(data.startDate);
  if (data.isDemo !== undefined) patch.isDemo = data.isDemo;

  await prisma.$transaction(async (tx) => {
    await tx.agreement.update({ where: { id }, data: patch });
    await recordHistory(tx, {
      agreementId: id,
      actor,
      eventType: HISTORY_EVENT.AGREEMENT_UPDATED,
      payload: patch,
    });
  });

  return getAgreementById(id);
}

module.exports = {
  listAgreements,
  getAgreementById,
  createAgreement,
  updateAgreement,
  deriveOverallStatus,
};
