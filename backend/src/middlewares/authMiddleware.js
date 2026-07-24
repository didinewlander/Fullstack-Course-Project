const jwt = require('jsonwebtoken');

const parseRole = (role = '') => String(role).toLowerCase().replace(/[\s_-]/g, '');

const roleAliases = {
  admin: ['admin', 'manager', 'logisticsmanager', 'logistics'],
  supplier: ['supplier'],
  vendor: ['vendor', 'wholesaler'],
};

const normalizeRole = (role) => {
  const parsedRole = parseRole(role);

  for (const [canonicalRole, aliases] of Object.entries(roleAliases)) {
    if (aliases.includes(parsedRole)) {
      return canonicalRole;
    }
  }

  return parsedRole;
};

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id || decoded._id || decoded.userId,
      role: normalizeRole(decoded.role),
    };

    if (!req.user.id || !req.user.role) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const authorize = (...allowedRoles) => {
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user || !normalizedAllowedRoles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };
};

module.exports = {
  protect,
  authorize,
  normalizeRole,
};
