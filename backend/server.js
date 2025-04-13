const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Import error handler with fallback
let errorHandler;
try {
  errorHandler = require('./middleware/error');
} catch (err) {
  console.warn('Error handler middleware not found, using default handler');
  errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  };
}

// Import configurations with fallback
let config;
try {
  config = require('./config/config');
} catch (err) {
  console.warn('Config file not found, using default values');
  config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000
  };
}

// Try to import routes with fallbacks
let auth, users, metrics, symptoms, goals, journal, googleAuth;
try { 
  auth = require('./routes/authRoutes'); 
  console.log('Auth routes loaded successfully'); 
} catch (err) { 
  console.warn('Auth routes not found', err.message); 
}
try { users = require('./routes/userRoutes'); } catch (err) { console.warn('User routes not found'); }
try { metrics = require('./routes/metricRoutes'); } catch (err) { console.warn('Metrics routes not found'); }
try { symptoms = require('./routes/symptomRoutes'); } catch (err) { console.warn('Symptoms routes not found'); }
try { goals = require('./routes/goalRoutes'); } catch (err) { console.warn('Goals routes not found'); }
try { journal = require('./routes/journalRoutes'); } catch (err) { console.warn('Journal routes not found'); }
try { 
  googleAuth = require('./routes/googleAuthRoutes'); 
  console.log('Google Auth routes loaded successfully'); 
} catch (err) { 
  console.warn('Google Auth routes not found', err.message); 
}

// Try to import optional dependencies
let morgan, mongoSanitize, helmet, xss, rateLimit, hpp;
try { morgan = require('morgan'); } catch (err) { console.warn('morgan not installed'); }
try { mongoSanitize = require('express-mongo-sanitize'); } catch (err) { console.warn('express-mongo-sanitize not installed'); }
try { helmet = require('helmet'); } catch (err) { console.warn('helmet not installed'); }
try { xss = require('xss-clean'); } catch (err) { console.warn('xss-clean not installed'); }
try { rateLimit = require('express-rate-limit'); } catch (err) { console.warn('express-rate-limit not installed'); }
try { hpp = require('hpp'); } catch (err) { console.warn('hpp not installed'); }

const app = express();

// Body parser
app.use(express.json());

// CORS middleware with more permissive settings for development
app.use((req, res, next) => {
  // Allow requests from any origin in development mode
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Original CORS configuration (keep this as a fallback)
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:5174', 'http://127.0.0.1:5174'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Add test endpoint for CORS debugging
app.get('/api/cors-test', (req, res) => {
  res.status(200).json({ 
    message: 'CORS is working properly!',
    headers: req.headers,
    origin: req.headers.origin 
  });
});

// Add a fallback CORS handler for development
if (config.env === 'development') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
  });
}

// Dev logging middleware
if (config.env === 'development' && morgan) {
  app.use(morgan('dev'));
}

// Security middleware - only use if available
if (mongoSanitize) app.use(mongoSanitize());
if (helmet) app.use(helmet({ contentSecurityPolicy: false }));
if (xss) app.use(xss());
if (rateLimit) {
  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100
  });
  app.use('/api/', limiter);
}
if (hpp) app.use(hpp());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers (if available)
if (auth) app.use('/api/auth', auth);
// Mount googleAuthRoutes on the proper subpath:
if (googleAuth) {
  console.log('Mounting Google Auth routes at /api/auth/google');
  app.use('/api/auth/google', googleAuth);
} else {
  console.warn('Google Auth routes not available for mounting');
}
if (users) app.use('/api/users', users);
if (metrics) app.use('/api/metrics', metrics);
if (symptoms) app.use('/api/symptoms', symptoms);
if (goals) app.use('/api/goals', goals);
if (journal) app.use('/api/journal', journal);

// Fallback route for /api/users/profile (for backwards compatibility)
app.get('/api/users/profile', (req, res) => {
  // Redirect to /api/auth/me
  res.redirect('/api/auth/me');
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Add a test endpoint for Google Auth
app.get('/api/auth/google-test', (req, res) => {
  res.status(200).json({
    message: 'Google Auth test endpoint working',
    googleAuthLoaded: !!googleAuth
  });
});

// Add additional debug endpoints
app.get('/api/routes-test', (req, res) => {
  // Display all registered routes
  const routes = [];
  app._router.stack.forEach(middleware => {
    if(middleware.route) {
      // Direct routes
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if(middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach(handler => {
        if(handler.route) {
          const path = handler.route.path;
          const basePath = middleware.regexp.toString()
            .replace('\\^', '')
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/');
          
          routes.push({
            path: basePath + path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.status(200).json({
    success: true,
    authLoaded: !!auth,
    googleAuthLoaded: !!googleAuth,
    routes
  });
});

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || config.port || 5000;

const server = app.listen(
  PORT,
  console.log(`Server running in ${config.env || 'development'} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
