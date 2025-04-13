const axios = require('axios');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Analyzes a symptom with AI
 * @param {Object} data - Symptom, user profile, and related metrics data
 * @returns {Promise<Object>} AI analysis results
 */
exports.analyzeSymptom = async (data) => {
  try {
    // Structure data for analysis
    const analysisData = {
      symptom: data.symptom,
      userContext: {
        age: data.userProfile.age,
        gender: data.userProfile.gender,
        conditions: data.userProfile.conditions,
        medications: data.userProfile.medications
      },
      metrics: data.metrics
    };
    
    // In a production app, you would call an external AI service here
    // For demo purposes, we'll return a simulated response
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Analyze symptom severity based on description and user context
    const severityLevels = ['low', 'moderate', 'high'];
    const severityAssessment = severityLevels[Math.min(Math.floor(data.symptom.severity / 4), 2)];
    
    // Generate possible causes based on symptom and body part
    const possibleCauses = generatePossibleCauses(data.symptom.name, data.symptom.bodyPart);
    
    // Generate recommendations based on symptom, severity, and user context
    const recommendations = generateRecommendations(data.symptom, severityAssessment, data.userProfile);
    
    // Look for correlations in the health metrics
    const correlations = findCorrelations(data.symptom, data.metrics);
    
    return {
      possibleCauses,
      recommendations,
      severityAssessment,
      correlations,
      analysisTimestamp: new Date()
    };
  } catch (error) {
    console.error('AI Symptom Analysis Error:', error);
    throw new ErrorResponse('AI analysis service unavailable', 503);
  }
};

/**
 * Analyzes health metrics with AI
 * @param {Object} data - Health metrics, user profile, and context data
 * @returns {Promise<Object>} AI analysis results
 */
exports.analyzeHealthMetrics = async (data) => {
  try {
    // Structure data for analysis
    const analysisData = {
      metrics: data.metrics,
      userContext: data.userProfile,
      timeframe: data.timeframe || 'week'
    };
    
    // In a production app, you would call an external AI service here
    // For demo purposes, we'll return a simulated response
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate observations based on metrics
    const observations = generateObservations(data.metrics);
    
    // Identify potential concerns
    const concerns = identifyConcerns(data.metrics, data.userProfile);
    
    // Generate recommendations
    const recommendations = generateMetricRecommendations(data.metrics, concerns, data.userProfile);
    
    return {
      observations,
      concerns,
      recommendations,
      healthScore: calculateHealthScore(data.metrics, data.userProfile),
      analysisTimestamp: new Date()
    };
  } catch (error) {
    console.error('AI Health Metrics Analysis Error:', error);
    throw new ErrorResponse('AI analysis service unavailable', 503);
  }
};

/**
 * Generates health recommendations based on user data
 * @param {Object} userProfile - User profile data
 * @param {Object} context - Additional context like journal entries, goals, etc.
 * @returns {Promise<Object>} Personalized health recommendations
 */
exports.generateHealthRecommendations = async (userProfile, context) => {
  try {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate personalized recommendations based on user profile and context
    const recommendations = {
      dailyHabits: generateDailyHabits(userProfile, context),
      nutritionSuggestions: generateNutritionSuggestions(userProfile, context),
      exerciseRecommendations: generateExerciseRecommendations(userProfile, context),
      mentalWellbeingPractices: generateMentalWellbeingPractices(userProfile, context),
      trackingMetrics: recommendMetricsToTrack(userProfile, context)
    };
    
    return recommendations;
  } catch (error) {
    console.error('AI Recommendation Generation Error:', error);
    throw new ErrorResponse('AI recommendation service unavailable', 503);
  }
};

// Helper functions for simulating AI analysis

