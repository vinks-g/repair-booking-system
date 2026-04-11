
const { getMpesaAccessToken, initiateStkPush, queryStkPush } = require('../services/mpesaService');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendSms } = require('../services/smsService');

// Rate limit login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Try again later." }
});

// Build users from env
function getUsers() {
  return [
    {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
      name: "Administrator"
    },
    {
      username: process.env.TECH1_USERNAME,
      password: process.env.TECH1_PASSWORD,
      role: "technician",
      name: process.env.TECH1_NAME
    },
    {
      username: process.env.TECH2_USERNAME,
      password: process.env.TECH2_PASSWORD,
      role: "technician",
      name: process.env.TECH2_NAME
    },
    {
      username: process.env.TECH3_USERNAME,
      password: process.env.TECH3_PASSWORD,
      role: "technician",
      name: process.env.TECH3_NAME
    }
  ].filter(user => user.username && user.password);
}

// Login for admin + technicians
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    const users = getUsers();
    const matchedUser = users.find(
      user => user.username === username && user.password === password
    );

    if (!matchedUser) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        username: matchedUser.username,
        role: matchedUser.role,
        name: matchedUser.name
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: "Login successful",
      role: matchedUser.role,
      name: matchedUser.name
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  res.json({ message: "Logged out" });
});

// Current logged-in user
router.get('/me', (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      authenticated: true,
      user: payload
    });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// Test SMS (admin only)
router.post('/test-sms', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ message: "Missing 'to' phone number" });
    }

    const response = await sendSms(to, "Test SMS: your repair system is connected ✅");
    res.json({ message: "Sent", response });
  } catch (error) {
    const atError =
      error?.response?.data || error?.response || error?.message || String(error);

    res.status(500).json({ message: "Failed", error: atError });
  }
});

router.get('/debug-users', (req, res) => {
  const users = getUsers().map(user => ({
    username: user.username,
    role: user.role,
    name: user.name
  }));

  res.json(users);
});

//temp
router.get('/debug-tech1', (req, res) => {
  res.json({
    TECH1_USERNAME: process.env.TECH1_USERNAME || null,
    TECH1_PASSWORD_EXISTS: !!process.env.TECH1_PASSWORD,
    TECH1_PASSWORD_LENGTH: process.env.TECH1_PASSWORD ? process.env.TECH1_PASSWORD.length : 0,
    TECH1_NAME: process.env.TECH1_NAME || null
  });
});

router.get('/mpesa/token', requireAuth, requireAdmin, async (req, res) => {
  try {
    const token = await getMpesaAccessToken();
    res.json({ message: "Token generated", token });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate token",
      error: error.response?.data || error.message
    });
  }
});

const Booking = require('../models/Booking');

router.post('/mpesa/stk-push', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { phone, amount, ref, paymentType } = req.body;

    if (!phone || !amount || !ref) {
      return res.status(400).json({ message: "phone, amount and ref are required" });
    }

    // Find booking by ref (last 6 chars of _id)
    const bookings = await Booking.find().sort({ createdAt: -1 });
    const booking = bookings.find(
      b => String(b._id).slice(-6).toUpperCase() === String(ref).trim().toUpperCase()
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found for this ref" });
    }

    const response = await initiateStkPush({
        phone,
        amount,
        accountReference: ref,
        transactionDesc: `${paymentType || "Repair payment"} for ${ref}`
      });
    // Save checkout request id + amount on booking
    booking.checkoutRequestId = response.CheckoutRequestID || "";
    booking.paymentAmount = Number(amount);
    booking.paymentStatus = "Pending";
    await booking.save();

    res.json({
      message: "STK Push initiated",
      response
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to initiate STK Push",
      error: error.response?.data || error.message
    });
  }
});

router.post('/mpesa/query', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { checkoutRequestId } = req.body;

    if (!checkoutRequestId) {
      return res.status(400).json({ message: "checkoutRequestId is required" });
    }

    const response = await queryStkPush(checkoutRequestId);

    res.json({
      message: "STK query complete",
      response
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to query STK status",
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;