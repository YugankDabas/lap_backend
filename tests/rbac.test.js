/**
 * Integration tests for the critical RBAC boundaries and the sign-off gate.
 * Runs against the configured DATABASE_URL using the seeded demo users
 * (run `npm run seed` first). Created test data is cleaned up afterwards.
 */
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

// The suite runs against a remote (managed) database; login + setup round-trips
// can exceed Jest's 5s default. Give hooks and tests generous headroom.
jest.setTimeout(60000);

const CREDS = {
  LEGAL: 'legal@demo.gyftr.com',
  FINANCE: 'finance@demo.gyftr.com',
  BUSINESS: 'business@demo.gyftr.com',
  COMPLIANCE: 'compliance@demo.gyftr.com',
};

const tokens = {};
let agreementId;

async function login(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return res.body.token;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  for (const [role, email] of Object.entries(CREDS)) {
    tokens[role] = await login(email);
    expect(tokens[role]).toBeDefined();
  }

  // Legal creates a fresh (non-demo) agreement for the write tests.
  const res = await request(app)
    .post('/api/agreements')
    .set(auth(tokens.LEGAL))
    .send({
      title: 'TEST - RBAC Suite Agreement',
      clientName: 'Test Bank',
      type: 'ENTERPRISE',
      startDate: '2026-06-01',
    });
  expect(res.status).toBe(201);
  agreementId = res.body.agreement.id;
});

