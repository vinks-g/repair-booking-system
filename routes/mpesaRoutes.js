const { initiateStkPush } = require('../services/mpesaService');

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

// M-Pesa callback
router.post('/callback', async (req, res) => {
  try {
    console.log("M-Pesa Callback Received:");
    console.log(JSON.stringify(req.body, null, 2));

    const callback = req.body.Body.stkCallback;
    const checkoutRequestId = callback.CheckoutRequestID;

    const booking = await Booking.findOne({ checkoutRequestId });

    if (!booking) {
      console.log("⚠️ No booking found for CheckoutRequestID:", checkoutRequestId);
      return res.json({ message: "Callback received, but booking not found" });
    }

    if (callback.ResultCode === 0) {
      // SUCCESS
      const metadata = callback.CallbackMetadata?.Item || [];

      const amount = metadata.find(i => i.Name === "Amount")?.Value || 0;
      const mpesaCode = metadata.find(i => i.Name === "MpesaReceiptNumber")?.Value || "";
      const phone = metadata.find(i => i.Name === "PhoneNumber")?.Value || "";

      booking.paymentStatus = "Paid";
      booking.paymentAmount = amount;
      booking.mpesaReceiptNumber = mpesaCode;

      await booking.save();

      console.log("✅ PAYMENT SUCCESS");
      console.log({ amount, mpesaCode, phone });
    } else {
      // FAILED
      booking.paymentStatus = "Failed";
      await booking.save();

      console.log("❌ PAYMENT FAILED:", callback.ResultDesc);
    }

    res.json({ message: "Callback received" });

  } catch (error) {
    console.error("Callback error:", error);
    res.status(500).json({ message: "Error handling callback" });
  }
});

// Customer Pay Now
router.post('/customer-pay', async (req, res) => {
  try {
    const { ref, phone } = req.body;

    if (!ref || !phone) {
      return res.status(400).json({ message: "ref and phone are required" });
    }

    const normalizedRef = String(ref).trim().toUpperCase();
    const normalizedPhone = String(phone).trim();

    const bookings = await Booking.find({ phone: normalizedPhone }).sort({ createdAt: -1 });

    const booking = bookings.find(
      b => String(b._id).slice(-6).toUpperCase() === normalizedRef
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const amount = Number(booking.paymentRequestedAmount || 0);
    if (!amount || amount < 1) {
      return res.status(400).json({ message: "No valid payment amount has been set for this booking" });
    }

    const response = await initiateStkPush({
      phone: normalizedPhone,
      amount,
      accountReference: normalizedRef,
      transactionDesc: `${booking.paymentType || "Repair payment"} for ${normalizedRef}`
    });

    const updatedBooking = await Booking.findByIdAndUpdate(
      booking._id,
      {
        checkoutRequestId: response.CheckoutRequestID || "",
        paymentStatus: "Pending"
      },
      { new: true }
    );

    res.json({
      message: "M-Pesa prompt sent successfully",
      response,
      booking: updatedBooking
    });
  } catch (error) {
    console.log("Customer pay error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Failed to initiate customer payment",
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;