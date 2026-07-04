const prisma = require('../config/prisma');
const { TEAMS, TEAM_STATUS } = require('../constants');
const { deriveOverallStatus } = require('./agreement.service');

// Returns the full metric set the per-role dashboards need (plan §8.2).
// The client picks the cards relevant to its role.
async function getSummary(user) {
  const agreements = await prisma.agreement.findMany({
    include: { teamStatuses: true },
  });

  const total = agreements.length;

  // Overall (Legal cards): pending-approval = not all four teams approved.
  let approvedAll = 0;
  let pendingApproval = 0;
  for (const a of agreements) {
    const overall = deriveOverallStatus(a.teamStatuses);
    if (overall === 'APPROVED') approvedAll += 1;
    else pendingApproval += 1;
  }

  // Per-team status breakdown (Finance/Business/Compliance cards use their own team).
  const perTeam = {};
  for (const team of Object.values(TEAMS)) {
    perTeam[team] = {
      [TEAM_STATUS.PENDING]: 0,
      [TEAM_STATUS.UNDER_REVIEW]: 0,
      [TEAM_STATUS.APPROVED]: 0,
    };
  }
  for (const a of agreements) {
    for (const ts of a.teamStatuses) {
      if (perTeam[ts.team]) perTeam[ts.team][ts.status] += 1;
    }
  }

  // Bottleneck list: agreements not fully approved, with which teams are blocking.
  const bottlenecks = agreements
    .map((a) => {
      const blocking = a.teamStatuses
        .filter((ts) => ts.status !== TEAM_STATUS.APPROVED)
        .map((ts) => ts.team);
      return { id: a.id, title: a.title, clientName: a.clientName, blockingTeams: blocking };
    })
    .filter((a) => a.blockingTeams.length > 0);

  // Approximate avg turnaround per team (days from agreement creation to the team
  // reaching APPROVED, using team_status.updatedAt). Impl approximation - plan §14 item 1.
  const turnaround = {};
  for (const team of Object.values(TEAMS)) turnaround[team] = { totalDays: 0, count: 0 };
  for (const a of agreements) {
    for (const ts of a.teamStatuses) {
      if (ts.status === TEAM_STATUS.APPROVED && turnaround[ts.team]) {
        const days = (new Date(ts.updatedAt) - new Date(a.createdAt)) / (1000 * 60 * 60 * 24);
        turnaround[ts.team].totalDays += Math.max(0, days);
        turnaround[ts.team].count += 1;
      }
    }
  }
  const avgTurnaroundDays = {};
  for (const team of Object.values(TEAMS)) {
    const t = turnaround[team];
    avgTurnaroundDays[team] = t.count ? +(t.totalDays / t.count).toFixed(1) : null;
  }

  return {
    role: user.role,
    cards: {
      total,
      pendingApproval, // Legal
      approved: approvedAll, // Legal
      myTeam: perTeam[user.role] || null, // own-team pending/under_review/approved
    },
    perTeam,
    bottlenecks,
    avgTurnaroundDays,
  };
}

module.exports = { getSummary };
