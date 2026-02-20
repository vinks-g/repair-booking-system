// server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Homepage -> serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// (Optional) simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Connect DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log('MongoDB connection error:', err.message));

// Port for Render (and local fallback)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



/*const adminRoutes = require('./routes/adminRoutes');

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
*/