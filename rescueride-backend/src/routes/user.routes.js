const express = require('express');
const router = express.Router();
const {
  updateProfile,
  uploadDocuments,
  rescuerSetup,
  updateLocation,
  toggleOnline,
  getEarnings,
  getAccountStatus,
} = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { uploadDocuments: uploadDocs, uploadProfile } = require('../config/cloudinary');

// ─── Profile ──────────────────────────────────────────────────────────────────
router.put('/profile',
  protect,
  uploadProfile.single('profilePhoto'),
  updateProfile
);

// ─── Rescuer document upload (CNIC + License) ────────────────────────────────
router.post('/upload-documents',
  protect,
  restrictTo('rescuer'),
  uploadDocs.fields([
    { name: 'cnicPhoto', maxCount: 1 },
    { name: 'licensePhoto', maxCount: 1 },
  ]),
  uploadDocuments
);

// ─── Rescuer profile setup ───────────────────────────────────────────────────
router.put('/rescuer-setup',      protect, restrictTo('rescuer'), rescuerSetup);

// ─── Location & online status ────────────────────────────────────────────────
router.patch('/location',         protect,                        updateLocation);
router.patch('/toggle-online',    protect, restrictTo('rescuer'), toggleOnline);

// ─── Earnings & account status ───────────────────────────────────────────────
router.get('/earnings',           protect, restrictTo('rescuer'), getEarnings);
router.get('/account-status',     protect, restrictTo('rescuer'), getAccountStatus);

module.exports = router;
