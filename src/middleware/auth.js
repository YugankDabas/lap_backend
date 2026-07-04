const { verifyToken } = require('../lib/jwt');
const ApiError = require('../lib/ApiError');
const prisma = require('../config/prisma');

// Verifies JWT from httpOnly cookie or Authorization: Bearer header,
// loads the user, and attaches it to req.user.
async function authenticate(req, res, next) {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) throw ApiError.unauthorized('Authentication required');

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (e) {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) throw ApiError.unauthorized('User no longer active');

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
