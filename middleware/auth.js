const jwt = require('jsonwebtoken');

function getTokenFromRequest(req) {
  // 1) Try Authorization header: "Bearer <token>"
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type === "Bearer" && token) return token;

  // 2) Try cookie: token=<token>
  if (req.cookies && req.cookies.token) return req.cookies.token;

  return null;
}

function requireAdmin(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

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