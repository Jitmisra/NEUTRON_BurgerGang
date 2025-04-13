const Symptom = require('../models/Symptom');
const HealthMetric = require('../models/HealthMetric');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const aiService = require('../services/aiService');

// @desc    Get all symptoms for a user
// @route   GET /api/symptoms
// @access  Private
exports.getSymptoms = asyncHandler(async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };
  
  // Add user filter
  reqQuery.user = req.user.id;

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit', 'populate'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  query = Symptom.find(JSON.parse(queryStr));

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-startTime');
  }

  // Populate
  if (req.query.populate) {
    const fields = req.query.populate.split(',');
    fields.forEach(field => {
      query = query.populate(field);
    });
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Symptom.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const symptoms = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: symptoms.length,
    pagination,
    data: symptoms
  });
});

// @desc    Get single symptom
// @route   GET /api/symptoms/:id
// @access  Private
exports.getSymptom = asyncHandler(async (req, res, next) => {
  const symptom = await Symptom.findById(req.params.id)
    .populate('relatedHealthMetrics')
    .populate('relatedMedications');

  if (!symptom) {
    return next(
      new ErrorResponse(`Symptom not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the symptom
  if (symptom.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this symptom`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: symptom
  });
});

// @desc    Create new symptom
// @route   POST /api/symptoms
// @access  Private
exports.createSymptom = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  const symptom = await Symptom.create(req.body);

  // Check if AI analysis is requested
  if (req.query.analyze === 'true') {
    try {
      // Get related health metrics
      const timeWindow = 24 * 60 * 60 * 1000; // 24 hours in ms
      const symptomTime = new Date(symptom.startTime);
      const startTime = new Date(symptomTime.getTime() - timeWindow);
      const endTime = new Date(symptomTime.getTime() + timeWindow);
      
      const relatedMetrics = await HealthMetric.find({
        user: req.user.id,
        timestamp: {
          $gte: startTime,
          $lte: endTime
        }
      });
      
      // Prepare data for AI analysis
      const user = await User.findById(req.user.id);
      const analysisData = {
        symptom: {
          name: symptom.name,
          bodyPart: symptom.bodyPart,
          severity: symptom.severity,
          duration: symptom.duration,
          notes: symptom.notes
        },
        userProfile: {
          age: user.profile?.dateOfBirth ? calculateAge(user.profile.dateOfBirth) : null,
          gender: user.profile?.gender || null,
          conditions: user.profile?.conditions || [],
          medications: user.profile?.medications || []
        },
        metrics: relatedMetrics.map(metric => ({
          type: metric.type,
          value: metric.value,
          unit: metric.unit,
          timestamp: metric.timestamp
        }))
      };
      
      // Get AI analysis
      const aiAnalysis = await aiService.analyzeSymptom(analysisData);
      
      // Update symptom with AI analysis and related metrics
      symptom.aiAnalysis = aiAnalysis;
      symptom.relatedHealthMetrics = relatedMetrics.map(metric => metric._id);
      await symptom.save();
    } catch (error) {
      console.error('Error during AI analysis:', error);
      // Continue without AI analysis if it fails
    }
  }

  res.status(201).json({
    success: true,
    data: symptom
  });
});

// @desc    Update symptom
// @route   PUT /api/symptoms/:id
// @access  Private
exports.updateSymptom = asyncHandler(async (req, res, next) => {
  let symptom = await Symptom.findById(req.params.id);

  if (!symptom) {
    return next(
      new ErrorResponse(`Symptom not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the symptom
  if (symptom.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this symptom`, 401)
    );
  }

  symptom = await Symptom.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: symptom
  });
});

// @desc    Delete symptom
// @route   DELETE /api/symptoms/:id
// @access  Private
exports.deleteSymptom = asyncHandler(async (req, res, next) => {
  const symptom = await Symptom.findById(req.params.id);

  if (!symptom) {
    return next(
      new ErrorResponse(`Symptom not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the symptom
  if (symptom.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this symptom`, 401)
    );
  }

  await symptom.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get symptoms by body part
// @route   GET /api/symptoms/bodypart/:bodyPart
// @access  Private
exports.getSymptomsByBodyPart = asyncHandler(async (req, res, next) => {
  const symptoms = await Symptom.find({ 
    user: req.user.id,
    bodyPart: req.params.bodyPart
  }).sort('-startTime');

  res.status(200).json({
    success: true,
    count: symptoms.length,
    data: symptoms
  });
});

// @desc    Get symptom frequency analysis
// @route   GET /api/symptoms/frequency
// @access  Private
exports.getSymptomFrequency = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, symptom } = req.query;
  
  let dateFilter = { user: req.user.id };
  
  if (startDate || endDate) {
    dateFilter.startTime = {};
    if (startDate) dateFilter.startTime.$gte = new Date(startDate);
    if (endDate) dateFilter.startTime.$lte = new Date(endDate);
  }
  
  if (symptom) {
    dateFilter.name = symptom;
  }
  
  const symptoms = await Symptom.find(dateFilter);
  
  // Calculate frequency by symptom name
  const frequency = {};
  symptoms.forEach(symptom => {
    if (!frequency[symptom.name]) {
      frequency[symptom.name] = 1;
    } else {
      frequency[symptom.name]++;
    }
  });
  
  // Convert to array for easier consumption by frontend
  const frequencyArray = Object.keys(frequency).map(name => ({
    name,
    count: frequency[name],
    percentage: Math.round((frequency[name] / symptoms.length) * 100)
  }));
  
  // Sort by count in descending order
  frequencyArray.sort((a, b) => b.count - a.count);
  
  res.status(200).json({
    success: true,
    data: {
      total: symptoms.length,
      frequency: frequencyArray
    }
  });
});

