const express = require('express');
const router = express.Router();
const {
  createRequest,
  getMyRequests,
  getActiveRequest,
  cancelRequest,
  completeRequest,
  getNearbyRescuers,
} = require('../controllers/service.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.post('/request',          protect, restrictTo('customer'), createRequest);
router.get('/my-requests',       protect, restrictTo('customer'), getMyRequests);
router.get('/active',            protect, restrictTo('customer'), getActiveRequest);
router.patch('/:id/cancel',      protect, restrictTo('customer'), cancelRequest);
router.patch('/:id/complete',    protect, restrictTo('rescuer'),  completeRequest);
router.get('/nearby-rescuers',   protect, restrictTo('customer'), getNearbyRescuers);
router.get('/nearby-requests', protect, restrictTo('rescuer'), getNearbyRequests);

module.exports = router;