const generatePossibleCauses = (symptomName, bodyPart) => {
  const causes = {
    'Headache': [
      'Tension or stress',
      'Dehydration',
      'Eye strain from screen time',
      'Lack of sleep',
      'Caffeine withdrawal'
    ],
    'Fatigue': [
      'Insufficient sleep',
      'Poor sleep quality',
      'Dehydration',
      'Low physical activity',
      'High stress levels'
    ],
    'Nausea': [
      'Food sensitivity',
      'Digestive issues',
      'Anxiety or stress',
      'Motion sickness',
      'Medication side effect'
    ],
    'Dizziness': [
      'Low blood pressure',
      'Inner ear issues',
      'Dehydration',
      'Blood sugar fluctuations',
      'Anxiety'
    ],
    'Joint Pain': [
      'Inflammation',
      'Overexertion',
      'Changes in weather',
      'Arthritis',
      'Poor posture'
    ]
  };
  
  return causes[symptomName] || [
    'Multiple possible causes - further monitoring recommended',
    'Consider tracking related symptoms',
    'Consult with healthcare provider if persistent'
  ];
};

const generateRecommendations = (symptom, severity, userProfile) => {
  const genericRecommendations = [
    'Stay hydrated throughout the day',
    'Ensure adequate rest and sleep',
    'Monitor symptom changes and frequency',
    'Consider keeping a symptom journal'
  ];
  
  const specificRecommendations = {
    'Headache': [
      'Take short breaks from screen time',
      'Practice relaxation techniques',
      'Maintain good posture',
      'Ensure proper lighting when reading'
    ],
    'Fatigue': [
      'Establish a consistent sleep schedule',
      'Include protein in each meal',
      'Take short walks during the day',
      'Consider iron-rich foods in your diet'
    ],
    'Nausea': [
      'Eat smaller, more frequent meals',
      'Avoid strong odors when possible',
      'Try ginger tea or peppermint',
      'Avoid lying down right after eating'
    ]
  };
  
  let recommendations = [...genericRecommendations];
  
  if (specificRecommendations[symptom.name]) {
    recommendations = [...recommendations, ...specificRecommendations[symptom.name]];
  }
  
  if (severity === 'high') {
    recommendations.unshift('Consider consulting with a healthcare professional');
  }
  
  // Limit to top 5
  return recommendations.slice(0, 5);
};

const findCorrelations = (symptom, metrics) => {
  // Simplified correlation analysis for demo
  return metrics.slice(0, 3).map(metric => ({
    metricType: metric.type,
    relationship: 'potential correlation',
    confidence: Math.floor(Math.random() * 30) + 40 // Random confidence between 40-70%
  }));
};

const generateObservations = (metrics) => {
  const observations = [];
  
  if (metrics.length === 0) return observations;
  
  // Look for trends in heart rate
  const heartRateMetrics = metrics.filter(m => m.type === 'heart_rate');
  if (heartRateMetrics.length > 0) {
    const avgHeartRate = heartRateMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / heartRateMetrics.length;
    if (avgHeartRate < 60) {
      observations.push(`Your average heart rate (${avgHeartRate.toFixed(1)} bpm) is below the typical resting range.`);
    } else if (avgHeartRate > 100) {
      observations.push(`Your average heart rate (${avgHeartRate.toFixed(1)} bpm) is above the typical resting range.`);
    } else {
      observations.push(`Your average heart rate (${avgHeartRate.toFixed(1)} bpm) is within the normal resting range.`);
    }
  }
  
  // Look at sleep patterns
  const sleepMetrics = metrics.filter(m => m.type === 'sleep');
  if (sleepMetrics.length > 0) {
    const avgSleep = sleepMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / sleepMetrics.length;
    if (avgSleep < 7) {
      observations.push(`Your average sleep duration (${avgSleep.toFixed(1)} hours) is below the recommended 7-9 hours.`);
    } else {
      observations.push(`Your average sleep duration (${avgSleep.toFixed(1)} hours) meets the recommended guidelines.`);
    }
  }
  
  // Check step counts
  const stepMetrics = metrics.filter(m => m.type === 'steps');
  if (stepMetrics.length > 0) {
    const avgSteps = stepMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / stepMetrics.length;
    if (avgSteps < 7000) {
      observations.push(`Your average daily step count (${Math.round(avgSteps)}) is below the recommended 10,000 steps.`);
    } else {
      observations.push(`You're maintaining a good activity level with an average of ${Math.round(avgSteps)} steps daily.`);
    }
  }
  
  return observations;
};

