const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { requireAdmin } = require('../middleware/auth');
const { sendSms } = require('../services/smsService');

// ✅ Single Admin (for now)
const adminUser = {
  username: "admin",
  passwordHash: bcrypt.hashSync("admin123", 10),
};

// ✅ Admin Login (NO middleware here)
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

    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
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