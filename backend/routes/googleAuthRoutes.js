const express = require('express');
const { 
  googleAuth, 
  googleCallback, 
  googleFitAuth, 
  googleFitCallback,
  syncGoogleFitData
} = require('../controllers/googleAuthController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Debug route - verify router is loaded
router.get('/test', (req, res) => {
  res.status(200).json({ message: 'Google Auth routes loaded successfully' });
});

// Google OAuth routes (removed extra "/google" prefix)
router.get('/login', googleAuth);
router.get('/callback', googleCallback);

// Google Fit specific routes
router.get('/fit/auth', protect, googleFitAuth);
router.get('/fit/callback', googleFitCallback);
router.post('/fit/sync', protect, syncGoogleFitData);

module.exports = router;