const identifyConcerns = (metrics, userProfile) => {
  const concerns = [];
  
  // Check for high blood pressure
  const bpMetrics = metrics.filter(m => m.type === 'blood_pressure');
  if (bpMetrics.length > 0) {
    const highReadings = bpMetrics.filter(m => m.value.systolic > 130 || m.value.diastolic > 80);
    if (highReadings.length > bpMetrics.length / 2) {
      concerns.push('Several blood pressure readings are above the recommended range.');
    }
  }
  
  // Check for sleep consistency
  const sleepMetrics = metrics.filter(m => m.type === 'sleep');
  if (sleepMetrics.length > 3) {
    let inconsistentNights = 0;
    for (let i = 1; i < sleepMetrics.length; i++) {
      const diff = Math.abs(sleepMetrics[i].value - sleepMetrics[i-1].value);
      if (diff > 1.5) inconsistentNights++;
    }
    
    if (inconsistentNights > sleepMetrics.length / 3) {
      concerns.push('Your sleep duration varies significantly from day to day, which can impact sleep quality.');
    }
  }
  
  // Check for sedentary patterns
  const stepMetrics = metrics.filter(m => m.type === 'steps');
  if (stepMetrics.length > 0) {
    const lowActivityDays = stepMetrics.filter(m => m.value < 5000);
    if (lowActivityDays.length > stepMetrics.length / 2) {
      concerns.push('Several days show lower-than-recommended physical activity levels.');
    }
  }
  
  return concerns;
};

const generateMetricRecommendations = (metrics, concerns, userProfile) => {
  const recommendations = [];
  
  // Add recommendations based on identified concerns
  if (concerns.includes('Several blood pressure readings are above the recommended range.')) {
    recommendations.push('Consider reducing sodium intake and increasing potassium-rich foods in your diet.');
    recommendations.push('Try to incorporate 30 minutes of moderate exercise most days of the week.');
  }
  
  if (concerns.includes('Your sleep duration varies significantly from day to day, which can impact sleep quality.')) {
    recommendations.push('Establish a consistent sleep schedule, even on weekends.');
    recommendations.push('Create a relaxing bedtime routine to signal your body it's time to sleep.');
  }
  
  if (concerns.includes('Several days show lower-than-recommended physical activity levels.')) {
    recommendations.push('Look for opportunities to add movement throughout your day, like taking the stairs or walking meetings.');
    recommendations.push('Schedule dedicated activity time on your calendar to ensure it happens.');
  }
  
  // Generic recommendations if no specific concerns
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring your health metrics to establish solid baselines.');
    recommendations.push('Consider tracking your nutrition to gain insights into dietary patterns.');
    recommendations.push('Add brief meditation sessions to your routine to support mental wellbeing.');
  }
  
  return recommendations;
};

const calculateHealthScore = (metrics, userProfile) => {
  // A simplified health scoring algorithm
  let baseScore = 70; // Default starting point
  let modifiers = 0;
  
  // Check heart rate
  const heartRateMetrics = metrics.filter(m => m.type === 'heart_rate');
  if (heartRateMetrics.length > 0) {
    const avgHeartRate = heartRateMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / heartRateMetrics.length;
    if (avgHeartRate < 60 || avgHeartRate > 100) {
      modifiers -= 5;
    } else if (avgHeartRate >= 60 && avgHeartRate <= 80) {
      modifiers += 5;
    }
  }
  
  // Check blood pressure
  const bpMetrics = metrics.filter(m => m.type === 'blood_pressure');
  if (bpMetrics.length > 0) {
    const optimalReadings = bpMetrics.filter(m => 
      m.value.systolic < 120 && m.value.diastolic < 80
    );
    
    const percentOptimal = optimalReadings.length / bpMetrics.length;
    
    if (percentOptimal > 0.8) {
      modifiers += 10;
    } else if (percentOptimal < 0.4) {
      modifiers -= 10;
    }
  }
  
  // Check sleep
  const sleepMetrics = metrics.filter(m => m.type === 'sleep');
  if (sleepMetrics.length > 0) {
    const avgSleep = sleepMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / sleepMetrics.length;
    if (avgSleep >= 7 && avgSleep <= 9) {
      modifiers += 8;
    } else if (avgSleep < 6) {
      modifiers -= 8;
    } else if (avgSleep < 7) {
      modifiers -= 4;
    }
  }
  
  // Check activity level
  const stepMetrics = metrics.filter(m => m.type === 'steps');
  if (stepMetrics.length > 0) {
    const avgSteps = stepMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / stepMetrics.length;
    if (avgSteps >= 10000) {
      modifiers += 10;
    } else if (avgSteps >= 7500) {
      modifiers += 5;
    } else if (avgSteps < 5000) {
      modifiers -= 5;
    }
  }
  
  // Calculate final score
  let finalScore = baseScore + modifiers;
  
  // Cap score between 0-100
  finalScore = Math.max(0, Math.min(100, finalScore));
  
  return Math.round(finalScore);
};

