const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    deviceType: {
        type: String,
        required: true
    },
    issueDescription: {
        type: String,
        required: true
    },
    serviceType: {
        type: String,
        required: true
    },
    priceRange: {
        type: String,
        default: "Not set"
    },
    pickupOption: {
        type: String,
        default: "Walk-in"
    },
    locationNotes: {
        type: String,
        default: ""
    },

    bookingDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        default: "Pending"
    },
    technician: {
    type: String,
    default: "Unassigned"
    },


    paymentStatus: {
        type: String,
        default: "Unpaid"
    },
    paymentAmount: {
        type: Number,
        default: 0
    },

    paymentType: {
        type: String,
        default: "Deposit"
    },

    checkoutRequestId: {
        type: String,
        default: ""
    },
    mpesaReceiptNumber: {
        type: String,
        default: ""
    },

    paymentRequestedAmount: {
        type: Number,
        default: 0
    },

     
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
