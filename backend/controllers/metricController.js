const HealthMetric = require('../models/HealthMetric');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all metrics for a user
// @route   GET /api/metrics
// @access  Private
exports.getMetrics = asyncHandler(async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };
  
  // Add user filter
  reqQuery.user = req.user.id;

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  query = HealthMetric.find(JSON.parse(queryStr));

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
    query = query.sort('-timestamp');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await HealthMetric.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const metrics = await query;

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
    count: metrics.length,
    pagination,
    data: metrics
  });
});

// @desc    Get single metric
// @route   GET /api/metrics/:id
// @access  Private
exports.getMetric = asyncHandler(async (req, res, next) => {
  const metric = await HealthMetric.findById(req.params.id);

  if (!metric) {
    return next(
      new ErrorResponse(`Metric not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the metric
  if (metric.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this metric`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: metric
  });
});

// @desc    Create new metric
// @route   POST /api/metrics
// @access  Private
exports.createMetric = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  const metric = await HealthMetric.create(req.body);

  res.status(201).json({
    success: true,
    data: metric
  });
});

// @desc    Update metric
// @route   PUT /api/metrics/:id
// @access  Private
exports.updateMetric = asyncHandler(async (req, res, next) => {
  let metric = await HealthMetric.findById(req.params.id);

  if (!metric) {
    return next(
      new ErrorResponse(`Metric not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the metric
  if (metric.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this metric`, 401)
    );
  }

  metric = await HealthMetric.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: metric
  });
});

// @desc    Delete metric
// @route   DELETE /api/metrics/:id
// @access  Private
exports.deleteMetric = asyncHandler(async (req, res, next) => {
  const metric = await HealthMetric.findById(req.params.id);

  if (!metric) {
    return next(
      new ErrorResponse(`Metric not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the metric
  if (metric.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this metric`, 401)
    );
  }

  await metric.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get metrics by type
// @route   GET /api/metrics/type/:type
// @access  Private
exports.getMetricsByType = asyncHandler(async (req, res, next) => {
  const { type } = req.params;
  const { from, to, limit } = req.query;
  
  const query = {
    user: req.user.id,
    type
  };

  // Add date range if provided
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  const metrics = await HealthMetric.find(query)
    .sort('-timestamp')
    .limit(parseInt(limit) || 100);

  res.status(200).json({
    success: true,
    count: metrics.length,
    data: metrics
  });
});

// @desc    Get metrics statistics
// @route   GET /api/metrics/stats
// @access  Private
exports.getMetricsStats = asyncHandler(async (req, res, next) => {
  const { type, period } = req.query;
  
  // Define time periods
  const periods = {
    day: 1,
    week: 7,
    month: 30,
    year: 365
  };
  
  const days = periods[period] || 30; // default to month
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Build the query
  const query = {
    user: req.user.id,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (type) {
    query.type = type;
  }
  
  // For blood pressure we need to handle differently due to the object structure
  if (type === 'blood_pressure') {
    const metrics = await HealthMetric.find(query).sort('timestamp');
    
    // Calculate stats manually
    if (metrics.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          count: 0,
          average: { systolic: null, diastolic: null },
          min: { systolic: null, diastolic: null },
          max: { systolic: null, diastolic: null },
          latest: null
        }
      });
    }
    
    let totalSystolic = 0;
    let totalDiastolic = 0;
    let minSystolic = metrics[0].value.systolic;
    let maxSystolic = metrics[0].value.systolic;
    let minDiastolic = metrics[0].value.diastolic;
    let maxDiastolic = metrics[0].value.diastolic;
    
    metrics.forEach(metric => {
      totalSystolic += metric.value.systolic;
      totalDiastolic += metric.value.diastolic;
      
      minSystolic = Math.min(minSystolic, metric.value.systolic);
      maxSystolic = Math.max(maxSystolic, metric.value.systolic);
      minDiastolic = Math.min(minDiastolic, metric.value.diastolic);
      maxDiastolic = Math.max(maxDiastolic, metric.value.diastolic);
    });
    
    const stats = {
      count: metrics.length,
      average: {
        systolic: Math.round(totalSystolic / metrics.length),
        diastolic: Math.round(totalDiastolic / metrics.length)
      },
      min: { systolic: minSystolic, diastolic: minDiastolic },
      max: { systolic: maxSystolic, diastolic: maxDiastolic },
      latest: metrics[metrics.length - 1]
    };
    
    return res.status(200).json({
      success: true,
      data: stats
    });
  }
  
  // For other metrics
  const metrics = await HealthMetric.find(query).sort('timestamp');
  
  if (metrics.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        count: 0,
        average: null,
        min: null,
        max: null,
        latest: null
      }
    });
  }
  
  // Calculate statistics
  let total = 0;
  let min = metrics[0].value;
  let max = metrics[0].value;
  
  metrics.forEach(metric => {
    total += parseFloat(metric.value);
    min = Math.min(min, parseFloat(metric.value));
    max = Math.max(max, parseFloat(metric.value));
  });
  
  const stats = {
    count: metrics.length,
    average: parseFloat((total / metrics.length).toFixed(2)),
    min,
    max,
    latest: metrics[metrics.length - 1]
  };
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

// @desc    Batch create metrics
// @route   POST /api/metrics/batch
// @access  Private
exports.batchCreateMetrics = asyncHandler(async (req, res, next) => {
  const { metrics } = req.body;
  
  if (!metrics || !Array.isArray(metrics)) {
    return next(new ErrorResponse('Please provide an array of metrics', 400));
  }
  
  // Add user to each metric
  const metricsWithUser = metrics.map(metric => ({
    ...metric,
    user: req.user.id
  }));
  
  const createdMetrics = await HealthMetric.insertMany(metricsWithUser);
  
  res.status(201).json({
    success: true,
    count: createdMetrics.length,
    data: createdMetrics
  });
});
