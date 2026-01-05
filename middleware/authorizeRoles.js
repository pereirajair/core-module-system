const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(401).json({ message: 'Unauthorized: User or roles not found in token' });
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));

    if (hasRole) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions' });
    }
  };
};

module.exports = authorizeRoles;