// Helper functions for recommendation generation

const generateDailyHabits = (userProfile, context) => {
  const habits = [
    'Start your day with a large glass of water',
    'Take 5 minutes for deep breathing or meditation',
    'Stand up and stretch every hour',
    'Go for a 10-minute walk after lunch',
    'Ensure 7-8 hours of sleep each night'
  ];
  
  // Check for user conditions to customize habits
  if (userProfile.conditions?.includes('Hypertension')) {
    habits.push('Monitor your blood pressure at the same time each day');
    habits.push('Limit sodium intake by avoiding processed foods');
  }
  
  if (userProfile.conditions?.includes('Diabetes')) {
    habits.push('Check your blood glucose levels as recommended by your doctor');
    habits.push('Include protein with each meal to stabilize blood sugar');
  }
  
  if (context.goals?.includes('Reduce stress')) {
    habits.push('Practice progressive muscle relaxation before bed');
    habits.push('Designate 15 minutes of worry-free time each day');
  }
  
  return habits.slice(0, 5); // Return top 5
};

const generateNutritionSuggestions = (userProfile, context) => {
  const suggestions = [
    'Include a variety of colorful vegetables daily',
    'Choose whole grains over refined carbohydrates',
    'Stay hydrated throughout the day',
    'Include lean protein sources in each meal',
    'Limit added sugars and processed foods'
  ];
  
  return suggestions;
};

const generateExerciseRecommendations = (userProfile, context) => {
  const recommendations = [
    'Aim for 150 minutes of moderate exercise weekly',
    'Include both cardio and strength training',
    'Find activities you enjoy to make exercise sustainable',
    'Start with small goals and gradually increase intensity',
    'Consider tracking your workouts to monitor progress'
  ];
  
  return recommendations;
};

const generateMentalWellbeingPractices = (userProfile, context) => {
  const practices = [
    'Practice mindfulness or meditation for 5-10 minutes daily',
    'Maintain social connections with friends and family',
    'Set boundaries for work and digital device usage',
    'Spend time in nature regularly',
    'Prioritize activities that bring you joy'
  ];
  
  return practices;
};

const recommendMetricsToTrack = (userProfile, context) => {
  const baseMetrics = ['Steps', 'Sleep Duration', 'Heart Rate'];
  
  const conditionalMetrics = [];
  
  if (userProfile.conditions?.includes('Hypertension')) {
    conditionalMetrics.push('Blood Pressure', 'Sodium Intake');
  }
  
  if (userProfile.conditions?.includes('Diabetes')) {
    conditionalMetrics.push('Blood Glucose', 'Carbohydrate Intake');
  }
  
  if (userProfile.age > 50) {
    conditionalMetrics.push('Weight', 'Cholesterol');
  }
  
  if (context.goals?.includes('Improve sleep')) {
    conditionalMetrics.push('Sleep Quality', 'Screen Time Before Bed');
  }
  
  if (context.goals?.includes('Reduce stress')) {
    conditionalMetrics.push('Stress Level', 'Meditation Minutes');
  }
  
  return [...baseMetrics, ...conditionalMetrics].slice(0, 6);
};
