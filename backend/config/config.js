require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  mongoUri: process.env.MONGODB_URI,
  
  // AI service configuration
  aiService: {
    useExternalAI: process.env.USE_EXTERNAL_AI === 'true',
    apiKey: process.env.AI_SERVICE_API_KEY,
    apiUrl: process.env.AI_SERVICE_URL || 'https://api.healthprevent.com/ai',
    timeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT) || 10000,
    
    // Feature flags for AI capabilities
    features: {
      symptomAnalysis: true,
      healthMetricsAnalysis: true,
      healthRecommendations: true,
      riskPrediction: true,
      journalAnalysis: true
    }
  },
  
  // Email service configuration
  emailService: {
    enabled: process.env.EMAIL_SERVICE_ENABLED === 'true',
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    apiKey: process.env.EMAIL_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@healthprevent.com',
    fromName: process.env.FROM_NAME || 'HealthPrevent'
  },
  
  // Storage configuration
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    awsBucket: process.env.AWS_BUCKET_NAME,
    awsRegion: process.env.AWS_REGION
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  }
};

module.exports = config;
