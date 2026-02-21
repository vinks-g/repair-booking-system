const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // simple role check
    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { requireAdmin };