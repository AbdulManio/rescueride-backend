// Simple admin protection via secret key in header
// Usage: add header → x-admin-key: your_admin_secret
const adminOnly = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];

  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({
      success: false,
      message: 'Admin access denied',
    });
  }

  next();
};

module.exports = { adminOnly };
