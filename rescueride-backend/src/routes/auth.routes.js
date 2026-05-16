const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, register, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/send-otp',   sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register',   protect, register);
router.get('/me',          protect, getMe);

module.exports = router;
