const express = require('express');
const router = express.Router();
const {
  createRequest,
  getMyRequests,
  getNearbyRequests,
  getActiveRequest,
  cancelRequest,
  completeRequest,
  getNearbyRescuers,
  getRescuerRequests,
} = require('../controllers/service.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.post('/request',          protect, restrictTo('customer'), createRequest);
router.get('/my-requests',       protect, restrictTo('customer'), getMyRequests);
router.get('/active',            protect, restrictTo('customer'), getActiveRequest);
router.patch('/:id/cancel',      protect, restrictTo('customer'), cancelRequest);
router.patch('/:id/complete',    protect, restrictTo('rescuer'),  completeRequest);
router.get('/nearby-rescuers',   protect, restrictTo('customer'), getNearbyRescuers);
router.get('/nearby-requests', protect, restrictTo('rescuer'), getNearbyRequests);
router.get('/my-active-job', protect, restrictTo('rescuer'), getRescuerRequests);

module.exports = router;
