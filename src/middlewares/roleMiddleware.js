function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = req.user.roles || [];

    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        required: allowedRoles,
        current: userRoles
      });
    }

    next();
  };
}

module.exports = { requireRole };
