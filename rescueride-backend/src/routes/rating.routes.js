const express = require('express');
const router = express.Router();
const { submitRating } = require('../controllers/rating.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.post('/', protect, restrictTo('customer'), submitRating);

module.exports = router;
