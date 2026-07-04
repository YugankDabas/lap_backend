const prisma = require('../config/prisma');
const ApiError = require('../lib/ApiError');
const { hashPassword, verifyPassword } = require('../lib/password');
const { signToken } = require('../lib/jwt');

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function register({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });
  return publicUser(user);
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  const token = signToken({ userId: user.id, role: user.role });
  return { token, user: publicUser(user) };
}

module.exports = { register, login, publicUser };
