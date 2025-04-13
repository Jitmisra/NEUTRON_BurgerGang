const JournalEntry = require('../models/JournalEntry');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const aiService = require('../services/aiService');
const User = require('../models/User');

// @desc    Get all journal entries for a user
// @route   GET /api/journal
// @access  Private
exports.getJournalEntries = asyncHandler(async (req, res, next) => {
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
  query = JournalEntry.find(JSON.parse(queryStr));

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
    query = query.sort('-date');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await JournalEntry.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const entries = await query;

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
    count: entries.length,
    pagination,
    data: entries
  });
});

// @desc    Get single journal entry
// @route   GET /api/journal/:id
// @access  Private
exports.getJournalEntry = asyncHandler(async (req, res, next) => {
  const entry = await JournalEntry.findById(req.params.id);

  if (!entry) {
    return next(
      new ErrorResponse(`Journal entry not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the entry
  if (entry.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this journal entry`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: entry
  });
});

// @desc    Create new journal entry
// @route   POST /api/journal
// @access  Private
exports.createJournalEntry = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  const entry = await JournalEntry.create(req.body);

  // Check if AI analysis is requested
  if (req.query.analyze === 'true' && entry.symptoms && entry.symptoms.length > 0) {
    try {
      // Get user profile
      const user = await User.findById(req.user.id);
      
      // Prepare data for AI analysis
      const symptomsData = {
        primary: entry.symptoms[0],
        additional: entry.symptoms.slice(1),
        description: entry.content,
        duration: 'Recent',
        severity: entry.mood === 'Tired' || entry.energy === 'Low' ? 'Moderate' : 'Mild',
        context: {
          mood: entry.mood,
          energy: entry.energy
        }
      };
      
      const userProfile = {
        age: user.profile?.dateOfBirth ? calculateAge(user.profile.dateOfBirth) : null,
        gender: user.profile?.gender || null,
        conditions: user.profile?.conditions || [],
        medications: user.profile?.medications || []
      };
      
      // Get AI analysis
      const aiAnalysis = await aiService.analyzeSymptom({
        symptom: symptomsData,
        userProfile
      });
      
      // Update entry with AI analysis
      entry.aiAnalysis = {
        possibleExplanations: aiAnalysis.possibleCauses,
        recommendedActions: aiAnalysis.recommendations,
        severityAssessment: aiAnalysis.severityAssessment,
        preventiveMeasures: aiAnalysis.recommendations.slice(-3),
        analysisTimestamp: new Date()
      };
      
      await entry.save();
    } catch (error) {
      console.error('Error during AI analysis of journal entry:', error);
      // Continue without AI analysis if it fails
    }
  }

  res.status(201).json({
    success: true,
    data: entry
  });
});

// @desc    Update journal entry
// @route   PUT /api/journal/:id
// @access  Private
exports.updateJournalEntry = asyncHandler(async (req, res, next) => {
  let entry = await JournalEntry.findById(req.params.id);

  if (!entry) {
    return next(
      new ErrorResponse(`Journal entry not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the entry
  if (entry.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this journal entry`, 401)
    );
  }

  entry = await JournalEntry.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: entry
  });
});

// @desc    Delete journal entry
// @route   DELETE /api/journal/:id
// @access  Private
exports.deleteJournalEntry = asyncHandler(async (req, res, next) => {
  const entry = await JournalEntry.findById(req.params.id);

  if (!entry) {
    return next(
      new ErrorResponse(`Journal entry not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the entry
  if (entry.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this journal entry`, 401)
    );
  }

  await entry.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Search journal entries
// @route   GET /api/journal/search
// @access  Private
exports.searchJournalEntries = asyncHandler(async (req, res, next) => {
  const { query } = req.query;
  
  if (!query) {
    return next(new ErrorResponse('Please provide a search query', 400));
  }
  
  const entries = await JournalEntry.find({
    user: req.user.id,
    $text: { $search: query }
  }).sort('-date');
  
  res.status(200).json({
    success: true,
    count: entries.length,
    data: entries
  });
});

// @desc    Generate insights from journal entries
// @route   GET /api/journal/insights
// @access  Private
exports.getJournalInsights = asyncHandler(async (req, res, next) => {
  // Get recent journal entries
  const entries = await JournalEntry.find({
    user: req.user.id
  })
  .sort('-date')
  .limit(10);
  
  if (entries.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        message: 'Not enough journal entries to generate insights',
        insights: []
      }
    });
  }
  
  try {
    // Prepare data for AI analysis
    const user = await User.findById(req.user.id);
    
    const entriesData = entries.map(entry => ({
      date: entry.date,
      mood: entry.mood,
      energy: entry.energy,
      symptoms: entry.symptoms,
      content: entry.content.substring(0, 100) // Truncate for brevity
    }));
    
    const userProfile = {
      age: user.profile?.dateOfBirth ? calculateAge(user.profile.dateOfBirth) : null,
      gender: user.profile?.gender || null,
      conditions: user.profile?.conditions || [],
      medications: user.profile?.medications || []
    };
    
    // Generate AI insights
    const insights = await aiService.generateHealthRecommendations(userProfile, {
      journalEntries: entriesData
    });
    
    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error generating journal insights:', error);
    return next(new ErrorResponse('Failed to generate insights', 500));
  }
});

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  const dob = new Date(dateOfBirth);
  const ageDifMs = Date.now() - dob.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};
