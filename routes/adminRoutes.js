const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const { requireAdmin } = require('../middleware/auth');
const { sendSms } = require('../services/smsService');

// ✅ Rate limit login to prevent brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  message: { message: "Too many login attempts. Try again later." }
});

// ✅ Admin Login (uses env credentials, sets httpOnly cookie)
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return res.status(500).json({ message: "Admin credentials not configured" });
    }

    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { username: adminUsername, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Store token in secure httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Admin Logout (clears cookie)
router.post('/logout', (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  res.json({ message: "Logged out" });
});

// ✅ Check if logged in
router.get('/me', requireAdmin, (req, res) => {
  res.json({ authenticated: true, user: req.user });
});

// ✅ Test SMS (Protected)
router.post('/test-sms', requireAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: "Missing 'to' phone number" });

    const response = await sendSms(to, "Test SMS: your repair system is connected ✅");
    res.json({ message: "Sent", response });
  } catch (error) {
    const atError =
      error?.response?.data || error?.response || error?.message || String(error);

    res.status(500).json({ message: "Failed", error: atError });
  }
});

module.exports = router;