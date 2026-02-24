const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { requireAdmin } = require('../middleware/auth');
const { sendSms } = require('../services/smsService');

// Single Admin (for now)
const adminUser = {
  username: "admin",
  passwordHash: bcrypt.hashSync("admin123", 10),
};

// Admin Login (sets httpOnly cookie)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username !== adminUser.username) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, adminUser.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { username: adminUser.username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Store token in secure httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Admin Logout (clears cookie)
router.post('/logout', (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Logged out" });
});

// Optional: check if logged in (useful for frontend)
router.get('/me', requireAdmin, (req, res) => {
  res.json({ authenticated: true, user: req.user });
});

// Test SMS (Protected)
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