const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const initSocket = require('./src/config/socket');
const { initFirebase } = require('./src/config/firebase');

dotenv.config();
connectDB();
initFirebase();

const app = express();
const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',          require('./src/routes/auth.routes'));
app.use('/api/users',         require('./src/routes/user.routes'));
app.use('/api/services',      require('./src/routes/service.routes'));
app.use('/api/offers',        require('./src/routes/offer.routes'));
app.use('/api/payments',      require('./src/routes/payment.routes'));
app.use('/api/ratings',       require('./src/routes/rating.routes'));
app.use('/api/notifications', require('./src/routes/notification.routes'));
app.use('/api/admin',         require('./src/routes/admin.routes'));
app.use('/api/support',       require('./src/routes/support.routes'));
app.use('/admin', require('express').static(require('path').join(__dirname, 'admin')));

app.get('/', (req, res) => {
  res.json({ message: '🚗 RescueRide API is running', status: 'OK' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

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