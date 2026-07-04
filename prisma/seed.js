/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ROLES = ['LEGAL', 'FINANCE', 'BUSINESS', 'COMPLIANCE'];
const TEAMS = ROLES;

async function main() {
  console.log('Seeding demo data...');

  // Idempotent: remove prior demo agreements (cascades to children).
  await prisma.agreement.deleteMany({ where: { isDemo: true } });

  const passwordHash = await bcrypt.hash('password123', 10);

  // Baseline users - one per role. upsert so re-seeding keeps the same accounts.
  const users = {};
  for (const role of ROLES) {
    const email = `${role.toLowerCase()}@demo.gyftr.com`;
    users[role] = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${role[0]}${role.slice(1).toLowerCase()} User`,
        email,
        passwordHash,
        role,
      },
    });
  }
  console.log('Users (password for all: password123):');
  ROLES.forEach((r) => console.log(`  ${r}: ${users[r].email}`));

  const legal = users.LEGAL;

  // Demo agreement 1: HDFC Bank, mid-negotiation with two draft versions.
  const a1 = await prisma.agreement.create({
    data: {
      title: 'HDFC Bank - API/Direct Integration Agreement',
      clientName: 'HDFC Bank',
      type: 'API_DIRECT',
      startDate: new Date('2026-05-01'),
      isDemo: true,
      createdById: legal.id,
      teamStatuses: {
        create: [
          { team: 'LEGAL', status: 'UNDER_REVIEW', updatedById: legal.id },
          { team: 'FINANCE', status: 'UNDER_REVIEW', updatedById: users.FINANCE.id },
          { team: 'BUSINESS', status: 'PENDING' },
          { team: 'COMPLIANCE', status: 'PENDING' },
        ],
      },
    },
  });

  const v1 = await prisma.documentVersion.create({
    data: {
      agreementId: a1.id,
      versionLabel: 'D1',
      versionNumber: 1,
      createdById: legal.id,
      clauses: {
        create: [
          {
            clauseKey: 'payment-terms',
            title: 'Payment Terms',
            bodyText: 'Settlement shall occur within 30 days of invoice.',
            outcome: 'HELD',
            orderIndex: 0,
          },
          {
            clauseKey: 'liability',
            title: 'Limitation of Liability',
            bodyText: 'Liability capped at total fees paid in the preceding 6 months.',
            outcome: 'PENDING',
            orderIndex: 1,
          },
          {
            clauseKey: 'termination',
            title: 'Termination',
            bodyText: 'Either party may terminate with 60 days written notice.',
            outcome: 'ACCEPTED',
            orderIndex: 2,
          },
        ],
      },
    },
  });

  await prisma.documentVersion.create({
    data: {
      agreementId: a1.id,
      versionLabel: 'D2',
      versionNumber: 2,
      createdById: legal.id,
      clauses: {
        create: [
          {
            clauseKey: 'payment-terms',
            title: 'Payment Terms',
            bodyText: 'Settlement shall occur within 45 days of invoice receipt.',
            outcome: 'PARTIAL',
            orderIndex: 0,
          },
          {
            clauseKey: 'liability',
            title: 'Limitation of Liability',
            bodyText: 'Liability capped at total fees paid in the preceding 12 months.',
            outcome: 'PENDING',
            orderIndex: 1,
          },
          {
            clauseKey: 'termination',
            title: 'Termination',
            bodyText: 'Either party may terminate with 60 days written notice.',
            outcome: 'ACCEPTED',
            orderIndex: 2,
          },
          {
            clauseKey: 'data-privacy',
            title: 'Data Privacy',
            bodyText: 'Both parties shall comply with applicable data protection laws.',
            outcome: 'PENDING',
            orderIndex: 3,
          },
        ],
      },
    },
  });

  await prisma.remark.create({
    data: {
      agreementId: a1.id,
      authorId: users.FINANCE.id,
      authorRole: 'FINANCE',
      body: 'Requesting 45-day settlement window to match treasury cycle.',
    },
  });

  await prisma.reminder.create({
    data: {
      agreementId: a1.id,
      senderId: legal.id,
      targetTeam: 'COMPLIANCE',
      message: 'Please complete your regulatory review of the HDFC draft.',
    },
  });

  await prisma.complianceQuery.create({
    data: {
      agreementId: a1.id,
      raisedById: users.COMPLIANCE.id,
      raisedByName: users.COMPLIANCE.name,
      queryText: 'Does the data-privacy clause cover cross-border data transfer?',
    },
  });

  await prisma.historyLog.create({
    data: {
      agreementId: a1.id,
      actorId: legal.id,
      actorRole: 'LEGAL',
      eventType: 'AGREEMENT_CREATED',
      payload: { title: a1.title },
    },
  });

  // Demo agreement 2: RBL Bank, White Label, fully approved.
  const a2 = await prisma.agreement.create({
    data: {
      title: 'RBL Bank - White Label Gift Card Program',
      clientName: 'RBL Bank',
      type: 'WHITE_LABEL',
      startDate: new Date('2026-03-15'),
      isDemo: true,
      createdById: legal.id,
      teamStatuses: {
        create: TEAMS.map((team) => ({
          team,
          status: 'APPROVED',
          updatedById: users[team].id,
        })),
      },
    },
  });

  await prisma.documentVersion.create({
    data: {
      agreementId: a2.id,
      versionLabel: 'D1',
      versionNumber: 1,
      createdById: legal.id,
      clauses: {
        create: [
          {
            clauseKey: 'scope',
            title: 'Scope of Services',
            bodyText: 'GyFTR provides white-labelled gift card issuance.',
            outcome: 'ACCEPTED',
            orderIndex: 0,
          },
          {
            clauseKey: 'fees',
            title: 'Fees',
            bodyText: 'Platform fee of 2% per transaction.',
            outcome: 'ACCEPTED',
            orderIndex: 1,
          },
        ],
      },
    },
  });

  console.log('Seed complete: 2 demo agreements created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
