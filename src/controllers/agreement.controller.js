const asyncHandler = require('../lib/asyncHandler');
const agreementService = require('../services/agreement.service');
const teamStatusService = require('../services/teamStatus.service');
const remarkService = require('../services/remark.service');
const versionService = require('../services/version.service');
const reminderService = require('../services/reminder.service');
const complianceService = require('../services/complianceQuery.service');
const signoffService = require('../services/signoff.service');
const exportService = require('../services/export.service');

function parseBool(v) {
  if (v === undefined) return undefined;
  return v === 'true' || v === true;
}

const list = asyncHandler(async (req, res) => {
  const { search, type, status, myStatus, isDemo } = req.query;
  const agreements = await agreementService.listAgreements({
    search,
    type,
    status,
    myStatus,
    myTeam: myStatus ? req.user.role : undefined,
    isDemo: parseBool(isDemo),
  });
  res.json({ agreements });
});

const getOne = asyncHandler(async (req, res) => {
  const agreement = await agreementService.getAgreementById(req.params.id);
  res.json({ agreement });
});

const create = asyncHandler(async (req, res) => {
  const agreement = await agreementService.createAgreement(req.user, req.body);
  res.status(201).json({ agreement });
});

const update = asyncHandler(async (req, res) => {
  const agreement = await agreementService.updateAgreement(req.user, req.params.id, req.body);
  res.json({ agreement });
});

const setStatus = asyncHandler(async (req, res) => {
  const team = req.params.team.toUpperCase();
  const teamStatus = await teamStatusService.setTeamStatus(
    req.user,
    req.params.id,
    team,
    req.body
  );
  res.json({ teamStatus });
});

// Remarks & history
const listRemarks = asyncHandler(async (req, res) => {
  res.json({ remarks: await remarkService.listRemarks(req.params.id) });
});
const addRemark = asyncHandler(async (req, res) => {
  res.status(201).json({ remark: await remarkService.addRemark(req.user, req.params.id, req.body) });
});
const listHistory = asyncHandler(async (req, res) => {
  res.json({ history: await remarkService.listHistory(req.params.id) });
});

// Versions & compare
const listVersions = asyncHandler(async (req, res) => {
  res.json({ versions: await versionService.listVersions(req.params.id) });
});
const createVersion = asyncHandler(async (req, res) => {
  res.status(201).json({
    version: await versionService.createVersion(req.user, req.params.id, req.body),
  });
});
const compare = asyncHandler(async (req, res) => {
  const from = parseInt(req.query.from, 10);
  const to = parseInt(req.query.to, 10);
  res.json({ comparison: await versionService.compareVersions(req.params.id, from, to) });
});

// Reminders
const sendReminder = asyncHandler(async (req, res) => {
  res.status(201).json({
    reminder: await reminderService.sendReminder(req.user, req.params.id, req.body),
  });
});

// Compliance queries
const raiseQuery = asyncHandler(async (req, res) => {
  res.status(201).json({
    query: await complianceService.raiseQuery(req.user, req.params.id, req.body),
  });
});
const listQueries = asyncHandler(async (req, res) => {
  res.json({ queries: await complianceService.listQueries(req.params.id) });
});

// Sign-off
const sign = asyncHandler(async (req, res) => {
  res.status(201).json({ signoff: await signoffService.signAgreement(req.user, req.params.id) });
});

// Export (must be defined before /:id route in the router)
const exportList = asyncHandler(async (req, res) => {
  const { search, type, status, myStatus, isDemo, format } = req.query;
  const filters = {
    search,
    type,
    status,
    myStatus,
    myTeam: myStatus ? req.user.role : undefined,
    isDemo: parseBool(isDemo),
  };
  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="agreements.pdf"');
    return exportService.exportPdf(filters, res);
  }
  const csv = await exportService.exportCsv(filters);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="agreements.csv"');
  res.send(csv);
});

module.exports = {
  list,
  getOne,
  create,
  update,
  setStatus,
  listRemarks,
  addRemark,
  listHistory,
  listVersions,
  createVersion,
  compare,
  sendReminder,
  raiseQuery,
  listQueries,
  sign,
  exportList,
};
