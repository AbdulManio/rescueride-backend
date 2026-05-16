const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const initSocket = require('./src/config/socket');
const { initFirebase } = require('./src/config/firebase');

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

// Init Firebase
initFirebase();

const app = express();
const server = http.createServer(app);

// Init Socket.io
const io = initSocket(server);

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',          require('./src/routes/auth.routes'));
app.use('/api/users',         require('./src/routes/user.routes'));
app.use('/api/services',      require('./src/routes/service.routes'));
app.use('/api/offers',        require('./src/routes/offer.routes'));
app.use('/api/payments',      require('./src/routes/payment.routes'));
app.use('/api/ratings',       require('./src/routes/rating.routes'));
app.use('/api/notifications', require('./src/routes/notification.routes'));
app.use('/api/admin',         require('./src/routes/admin.routes'));

// Serve Admin Panel
app.use('/admin', require('express').static(require('path').join(__dirname, 'admin')));

// Health check
app.get('/', (req, res) => {
  res.json({ message: '🚗 RescueRide API is running', status: 'OK' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 RescueRide server running on port ${PORT}`);
});
