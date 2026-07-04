const ApiError = require('../lib/ApiError');
const { ROLES } = require('../constants');

// Guard: only the listed roles may proceed.
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(ApiError.forbidden('Your role is not permitted to perform this action'));
    }
    next();
  };
}

// Guard for team-status writes: Legal may edit any team; other roles only their own.
// Expects the target team on req.params.team.
function requireTeamOwnership(req, res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  const targetTeam = (req.params.team || '').toUpperCase();
  if (!Object.values(ROLES).includes(targetTeam)) {
    return next(ApiError.badRequest('Unknown team'));
  }
  if (req.user.role === ROLES.LEGAL) return next();
  if (req.user.role === targetTeam) return next();
  return next(ApiError.forbidden("You may only update your own team's status"));
}

module.exports = { requireRole, requireTeamOwnership };
