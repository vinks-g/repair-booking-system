const adminRoutes = require('./routes/adminRoutes');

require('dotenv').config();
console.log("AT_USERNAME:", process.env.AT_USERNAME);
console.log("AT_API_KEY loaded:", !!process.env.AT_API_KEY);

const Booking = require('./models/Booking');
const express = require('express');
const mongoose = require('mongoose');


const app = express();
app.use(express.json());
app.use(express.static('public'));
const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);






mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('Server is running');
});
// Simple Admin (for now)



const PORT = process.env.PORT || 5000;






app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
