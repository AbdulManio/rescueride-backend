const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Storage for rescuer documents (CNIC, License) ───────────────────────────
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'rescueride/documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    transformation: [{ quality: 'auto' }],
  },
});

// ─── Storage for profile photos ───────────────────────────────────────────────
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'rescueride/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
  },
});

// ─── Multer upload instances ──────────────────────────────────────────────────
const uploadDocuments = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
});

module.exports = { cloudinary, uploadDocuments, uploadProfile };
