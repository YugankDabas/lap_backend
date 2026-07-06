const { PrismaClient } = require('@prisma/client');

// Single shared Prisma client instance. Interactive-transaction timeouts are
// raised from the 5s default to tolerate latency to a remote (managed) database —
// createAgreement/sign-off run several statements inside one transaction.
const prisma = new PrismaClient({
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});

module.exports = prisma;
