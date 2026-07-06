const prisma = require('../config/prisma');

// Active users, for SPOC assignment dropdowns (FR-1). Never exposes password hashes.
async function listUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
}

module.exports = { listUsers };
