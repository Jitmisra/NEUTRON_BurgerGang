const HealthGoal = require('../models/HealthGoal');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const aiService = require('../services/aiService');

// @desc    Get all goals for a user
// @route   GET /api/goals
// @access  Private
exports.getGoals = asyncHandler(async (req, res, next) => {
  const { status, category } = req.query;
  
  // Build query
  const query = { user: req.user.id };
  
  if (status) {
    query.status = status;
  }
  
  if (category) {
    query.category = category;
  }
  
  let goals = await HealthGoal.find(query).sort('-createdAt');
  
  // Add virtual properties
  goals = goals.map(goal => ({
    ...goal.toJSON(),
    daysRemaining: goal.daysRemaining,
    daysSinceStart: goal.daysSinceStart
  }));
  
  res.status(200).json({
    success: true,
    count: goals.length,
    data: goals
  });
});

// @desc    Get single goal
// @route   GET /api/goals/:id
// @access  Private
exports.getGoal = asyncHandler(async (req, res, next) => {
  const goal = await HealthGoal.findById(req.params.id);

  if (!goal) {
    return next(
      new ErrorResponse(`Goal not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the goal
  if (goal.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this goal`, 401)
    );
  }

  // Add virtual properties
  const goalWithVirtuals = {
    ...goal.toJSON(),
    daysRemaining: goal.daysRemaining,
    daysSinceStart: goal.daysSinceStart
  };

  res.status(200).json({
    success: true,
    data: goalWithVirtuals
  });
});

// @desc    Create new goal
// @route   POST /api/goals
// @access  Private
exports.createGoal = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  const goal = await HealthGoal.create(req.body);

  // Check if AI recommendations are requested
  if (req.query.recommend === 'true') {
    try {
      // Get user profile
      const user = await User.findById(req.user.id);
      
      // Prepare data for AI analysis
      const goalData = {
        title: goal.title,
        category: goal.category,
        metrics: goal.metrics,
        frequency: goal.frequency,
        targetDate: goal.targetDate
      };
      
      const userProfile = {
        age: user.profile?.dateOfBirth ? calculateAge(user.profile.dateOfBirth) : null,
        gender: user.profile?.gender || null,
        conditions: user.profile?.conditions || [],
        medications: user.profile?.medications || []
      };
      
      // Get AI recommendations
      const aiRecommendations = await aiService.generateHealthRecommendations(userProfile, {
        goals: [goalData]
      });
      
      // Update goal with AI recommendations
      if (aiRecommendations.exerciseRecommendations) {
        goal.aiRecommendations = aiRecommendations.exerciseRecommendations.slice(0, 3);
      } else if (aiRecommendations.dailyHabits) {
        goal.aiRecommendations = aiRecommendations.dailyHabits.slice(0, 3);
      } else if (aiRecommendations.nutritionSuggestions) {
        goal.aiRecommendations = aiRecommendations.nutritionSuggestions.slice(0, 3);
      }
      
      await goal.save();
    } catch (error) {
      console.error('Error generating AI recommendations for goal:', error);
      // Continue without AI recommendations if it fails
    }
  }

  res.status(201).json({
    success: true,
    data: goal
  });
});

// @desc    Update goal
// @route   PUT /api/goals/:id
// @access  Private
exports.updateGoal = asyncHandler(async (req, res, next) => {
  let goal = await HealthGoal.findById(req.params.id);

  if (!goal) {
    return next(
      new ErrorResponse(`Goal not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the goal
  if (goal.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this goal`, 401)
    );
  }

  goal = await HealthGoal.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Add virtual properties
  const goalWithVirtuals = {
    ...goal.toJSON(),
    daysRemaining: goal.daysRemaining,
    daysSinceStart: goal.daysSinceStart
  };

  res.status(200).json({
    success: true,
    data: goalWithVirtuals
  });
});

// @desc    Delete goal
// @route   DELETE /api/goals/:id
// @access  Private
exports.deleteGoal = asyncHandler(async (req, res, next) => {
  const goal = await HealthGoal.findById(req.params.id);

  if (!goal) {
    return next(
      new ErrorResponse(`Goal not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the goal
  if (goal.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this goal`, 401)
    );
  }

  await goal.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add check-in to goal
// @route   POST /api/goals/:id/checkin
// @access  Private
exports.addCheckIn = asyncHandler(async (req, res, next) => {
  const { date, completed, value, notes } = req.body;
  
  if (!date) {
    return next(new ErrorResponse('Please provide a date for the check-in', 400));
  }
  
  const goal = await HealthGoal.findById(req.params.id);
  
  if (!goal) {
    return next(
      new ErrorResponse(`Goal not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Make sure user owns the goal
  if (goal.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this goal`, 401)
    );
  }
  
  // Add check-in
  goal.checkIns.push({
    date,
    completed: completed || false,
    value,
    notes
  });
  
  // Update goal progress
  goal.progress = goal.calculateProgress();
  
  // Update streak
  goal.streak = goal.updateStreak();
  
  // If goal is completed, update status
  if (goal.progress >= 100 && completed) {
    goal.status = 'completed';
    goal.completedDate = new Date();
  }
  
  await goal.save();
  
  // Add virtual properties
  const goalWithVirtuals = {
    ...goal.toJSON(),
    daysRemaining: goal.daysRemaining,
    daysSinceStart: goal.daysSinceStart
  };
  
  res.status(200).json({
    success: true,
    data: goalWithVirtuals
  });
});

// @desc    Get goal statistics
// @route   GET /api/goals/stats
// @access  Private
exports.getGoalStats = asyncHandler(async (req, res, next) => {
  // Calculate statistics
  const activeGoals = await HealthGoal.countDocuments({
    user: req.user.id,
    status: 'active'
  });
  
  const completedGoals = await HealthGoal.countDocuments({
    user: req.user.id,
    status: 'completed'
  });
  
  const abandonedGoals = await HealthGoal.countDocuments({
    user: req.user.id,
    status: 'abandoned'
  });
  
  // Calculate completion rate
  const totalGoals = activeGoals + completedGoals + abandonedGoals;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
  
  // Get goals by category
  const categoryCounts = {};
  const categories = ['fitness', 'nutrition', 'mental', 'sleep', 'health', 'custom'];
  
  for (const category of categories) {
    categoryCounts[category] = await HealthGoal.countDocuments({
      user: req.user.id,
      category
    });
  }
  
  // Get average streak
  const goals = await HealthGoal.find({
    user: req.user.id,
    status: 'active'
  });
  
  const totalStreak = goals.reduce((sum, goal) => sum + goal.streak, 0);
  const averageStreak = goals.length > 0 ? (totalStreak / goals.length).toFixed(1) : 0;
  
  // Get longest current streak
  const longestStreak = goals.length > 0 ? Math.max(...goals.map(goal => goal.streak)) : 0;
  
  res.status(200).json({
    success: true,
    data: {
      activeGoals,
      completedGoals,
      abandonedGoals,
      totalGoals,
      completionRate: parseFloat(completionRate.toFixed(2)),
      categoryCounts,
      averageStreak: parseFloat(averageStreak),
      longestStreak
    }
  });
});

// Helper function to calculate age
const calculateAge = (dateOfBirth) => {
  const dob = new Date(dateOfBirth);
  const ageDifMs = Date.now() - dob.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};
