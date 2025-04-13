const express = require('express');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Import the user controller functions
const { getMe } = require('../controllers/authController');

// Profile endpoint redirect (for backward compatibility)
router.get('/profile', protect, getMe);

// Connected services endpoint
router.get('/connected-services', protect, (req, res) => {
  // Pass the connected services from the user object
  res.status(200).json({
    success: true,
    data: req.user.connectedServices || []
  });
});

module.exports = router;
