const { requireAdmin } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { sendSms } = require('../services/smsService');
const { companyName } = require('../config/brand');


// ✅ CREATE booking + send confirmation SMS
router.post('/', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();

    // Confirmation SMS (fire-and-forget)
    const ref = String(booking._id).slice(-6).toUpperCase();
    const dateStr = new Date(booking.bookingDate).toDateString();

    const msg = `Hi ${booking.name}, ${companyName} confirms your repair booking ✅ Ref: ${ref}. Device: ${booking.deviceType}. Date: ${dateStr}. We’ll update you once work starts.`;


    sendSms(booking.phone, msg).catch(err => {
      console.log("Confirmation SMS failed:", err.message);
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ GET all bookings
router.get('/', requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ UPDATE booking (status/technician) + send status SMS
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { status, technician, priceRange } = req.body;

    const existingBooking = await Booking.findById(req.params.id);
    if (!existingBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const updatePayload = {};
    if (status) updatePayload.status = status;
    if (technician) updatePayload.technician = technician;
    if (priceRange) updatePayload.priceRange = priceRange;

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    );

    const notifyStatuses = new Set(["In Progress", "Completed", "Cancelled"]);

    if (status && status !== existingBooking.status && notifyStatuses.has(status)) {
      let smsMsg = "";

      if (status === "In Progress") {
        smsMsg = `Hi ${updatedBooking.name}, your ${updatedBooking.deviceType} repair is now in progress. Technician: ${updatedBooking.technician || "Assigned soon"}. - ${companyName}`;

      } else if (status === "Completed") {
        smsMsg = `Hi ${updatedBooking.name}, your ${updatedBooking.deviceType} repair is completed ✅. You can now come for pickup. Thank you! - ${companyName}`;

      } else if (status === "Cancelled") {
        smsMsg = `Hi ${updatedBooking.name}, your repair booking for ${updatedBooking.deviceType} has been cancelled. Reply or call if you'd like to reschedule. - ${companyName}`;

      }

      sendSms(updatedBooking.phone, smsMsg).catch(err => {
        console.log("SMS failed:", err.message);
      });
    }

    res.json(updatedBooking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// ✅ Public: Lookup booking by Ref (last 6 of _id) + phone
router.post('/lookup', async (req, res) => {
  try {
    const { ref, phone } = req.body;

    if (!ref || !phone) {
      return res.status(400).json({ message: "ref and phone are required" });
    }

    const normalizedRef = String(ref).trim().toUpperCase();
    const normalizedPhone = String(phone).trim();

    // Find bookings and match by last 6 chars of _id
    const bookings = await Booking.find({ phone: normalizedPhone }).sort({ createdAt: -1 });

    const match = bookings.find(b => String(b._id).slice(-6).toUpperCase() === normalizedRef);

    if (!match) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Return only safe fields (no internal stuff)
    return res.json({
      ref: String(match._id).slice(-6).toUpperCase(),
      name: match.name,
      deviceType: match.deviceType,
      serviceType: match.serviceType,
      pickupOption: match.pickupOption,
      locationNotes: match.locationNotes,
      priceRange: match.priceRange,
      status: match.status,
      technician: match.technician || "Unassigned",
      createdAt: match.createdAt,
      updatedAt: match.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
