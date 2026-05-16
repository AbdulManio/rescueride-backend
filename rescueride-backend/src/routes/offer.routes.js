const express = require('express');
const router = express.Router();
const { sendOffer, getOffersForRequest, acceptOffer } = require('../controllers/offer.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.post('/',                   protect, restrictTo('rescuer'),  sendOffer);
router.get('/:requestId',          protect, restrictTo('customer'), getOffersForRequest);
router.patch('/:offerId/accept',   protect, restrictTo('customer'), acceptOffer);

module.exports = router;
