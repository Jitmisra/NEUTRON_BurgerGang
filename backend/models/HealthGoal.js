const mongoose = require('mongoose');

const HealthGoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a title for your goal'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Please specify a category'],
    enum: ['fitness', 'nutrition', 'mental', 'sleep', 'health', 'custom'],
    default: 'custom'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  metrics: {
    current: {
      type: mongoose.Schema.Types.Mixed
    },
    target: {
      type: mongoose.Schema.Types.Mixed
    },
    unit: String
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    default: 'daily'
  },
  streak: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date,
    required: [true, 'Please specify a start date'],
    default: Date.now
  },
  targetDate: {
    type: Date,
    required: [true, 'Please specify a target date']
  },
  completedDate: {
    type: Date
  },
  checkIns: [{
    date: {
      type: Date,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    value: mongoose.Schema.Types.Mixed,
    notes: String
  }],
  relatedMetrics: [{
    metricType: {
      type: String,
      enum: ['heart_rate', 'blood_pressure', 'weight', 'steps', 'sleep', 'custom']
    },
    condition: {
      type: String,
      enum: ['increase', 'decrease', 'maintain']
    }
  }],
  reminderSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'custom']
    },
    time: String
  },
  aiRecommendations: [String]
}, {
  timestamps: true
});

// Create indexes for efficient querying
HealthGoalSchema.index({ user: 1, status: 1 });
HealthGoalSchema.index({ user: 1, category: 1 });
HealthGoalSchema.index({ user: 1, targetDate: 1 });

// Calculate days remaining until target date
HealthGoalSchema.virtual('daysRemaining').get(function() {
  if (!this.targetDate) return null;
  if (this.status === 'completed') return 0;
  
  const today = new Date();
  const target = new Date(this.targetDate);
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
});

// Calculate days since start
HealthGoalSchema.virtual('daysSinceStart').get(function() {
  if (!this.startDate) return null;
  
  const today = new Date();
  const start = new Date(this.startDate);
  const diffTime = today - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
});

// Method to update goal progress based on check-ins
HealthGoalSchema.methods.calculateProgress = function() {
  if (!this.metrics.target) return this.progress;
  
  if (this.status === 'completed') {
    return 100;
  }
  
  if (this.checkIns.length === 0) {
    return 0;
  }
  
  // Get most recent check-in value
  const latestCheckIn = this.checkIns.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  
  // Calculate progress based on targets
  let currentValue;
  let targetValue;
  
  // Handle different types of metric values
  if (typeof this.metrics.current === 'object' && this.metrics.current !== null) {
    // For complex types like blood pressure
    if (this.metrics.target.systolic && this.metrics.target.diastolic) {
      // For blood pressure, calculate average of systolic and diastolic progress
      const systolicProgress = (latestCheckIn.value.systolic / this.metrics.target.systolic) * 100;
      const diastolicProgress = (latestCheckIn.value.diastolic / this.metrics.target.diastolic) * 100;
      return Math.min(Math.round((systolicProgress + diastolicProgress) / 2), 100);
    }
  } else {
    // For simple numeric values
    currentValue = parseFloat(latestCheckIn.value);
    targetValue = parseFloat(this.metrics.target);
    
    if (isNaN(currentValue) || isNaN(targetValue)) {
      return this.progress;
    }
    
    return Math.min(Math.round((currentValue / targetValue) * 100), 100);
  }
  
  return this.progress;
};

// Method to update streak based on check-ins
HealthGoalSchema.methods.updateStreak = function() {
  if (this.checkIns.length === 0) return 0;
  
  // Sort check-ins by date
  const sortedCheckIns = this.checkIns
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Get most recent check-in
  const latestCheckIn = sortedCheckIns[0];
  const latestDate = new Date(latestCheckIn.date);
  
  // If most recent check-in wasn't completed, streak is 0
  if (!latestCheckIn.completed) return 0;
  
  // Calculate streak
  let streak = 1;
  let prevDate = latestDate;
  
  for (let i = 1; i < sortedCheckIns.length; i++) {
    const checkIn = sortedCheckIns[i];
    const checkInDate = new Date(checkIn.date);
    
    // Calculate days between this check-in and previous one
    const diffTime = prevDate - checkInDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    // For daily frequency, the difference should be 1
    // For weekly, it should be 7, etc.
    let expectedDiff = 1;
    if (this.frequency === 'weekly') expectedDiff = 7;
    else if (this.frequency === 'monthly') expectedDiff = 30;
    
    // If the check-in is not completed or the timing is off, break the streak
    if (!checkIn.completed || diffDays !== expectedDiff) {
      break;
    }
    
    streak++;
    prevDate = checkInDate;
  }
  
  return streak;
};

module.exports = mongoose.model('HealthGoal', HealthGoalSchema);
