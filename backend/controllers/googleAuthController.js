const { google } = require('googleapis');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Google OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

// Google Fit API configuration
const fitApiScopes = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.sleep.read'
];

// Flag to indicate if we're in development/testing mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Google authentication for sign-in
exports.googleAuth = asyncHandler(async (req, res, next) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      // Add special parameters for testing mode
      ...(isDevelopment && {
        include_granted_scopes: true,
        prompt: 'consent'
      })
    });
    
    console.log('Generated Google Auth URL:', authUrl);
    
    // Respond with auth URL
    return res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    return next(new ErrorResponse('Error connecting to Google', 500));
  }
});

// Google callback processing
exports.googleCallback = asyncHandler(async (req, res, next) => {
  const { code } = req.query;
  
  if (!code) {
    return next(new ErrorResponse('No authorization code provided', 400));
  }
  
  try {
    // Exchange auth code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Get user info from Google
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    
    const userInfo = await oauth2.userinfo.get();
    
    if (!userInfo.data || !userInfo.data.email) {
      return next(new ErrorResponse('Failed to get user info from Google', 500));
    }
    
    // Find or create user
    let user = await User.findOne({ email: userInfo.data.email });
    
    if (!user) {
      // Create new user with Google data
      user = await User.create({
        email: userInfo.data.email,
        firstName: userInfo.data.given_name || 'User',
        lastName: userInfo.data.family_name || '',
        googleId: userInfo.data.id,
        // Add connected services array if it doesn't exist
        connectedServices: ['google']
      });
    } else {
      // Update existing user with Google data
      user.googleId = userInfo.data.id;
      // Add Google to connected services if not already there
      if (!user.connectedServices) {
        user.connectedServices = ['google'];
      } else if (!user.connectedServices.includes('google')) {
        user.connectedServices.push('google');
      }
      await user.save();
    }
    
    // Create token
    const token = user.getSignedJwtToken();
    
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/auth/google/success?token=${token}`);
  } catch (error) {
    console.error('Error in Google callback:', error);
    
    // Redirect to error page with details
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/auth/google/error?error=${encodeURIComponent(error.message)}`);
  }
});

// Google Fit authorization
exports.googleFitAuth = asyncHandler(async (req, res, next) => {
  try {
    // Make sure user is authenticated
    if (!req.user) {
      return next(new ErrorResponse('Not authorized', 401));
    }
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: fitApiScopes,
      // Add these parameters to ensure we get a refresh token
      prompt: 'consent',
      include_granted_scopes: true
    });
    
    console.log('Generated Google Fit Auth URL:', authUrl);
    
    return res.status(200).json({
      success: true,
      data: { authUrl }
    });
  } catch (error) {
    console.error('Error generating Google Fit auth URL:', error);
    return next(new ErrorResponse('Error connecting to Google Fit', 500));
  }
});

// Google Fit callback
exports.googleFitCallback = asyncHandler(async (req, res, next) => {
  const { code } = req.query;
  const { state } = req.query;
  
  if (!code) {
    return next(new ErrorResponse('No authorization code provided', 400));
  }
  
  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store these tokens with the user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }
    
    // Save tokens to user record
    user.googleFitTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    };
    
    // Add googleFit to connected services
    if (!user.connectedServices) {
      user.connectedServices = ['googleFit'];
    } else if (!user.connectedServices.includes('googleFit')) {
      user.connectedServices.push('googleFit');
    }
    
    await user.save();
    
    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/auth/google/fit/success?connected=true`);
  } catch (error) {
    console.error('Error in Google Fit callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/auth/google/fit/error?error=${encodeURIComponent(error.message)}`);
  }
});

// Sync Google Fit data
exports.syncGoogleFitData = asyncHandler(async (req, res, next) => {
  try {
    // Implementation for syncing Google Fit data
    // For now, we'll return mock data since we're focusing on the auth flow
    
    console.log('Syncing Google Fit data requested');
    
    // Return mock data for development/testing
    if (isDevelopment) {
      return res.status(200).json({
        success: true,
        data: {
          metrics: [
            { type: 'steps', value: 8432, timestamp: new Date().toISOString() },
            { type: 'heart_rate', value: 72, timestamp: new Date().toISOString() },
            { type: 'weight', value: 70.5, timestamp: new Date().toISOString() },
            { type: 'calories', value: 1850, timestamp: new Date().toISOString() }
          ]
        }
      });
    }
    
    // For actual implementation, we'd use the Google Fitness API here
    // This would be implemented with real data fetching
    
    res.status(501).json({
      success: false,
      error: 'Sync functionality not fully implemented yet'
    });
    
  } catch (error) {
    console.error('Error syncing Google Fit data:', error);
    return next(new ErrorResponse('Error syncing data from Google Fit', 500));
  }
});
