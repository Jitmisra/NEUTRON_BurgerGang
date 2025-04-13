const mongoose = require('mongoose');

const JournalEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a title for your journal entry'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Please add content to your journal entry'],
    maxlength: [5000, 'Journal entry cannot be more than 5000 characters']
  },
  mood: {
    type: String,
    enum: ['Energetic', 'Happy', 'Calm', 'Neutral', 'Sad', 'Anxious', 'Irritable', 'Tired', ''],
    default: ''
  },
  energy: {
    type: String,
    enum: ['High', 'Medium', 'Low', 'Very Low', ''],
    default: ''
  },
  symptoms: [String],
  factors: [String],
  date: {
    type: Date,
    default: Date.now
  },
  tags: [String],
  aiAnalysis: {
    possibleExplanations: [String],
    recommendedActions: [String],
    severityAssessment: {
      type: String,
      enum: ['low', 'moderate', 'high', '']
    },
    preventiveMeasures: [String],
    analysisTimestamp: Date
  },
  relatedHealthMetrics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HealthMetric'
  }]
}, {
  timestamps: true
});

// Create search index on title and content
JournalEntrySchema.index({ title: 'text', content: 'text' });

// Add additional indexes
JournalEntrySchema.index({ user: 1, date: -1 });
JournalEntrySchema.index({ user: 1, 'symptoms': 1 });
JournalEntrySchema.index({ user: 1, 'tags': 1 });

// Method to extract keywords from content
JournalEntrySchema.methods.extractKeywords = function() {
  // In a production system, this would use NLP to extract meaningful keywords
  // For demo purposes, we'll do simple word frequency counting
  if (!this.content) return [];
  
  // Remove common words and punctuation
  const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
                            'for', 'of', 'with', 'in', 'on', 'at', 'to', 'from', 'by']);
  
  // Extract words
  const words = this.content.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Count frequency
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Sort by frequency
  const sortedWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Return top keywords
  return sortedWords.slice(0, 5);
};

module.exports = mongoose.model('JournalEntry', JournalEntrySchema);
