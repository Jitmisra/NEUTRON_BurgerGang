const mongoose = require('mongoose');

const HealthMetricSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: [true, 'Please specify metric type'],
    enum: ['heart_rate', 'blood_pressure', 'weight', 'glucose', 'temperature', 'oxygen_saturation', 'steps', 'sleep', 'calories', 'water', 'custom']
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Please add a value for the metric']
  },
  unit: {
    type: String,
    required: [true, 'Please specify the unit of measurement']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    maxlength: [500, 'Note cannot be more than 500 characters']
  },
  source: {
    type: String,
    enum: ['manual', 'apple_health', 'google_fit', 'fitbit', 'withings', 'other'],
    default: 'manual'
  },
  tags: [String],
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient querying
HealthMetricSchema.index({ user: 1, type: 1, timestamp: -1 });

// Create a virtual for formatted value based on type
HealthMetricSchema.virtual('formattedValue').get(function() {
  switch(this.type) {
    case 'blood_pressure':
      return `${this.value.systolic}/${this.value.diastolic} ${this.unit}`;
    default:
      return `${this.value} ${this.unit}`;
  }
});

// Method to check if value is within normal range
HealthMetricSchema.methods.isWithinNormalRange = function() {
  // Define normal ranges for each metric type
  const normalRanges = {
    heart_rate: { min: 60, max: 100 }, // bpm
    blood_pressure: { 
      systolic: { min: 90, max: 120 },
      diastolic: { min: 60, max: 80 }
    },
    weight: { min: null, max: null }, // Depends on the person
    glucose: { min: 70, max: 99 }, // mg/dL fasting
    temperature: { min: 36.1, max: 37.2 }, // Celsius
    oxygen_saturation: { min: 95, max: 100 } // percent
  };

  if (!normalRanges[this.type]) return null;

  if (this.type === 'blood_pressure') {
    const systolicNormal = this.value.systolic >= normalRanges.blood_pressure.systolic.min && 
                           this.value.systolic <= normalRanges.blood_pressure.systolic.max;
    const diastolicNormal = this.value.diastolic >= normalRanges.blood_pressure.diastolic.min && 
                            this.value.diastolic <= normalRanges.blood_pressure.diastolic.max;
    return systolicNormal && diastolicNormal;
  } else {
    const range = normalRanges[this.type];
    return (range.min === null || this.value >= range.min) && 
           (range.max === null || this.value <= range.max);
  }
};

module.exports = mongoose.model('HealthMetric', HealthMetricSchema);
