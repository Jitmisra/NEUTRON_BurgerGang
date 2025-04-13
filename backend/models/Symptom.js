const mongoose = require('mongoose');

const SymptomSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide symptom name'],
    trim: true
  },
  bodyPart: {
    type: String,
    required: [true, 'Please specify body part affected']
  },
  severity: {
    type: Number,
    min: 1,
    max: 10,
    required: [true, 'Please rate severity from 1-10']
  },
  duration: {
    type: String,
    required: [true, 'Please specify the duration']
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  isOngoing: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
  },
  triggers: [String],
  relief: [String],
  aiAnalysis: {
    possibleCauses: [String],
    recommendations: [String],
    severityAssessment: String,
    correlations: [
      {
        metricType: String,
        relationship: String,
        confidence: Number
      }
    ]
  },
  relatedHealthMetrics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HealthMetric'
  }],
  relatedMedications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medication'
  }]
}, {
  timestamps: true
});

// Create indexes for efficient querying
SymptomSchema.index({ user: 1, startTime: -1 });
SymptomSchema.index({ user: 1, name: 1 });
SymptomSchema.index({ user: 1, bodyPart: 1 });

// Virtual for symptom duration in hours
SymptomSchema.virtual('durationHours').get(function() {
  if (!this.endTime) return null;
  
  const start = new Date(this.startTime);
  const end = new Date(this.endTime);
  const durationMs = end - start;
  
  return (durationMs / (1000 * 60 * 60)).toFixed(1);
});

module.exports = mongoose.model('Symptom', SymptomSchema);
