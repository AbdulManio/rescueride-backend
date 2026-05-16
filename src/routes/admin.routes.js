const express = require('express');
const router = express.Router();
const {
  getPendingRescuers,
  approveRescuer,
  rejectRescuer,
  getStats,
  getAllUsers,
} = require('../controllers/admin.controller');
const { adminOnly } = require('../middleware/admin.middleware');

// All admin routes protected by admin key
router.use(adminOnly);

router.get('/stats',                    getStats);
router.get('/users',                    getAllUsers);
router.get('/rescuers/pending',         getPendingRescuers);
router.patch('/rescuers/:id/approve',   approveRescuer);
router.patch('/rescuers/:id/reject',    rejectRescuer);

module.exports = router;
