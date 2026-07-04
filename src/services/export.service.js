const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const { listAgreements } = require('./agreement.service');

function flatten(agreements) {
  return agreements.map((a) => ({
    title: a.title,
    client: a.clientName,
    type: a.type,
    overallStatus: a.overallStatus,
    legal: teamStatus(a, 'LEGAL'),
    finance: teamStatus(a, 'FINANCE'),
    business: teamStatus(a, 'BUSINESS'),
    compliance: teamStatus(a, 'COMPLIANCE'),
    startDate: a.startDate ? new Date(a.startDate).toISOString().slice(0, 10) : '',
    lastUpdated: a.lastUpdatedAt ? new Date(a.lastUpdatedAt).toISOString().slice(0, 10) : '',
  }));
}

function teamStatus(a, team) {
  const t = (a.teamStatuses || []).find((ts) => ts.team === team);
  return t ? t.status : '';
}

async function exportCsv(filters) {
  const agreements = await listAgreements(filters);
  const rows = flatten(agreements);
  const parser = new Parser({
    fields: [
      'title', 'client', 'type', 'overallStatus',
      'legal', 'finance', 'business', 'compliance',
      'startDate', 'lastUpdated',
    ],
  });
  return parser.parse(rows);
}

// Streams a simple tabular PDF into the response.
async function exportPdf(filters, res) {
  const agreements = await listAgreements(filters);
  const rows = flatten(agreements);

  const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
  doc.pipe(res);

  doc.fontSize(16).text('Legal Agreement Portal - Agreement List', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#555')
    .text(`Generated ${new Date().toISOString().slice(0, 10)} - ${rows.length} agreement(s)`, {
      align: 'center',
    });
  doc.moveDown();

  doc.fillColor('#000').fontSize(9);
  rows.forEach((r, i) => {
    doc.font('Helvetica-Bold').text(`${i + 1}. ${r.title}  (${r.client})`);
    doc.font('Helvetica').text(
      `Type: ${r.type} | Overall: ${r.overallStatus} | ` +
        `Legal: ${r.legal} | Finance: ${r.finance} | Business: ${r.business} | Compliance: ${r.compliance}`
    );
    doc.text(`Start: ${r.startDate} | Last updated: ${r.lastUpdated}`);
    doc.moveDown(0.5);
  });

  doc.end();
}

module.exports = { exportCsv, exportPdf };
