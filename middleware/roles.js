function requireTechnician(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (req.user.role !== "technician") {
    return res.status(403).json({ message: "Technician access only" });
  }

  next();
}

function requireTechnicianOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (req.user.role === "technician" || req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({ message: "Forbidden" });
}

module.exports = {
  requireTechnician,
  requireTechnicianOrAdmin
};