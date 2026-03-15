// Middleware compartido para rutas protegidas

// Solo admin
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Usuario autenticado
const authRequired = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
};

module.exports = { adminOnly, authRequired };