// @desc    Get symptom correlations with metrics
// @route   GET /api/symptoms/correlations
// @access  Private
exports.getSymptomCorrelations = asyncHandler(async (req, res, next) => {
  const { symptom } = req.query;
  
  if (!symptom) {
    return next(new ErrorResponse('Please provide a symptom name', 400));
  }
  
  // Get all instances of this symptom
  const symptoms = await Symptom.find({
    user: req.user.id,
    name: symptom
  }).sort('startTime');
  
  if (symptoms.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        correlations: []
      }
    });
  }
  
  // Look for metrics around the time of each symptom
  const correlations = [];
  const metricCounts = {};
  const metricValues = {};
  
  for (const symptomInstance of symptoms) {
    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours in ms
    const symptomTime = new Date(symptomInstance.startTime);
    const startTime = new Date(symptomTime.getTime() - timeWindow);
    const endTime = new Date(symptomTime.getTime() + timeWindow);
    
    const metrics = await HealthMetric.find({
      user: req.user.id,
      timestamp: {
        $gte: startTime,
        $lte: endTime
      }
    });
    
    metrics.forEach(metric => {
      if (!metricCounts[metric.type]) {
        metricCounts[metric.type] = 0;
        metricValues[metric.type] = [];
      }
      
      metricCounts[metric.type]++;
      
      // For blood pressure, store systolic and diastolic separately
      if (metric.type === 'blood_pressure') {
        if (!metricValues[`${metric.type}_systolic`]) {
          metricValues[`${metric.type}_systolic`] = [];
        }
        if (!metricValues[`${metric.type}_diastolic`]) {
          metricValues[`${metric.type}_diastolic`] = [];
        }
        
        metricValues[`${metric.type}_systolic`].push(metric.value.systolic);
        metricValues[`${metric.type}_diastolic`].push(metric.value.diastolic);
      } else {
        metricValues[metric.type].push(metric.value);
      }
    });
  }
  
  // Calculate correlations
  Object.keys(metricCounts).forEach(metricType => {
    const correlation = {
      metricType,
      occurrenceRate: Math.round((metricCounts[metricType] / symptoms.length) * 100),
      averageValue: null,
      unit: null
    };
    
    // Get a sample metric to extract unit
    const sampleMetric = await HealthMetric.findOne({
      user: req.user.id,
      type: metricType
    });
    
    if (sampleMetric) {
      correlation.unit = sampleMetric.unit;
    }
    
    // Calculate average values
    if (metricType === 'blood_pressure') {
      const systolicValues = metricValues[`${metricType}_systolic`];
      const diastolicValues = metricValues[`${metricType}_diastolic`];
      
      if (systolicValues.length > 0 && diastolicValues.length > 0) {
        const avgSystolic = systolicValues.reduce((sum, val) => sum + val, 0) / systolicValues.length;
        const avgDiastolic = diastolicValues.reduce((sum, val) => sum + val, 0) / diastolicValues.length;
        
        correlation.averageValue = {
          systolic: Math.round(avgSystolic),
          diastolic: Math.round(avgDiastolic)
        };
      }
    } else {
      const values = metricValues[metricType];
      if (values.length > 0) {
        correlation.averageValue = parseFloat((values.reduce((sum, val) => sum + parseFloat(val), 0) / values.length).toFixed(2));
      }
    }
    
    correlations.push(correlation);
  });
  
  // Sort by occurrence rate
  correlations.sort((a, b) => b.occurrenceRate - a.occurrenceRate);
  
  res.status(200).json({
    success: true,
    data: {
      symptom,
      occurrences: symptoms.length,
      correlations
    }
  });
});

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  const dob = new Date(dateOfBirth);
  const ageDifMs = Date.now() - dob.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};
