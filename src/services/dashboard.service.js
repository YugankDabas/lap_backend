const prisma = require('../config/prisma');
const { TEAMS, TEAM_STATUS, HISTORY_EVENT } = require('../constants');
const { deriveOverallStatus } = require('./agreement.service');

// An agreement not fully approved and untouched for this many days is "stuck".
const STUCK_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// A clause is "open" while its negotiation outcome is still PENDING.
function openClauseCount(agreement) {
  const latest = agreement.versions[0]; // versions loaded desc, take 1
  if (!latest) return 0;
  return latest.clauses.filter((c) => c.outcome === TEAM_STATUS.PENDING).length;
}

// Returns the full metric set the per-role dashboards need (FR-8).
// Demo agreements are excluded from all metrics unless includeDemo is set (NFR-3).
async function getSummary(user, { includeDemo = false } = {}) {
  const where = includeDemo ? {} : { isDemo: false };

  const agreements = await prisma.agreement.findMany({
    where,
    include: {
      teamStatuses: true,
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
        include: { clauses: { select: { outcome: true } } },
      },
    },
  });

  const now = Date.now();
  const total = agreements.length;

  // Overall split: approved (all teams approved) vs active (in progress) vs stuck (stale).
  let approvedAll = 0;
  let stuck = 0;
  let active = 0;
  let openClauses = 0;

  for (const a of agreements) {
    openClauses += openClauseCount(a);
    const overall = deriveOverallStatus(a.teamStatuses);
    if (overall === 'APPROVED') {
      approvedAll += 1;
    } else {
      const ageDays = (now - new Date(a.lastUpdatedAt).getTime()) / MS_PER_DAY;
      if (ageDays > STUCK_DAYS) stuck += 1;
      else active += 1;
    }
  }
  const pendingApproval = total - approvedAll;

  // Per-team status breakdown (all four states, incl. REJECTED).
  const perTeam = {};
  for (const team of Object.values(TEAMS)) {
    perTeam[team] = {
      [TEAM_STATUS.PENDING]: 0,
      [TEAM_STATUS.UNDER_REVIEW]: 0,
      [TEAM_STATUS.APPROVED]: 0,
      [TEAM_STATUS.REJECTED]: 0,
    };
  }
  for (const a of agreements) {
    for (const ts of a.teamStatuses) {
      if (perTeam[ts.team] && perTeam[ts.team][ts.status] !== undefined) {
        perTeam[ts.team][ts.status] += 1;
      }
    }
  }

  // Prioritized follow-up list: not-fully-approved agreements, ordered by
  // staleness then number of blocking teams then open-clause count.
  const followUps = agreements
    .map((a) => {
      const blockingTeams = a.teamStatuses
        .filter((ts) => ts.status !== TEAM_STATUS.APPROVED)
        .map((ts) => ts.team);
      const daysSinceUpdate = Math.floor((now - new Date(a.lastUpdatedAt).getTime()) / MS_PER_DAY);
      return {
        id: a.id,
        title: a.title,
        clientName: a.clientName,
        overallStatus: deriveOverallStatus(a.teamStatuses),
        blockingTeams,
        openClauses: openClauseCount(a),
        daysSinceUpdate,
      };
    })
    .filter((a) => a.blockingTeams.length > 0)
    .sort(
      (x, y) =>
        y.daysSinceUpdate - x.daysSinceUpdate ||
        y.blockingTeams.length - x.blockingTeams.length ||
        y.openClauses - x.openClauses
    );

  const avgTurnaroundDays = await computeTurnaround(where);

  return {
    role: user.role,
    cards: {
      total,
      active,
      stuck,
      pendingApproval, // Legal
      approved: approvedAll, // Legal
      openClauses,
      myTeam: perTeam[user.role] || null,
    },
    perTeam,
    avgTurnaroundDays,
    followUps,
  };
}

// Average days from agreement creation to each team's FIRST APPROVED, derived from
// the immutable STATUS_CHANGE history log (reliable — unlike team_status.updatedAt,
// which bumps on any edit). Only counts teams that actually reached APPROVED.
async function computeTurnaround(agreementWhere) {
  const events = await prisma.historyLog.findMany({
    where: { eventType: HISTORY_EVENT.STATUS_CHANGE, agreement: agreementWhere },
    select: {
      agreementId: true,
      createdAt: true,
      payload: true,
      agreement: { select: { createdAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const totals = {};
  for (const team of Object.values(TEAMS)) totals[team] = { totalDays: 0, count: 0 };

  // First approval per (agreement, team).
  const firstApproval = new Map(); // key: `${agreementId}:${team}`
  for (const e of events) {
    const p = e.payload || {};
    if (p.to !== TEAM_STATUS.APPROVED || !p.team) continue;
    const key = `${e.agreementId}:${p.team}`;
    if (firstApproval.has(key)) continue;
    firstApproval.set(key, true);
    if (!totals[p.team]) continue;
    const days = (new Date(e.createdAt) - new Date(e.agreement.createdAt)) / MS_PER_DAY;
    totals[p.team].totalDays += Math.max(0, days);
    totals[p.team].count += 1;
  }

  const avg = {};
  for (const team of Object.values(TEAMS)) {
    const t = totals[team];
    avg[team] = t.count ? +(t.totalDays / t.count).toFixed(1) : null;
  }
  return avg;
}

module.exports = { getSummary };
