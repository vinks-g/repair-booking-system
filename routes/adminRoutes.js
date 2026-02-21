const jwt = require('jsonwebtoken');
const { sendSms } = require('../services/smsService');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Simple Admin (for now)
const adminUser = {
    username: "admin",
    passwordHash: bcrypt.hashSync("admin123", 10)
};

// Admin Login
router.post('/login', async (req, res) => {
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
});
    /*router.post('/test-sms', async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: "Missing 'to' phone number" });

    const response = await sendSms(to, "Test SMS: your repair system is connected to Africa's Talking ✅");
    res.json({ message: "Sent", response });
  } catch (error) {
    res.status(500).json({ message: "Failed", error: error.message });
  }
});*/
router.post('/test-sms', async (req, res) => {
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
