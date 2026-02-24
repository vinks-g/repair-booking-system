const jwt = require('jsonwebtoken');

function getTokenFromRequest(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type === "Bearer" && token) return token;

  if (req.cookies && req.cookies.token) return req.cookies.token;

  return null;
}

function wantsHtml(req) {
  const accept = req.headers.accept || "";
  return accept.includes("text/html");
}

function requireAdmin(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    // If user is visiting in a browser, redirect to login
    if (wantsHtml(req)) return res.redirect('/login');
    // If it's API (Postman/fetch), return JSON error
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== "admin") {
      if (wantsHtml(req)) return res.redirect('/login');
      return res.status(403).json({ message: "Forbidden" });
    }

    req.user = payload;
    next();
  } catch (err) {
    if (wantsHtml(req)) return res.redirect('/login');
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { requireAdmin };