// Shared enums & constants. Mirrored on the frontend (lap_frontend/src/constants).

const ROLES = {
  LEGAL: 'LEGAL',
  FINANCE: 'FINANCE',
  BUSINESS: 'BUSINESS',
  COMPLIANCE: 'COMPLIANCE',
};

const TEAMS = { ...ROLES }; // teams map 1:1 to roles

const AGREEMENT_TYPES = {
  API_DIRECT: 'API_DIRECT',
  WHITE_LABEL: 'WHITE_LABEL',
  RESELLER: 'RESELLER',
  ENTERPRISE: 'ENTERPRISE',
};

// Four-state review circle per BRD FR-2.
const TEAM_STATUS = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const CLAUSE_OUTCOME = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  HELD: 'HELD',
  PARTIAL: 'PARTIAL',
};

const HISTORY_EVENT = {
  STATUS_CHANGE: 'STATUS_CHANGE',
  REMARK_ADDED: 'REMARK_ADDED',
  REMINDER_SENT: 'REMINDER_SENT',
  SIGN_OFF: 'SIGN_OFF',
  VERSION_ADDED: 'VERSION_ADDED',
  CLAUSE_OUTCOME_CHANGED: 'CLAUSE_OUTCOME_CHANGED',
  AGREEMENT_CREATED: 'AGREEMENT_CREATED',
  AGREEMENT_UPDATED: 'AGREEMENT_UPDATED',
  COMPLIANCE_QUERY_RAISED: 'COMPLIANCE_QUERY_RAISED',
};

// Roles allowed to record a digital signature (plan §18).
const SIGNING_ROLES = [ROLES.LEGAL, ROLES.BUSINESS];

// A clause is considered "resolved" when its outcome is not PENDING (plan §14 item 3).
const RESOLVED_CLAUSE_OUTCOMES = [
  CLAUSE_OUTCOME.ACCEPTED,
  CLAUSE_OUTCOME.HELD,
  CLAUSE_OUTCOME.PARTIAL,
];

const SIGN_DISCLAIMER_VERSION = 'v1';
const SIGN_DISCLAIMER_TEXT =
  'This digital sign-off is an internal tracking record confirming review completion. ' +
  'It does not by itself constitute formal legal execution of the agreement.';

module.exports = {
  ROLES,
  TEAMS,
  AGREEMENT_TYPES,
  TEAM_STATUS,
  CLAUSE_OUTCOME,
  HISTORY_EVENT,
  SIGNING_ROLES,
  RESOLVED_CLAUSE_OUTCOMES,
  SIGN_DISCLAIMER_VERSION,
  SIGN_DISCLAIMER_TEXT,
};