afterAll(async () => {
  if (agreementId) {
    await prisma.agreement.delete({ where: { id: agreementId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('Authentication', () => {
  test('unauthenticated request is rejected (401)', async () => {
    const res = await request(app).get('/api/agreements');
    expect(res.status).toBe(401);
  });

  // Registration is Legal-only provisioning (NFR-1) — no longer public.
  test('public registration without auth is rejected (401)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'pub@test.com', password: 'password123', role: 'FINANCE' });
    expect(res.status).toBe(401);
  });

  test('non-Legal cannot provision accounts (403)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set(auth(tokens.FINANCE))
      .send({ name: 'X', email: 'byfinance@test.com', password: 'password123', role: 'FINANCE' });
    expect(res.status).toBe(403);
  });

  test('Legal register rejects duplicate email (409)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set(auth(tokens.LEGAL))
      .send({ name: 'Dup', email: CREDS.LEGAL, password: 'password123', role: 'LEGAL' });
    expect(res.status).toBe(409);
  });

  test('Legal register rejects invalid role (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set(auth(tokens.LEGAL))
      .send({ name: 'X', email: 'badrole@test.com', password: 'password123', role: 'ADMIN' });
    expect(res.status).toBe(400);
  });
});

describe('Team status RBAC (NFR-1)', () => {
  test('Finance CANNOT change Legal status (403)', async () => {
    const res = await request(app)
      .patch(`/api/agreements/${agreementId}/status/legal`)
      .set(auth(tokens.FINANCE))
      .send({ status: 'APPROVED' });
    expect(res.status).toBe(403);
  });

  test('Finance CAN change its own status (200)', async () => {
    const res = await request(app)
      .patch(`/api/agreements/${agreementId}/status/finance`)
      .set(auth(tokens.FINANCE))
      .send({ status: 'UNDER_REVIEW' });
    expect(res.status).toBe(200);
    expect(res.body.teamStatus.status).toBe('UNDER_REVIEW');
  });

  test('Legal CAN change any team status (200)', async () => {
    const res = await request(app)
      .patch(`/api/agreements/${agreementId}/status/business`)
      .set(auth(tokens.LEGAL))
      .send({ status: 'APPROVED' });
    expect(res.status).toBe(200);
  });
});

describe('Restricted actions', () => {
  test('Finance CANNOT create an agreement (403)', async () => {
    const res = await request(app)
      .post('/api/agreements')
      .set(auth(tokens.FINANCE))
      .send({ title: 'x', clientName: 'y', type: 'ENTERPRISE', startDate: '2026-01-01' });
    expect(res.status).toBe(403);
  });

  test('Finance CANNOT send a reminder (403)', async () => {
    const res = await request(app)
      .post(`/api/agreements/${agreementId}/reminders`)
      .set(auth(tokens.FINANCE))
      .send({ targetTeam: 'LEGAL', message: 'x' });
    expect(res.status).toBe(403);
  });

  test('Legal CAN send a reminder; target team sees it (200)', async () => {
    const send = await request(app)
      .post(`/api/agreements/${agreementId}/reminders`)
      .set(auth(tokens.LEGAL))
      .send({ targetTeam: 'COMPLIANCE', message: 'Please review' });
    expect(send.status).toBe(201);

    const pending = await request(app).get('/api/reminders/pending').set(auth(tokens.COMPLIANCE));
    expect(pending.status).toBe(200);
    expect(pending.body.reminders.some((r) => r.agreement.id === agreementId)).toBe(true);
  });

  test('Only Compliance can raise a compliance query (403 for Finance)', async () => {
    const bad = await request(app)
      .post(`/api/agreements/${agreementId}/compliance-queries`)
      .set(auth(tokens.FINANCE))
      .send({ queryText: 'x' });
    expect(bad.status).toBe(403);

    const ok = await request(app)
      .post(`/api/agreements/${agreementId}/compliance-queries`)
      .set(auth(tokens.COMPLIANCE))
      .send({ queryText: 'Is this compliant?' });
    expect(ok.status).toBe(201);
  });

  test('Business cannot view compliance queries (403); Legal can (200)', async () => {
    const biz = await request(app)
      .get(`/api/agreements/${agreementId}/compliance-queries`)
      .set(auth(tokens.BUSINESS));
    expect(biz.status).toBe(403);

    const legal = await request(app)
      .get(`/api/agreements/${agreementId}/compliance-queries`)
      .set(auth(tokens.LEGAL));
    expect(legal.status).toBe(200);
  });

  test('Finance CANNOT edit clause outcomes (403)', async () => {
    // Add a version with a clause first (Legal).
    const v = await request(app)
      .post(`/api/agreements/${agreementId}/versions`)
      .set(auth(tokens.LEGAL))
      .send({ clauses: [{ title: 'C1', bodyText: 'text', clauseKey: 'c1' }] });
    const clauseId = v.body.version.clauses[0].id;

    const res = await request(app)
      .patch(`/api/clauses/${clauseId}`)
      .set(auth(tokens.FINANCE))
      .send({ outcome: 'ACCEPTED' });
    expect(res.status).toBe(403);
  });
});

describe('Sign-off (FR-7 / plan §18)', () => {
  test('Compliance CANNOT sign (403)', async () => {
    const res = await request(app)
      .post(`/api/agreements/${agreementId}/signoff`)
      .set(auth(tokens.COMPLIANCE));
    expect(res.status).toBe(403);
  });

  test('Sign-off is BLOCKED while clauses are unresolved (400)', async () => {
    const res = await request(app)
      .post(`/api/agreements/${agreementId}/signoff`)
      .set(auth(tokens.LEGAL));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PENDING/);
  });

  test('Legal + Business can sign once all clauses resolved; double-sign blocked', async () => {
    // Resolve all clauses in the latest version.
    const versions = await request(app)
      .get(`/api/agreements/${agreementId}/versions`)
      .set(auth(tokens.LEGAL));
    const latest = versions.body.versions[versions.body.versions.length - 1];
    for (const c of latest.clauses) {
      await request(app)
        .patch(`/api/clauses/${c.id}`)
        .set(auth(tokens.LEGAL))
        .send({ outcome: 'ACCEPTED' });
    }

    const legalSign = await request(app)
      .post(`/api/agreements/${agreementId}/signoff`)
      .set(auth(tokens.LEGAL));
    expect(legalSign.status).toBe(201);

    const bizSign = await request(app)
      .post(`/api/agreements/${agreementId}/signoff`)
      .set(auth(tokens.BUSINESS));
    expect(bizSign.status).toBe(201);

    // Legal's own circle flipped to APPROVED after signing.
    const detail = await request(app)
      .get(`/api/agreements/${agreementId}`)
      .set(auth(tokens.LEGAL));
    const legalStatus = detail.body.agreement.teamStatuses.find((t) => t.team === 'LEGAL');
    expect(legalStatus.status).toBe('APPROVED');

    // Double-sign blocked (409).
    const dup = await request(app)
      .post(`/api/agreements/${agreementId}/signoff`)
      .set(auth(tokens.LEGAL));
    expect(dup.status).toBe(409);
  });
});

describe('Audit trail (NFR-2)', () => {
  test('mutations produce history entries', async () => {
    const res = await request(app)
      .get(`/api/agreements/${agreementId}/history`)
      .set(auth(tokens.LEGAL));
    expect(res.status).toBe(200);
    const types = res.body.history.map((h) => h.eventType);
    expect(types).toContain('AGREEMENT_CREATED');
    expect(types).toContain('STATUS_CHANGE');
    expect(types).toContain('SIGN_OFF');
  });
});
