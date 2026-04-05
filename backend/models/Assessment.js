const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  sessionId: {
    type: String,
    required: [true, 'Session ID is required']
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  // Assessment chaining - context from previous assessments
  previousAssessmentContext: {
    trend: {
      type: String,
      enum: ['improving', 'worsening', 'stable', 'insufficient_data']
    },
    areasOfConcern: [String],
    lastAssessmentDate: Date,
    lastScore: Number
  },
  responses: [{
    questionId: {
      type: String,
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    questionCategory: {
      type: String,
      enum: ['initial', 'snam', 'follow-up', 'crisis', 'severe-followup', 'cultural', 'adaptive'],
      required: true
    },
    userResponse: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    snamMapping: {
      score: {
        type: Number,
        min: 0,
        max: 3
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      category: {
        type: String,
        enum: [
          'mood',
          'interest-enjoyment',
          'self-worth',
          'concentration',
          'worry',
          'scary-thoughts',
          'sleep-problems',
          'eating-changes',
          'psychomotor',
          'tiredness-low-energy',
          'functioning'
        ]
      },
      criteria: {
        type: Number,
        min: 1,
        max: 11
      },
      reasoning: String,
      // Confidence-weighted scoring fields
      ambiguityFactors: [String],
      needsClarification: Boolean,
      isLowConfidence: Boolean,
      wasRefined: Boolean,
      originalScore: Number,
      clarificationResponse: String
    }
  }],
  snamScores: {
    totalScore: {
      type: Number,
      min: 0,
      max: 33
    },
    // Confidence-weighted scoring metrics
    weightedScore: {
      type: Number,
      min: 0,
      max: 33
    },
    averageConfidence: {
      type: Number,
      min: 0,
      max: 1
    },
    lowConfidenceCriteria: [{
      criteria: Number,
      confidence: Number
    }],
    criteriaScores: [{
      criteria: {
        type: Number,
        min: 1,
        max: 11
      },
      category: {
        type: String,
        enum: [
          'mood',
          'interest-enjoyment',
          'self-worth',
          'concentration',
          'worry',
          'scary-thoughts',
          'sleep-problems',
          'eating-changes',
          'psychomotor',
          'tiredness-low-energy',
          'functioning'
        ]
      },
      score: {
        type: Number,
        min: 0,
        max: 3
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      }
    }],
    severityLevel: {
      type: String,
      enum: ['none', 'mild', 'moderate', 'severe']
    },
    meetsCoreCriteria: {
      type: Boolean,
      default: false
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  llmAnalysis: {
    overallAssessment: String,
    keyObservations: [String],
    riskFactors: [String],
    protectiveFactors: [String],
    confidenceLevel: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  recommendations: {
    lifestyleChanges: [{
      category: {
        type: String,
        enum: ['sleep', 'exercise', 'diet', 'social', 'mindfulness', 'professional']
      },
      title: String,
      description: String,
      priority: {
        type: String,
        enum: ['high', 'medium', 'low']
      },
      estimatedImpact: {
        type: String,
        enum: ['high', 'medium', 'low']
      }
    }],
    professionalHelp: {
      recommended: {
        type: Boolean,
        default: false
      },
      urgency: {
        type: String,
        enum: ['immediate', 'soon', 'consider', 'not needed', 'none']
      },
      reasoning: String,
      resources: [String]
    },
    followUpSchedule: {
      suggestedInterval: {
        type: Number, // days
        default: 7
      },
      nextAssessment: {
        type: Date
      }
    }
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: Date,
    duration: Number, // in seconds
    completionRate: {
      type: Number,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
assessmentSchema.index({ userId: 1, createdAt: -1 });
assessmentSchema.index({ sessionId: 1 }, { unique: true });
assessmentSchema.index({ status: 1 });
assessmentSchema.index({ 'snamScores.totalScore': 1 });
assessmentSchema.index({ 'snamScores.severityLevel': 1 });

// Virtual for assessment progress
assessmentSchema.virtual('progress').get(function() {
  if (this.totalQuestions === 0) return 0;
  return Math.round((this.currentQuestionIndex / this.totalQuestions) * 100);
});

// Method to add a response
assessmentSchema.methods.addResponse = function(questionId, questionText, questionCategory, userResponse, snamMapping = null) {
  this.responses.push({
    questionId,
    questionText,
    questionCategory,
    userResponse,
    snamMapping
  });
  this.currentQuestionIndex++;
  return this.save();
};

// Method to calculate SNAM total score with confidence weighting
// SNAM Scoring: 0-13 = No Depression, 14-16 = Mild, 17-20 = Moderate, 21-33 = Severe
// For criteria with sub-questions, take the higher score weighted by confidence
assessmentSchema.methods.calculateSNAMScore = function() {
  // Get all responses that have SNAM mapping
  const snamResponses = this.responses.filter(response =>
    response.snamMapping &&
    response.snamMapping.score !== undefined &&
    response.snamMapping.score >= 0
  );

  if (snamResponses.length === 0) {
    this.snamScores.totalScore = 0;
    this.snamScores.weightedScore = 0;
    this.snamScores.averageConfidence = 0;
    this.snamScores.severityLevel = 'none';
    this.snamScores.criteriaScores = [];
    this.snamScores.lowConfidenceCriteria = [];
    this.snamScores.meetsCoreCriteria = false;
    this.snamScores.lastUpdated = new Date();
    return;
  }

  // Map to store highest score for each criterion (1-11)
  const criteriaScoreMap = new Map();
  const criteriaCategoryMap = new Map();
  const criteriaConfidenceMap = new Map();

  // Confidence threshold for considering a score reliable
  const CONFIDENCE_THRESHOLD = 0.65;

  // Process responses - for sub-questions (a/b), prefer higher confidence, then higher score
  snamResponses.forEach(response => {
    if (response.snamMapping && response.snamMapping.score !== undefined) {
      const criteria = response.snamMapping.criteria;
      const score = response.snamMapping.score;
      const category = response.snamMapping.category;
      const confidence = response.snamMapping.confidence || 0.5;

      if (criteria) {
        const existingConfidence = criteriaConfidenceMap.get(criteria) || 0;
        const existingScore = criteriaScoreMap.get(criteria) || 0;

        // Prefer higher confidence scores, or higher scores at equal confidence
        if (confidence > existingConfidence ||
            (confidence === existingConfidence && score > existingScore)) {
          criteriaScoreMap.set(criteria, score);
          criteriaCategoryMap.set(criteria, category);
          criteriaConfidenceMap.set(criteria, confidence);
        }
      }
    }
  });

  // Calculate total score and weighted score
  let totalScore = 0;
  let totalWeightedScore = 0;
  let totalConfidence = 0;
  const criteriaScores = [];
  const lowConfidenceCriteria = [];

  criteriaScoreMap.forEach((score, criteria) => {
    const confidence = criteriaConfidenceMap.get(criteria) || 0.5;
    const category = criteriaCategoryMap.get(criteria);

    totalScore += score;
    totalWeightedScore += score * confidence;
    totalConfidence += confidence;

    criteriaScores.push({
      criteria: criteria,
      category: category,
      score: score,
      confidence: confidence
    });

    // Track low confidence criteria for potential follow-up
    if (confidence < CONFIDENCE_THRESHOLD) {
      lowConfidenceCriteria.push({
        criteria: criteria,
        confidence: confidence
      });
    }
  });

  const criteriaCount = criteriaScoreMap.size;
  const averageConfidence = criteriaCount > 0 ? totalConfidence / criteriaCount : 0;

  // Calculate normalized weighted score
  const weightedScore = averageConfidence > 0
    ? Math.round(totalWeightedScore / averageConfidence)
    : totalScore;

  this.snamScores.totalScore = totalScore;
  this.snamScores.weightedScore = weightedScore;
  this.snamScores.averageConfidence = Math.round(averageConfidence * 100) / 100;
  this.snamScores.criteriaScores = criteriaScores;
  this.snamScores.lowConfidenceCriteria = lowConfidenceCriteria;
  this.snamScores.lastUpdated = new Date();

  // Check if core criteria are met (criterion 1 or 2 must have score > 0)
  const moodScore = criteriaScoreMap.get(1) || 0;
  const interestScore = criteriaScoreMap.get(2) || 0;
  this.snamScores.meetsCoreCriteria = moodScore > 0 || interestScore > 0;

  // Determine severity level based on SNAM scoring matrix
  // Use weighted score for more accurate severity assessment
  const scoreForSeverity = weightedScore;
  if (scoreForSeverity <= 13) {
    this.snamScores.severityLevel = 'none';
  } else if (scoreForSeverity <= 16) {
    this.snamScores.severityLevel = 'mild';
  } else if (scoreForSeverity <= 20) {
    this.snamScores.severityLevel = 'moderate';
  } else {
    this.snamScores.severityLevel = 'severe';
  }
};

// Method to mark assessment as completed
assessmentSchema.methods.completeAssessment = function() {
  this.status = 'completed';
  this.metadata.endTime = new Date();
  this.metadata.duration = Math.round((this.metadata.endTime - this.metadata.startTime) / 1000);
  this.metadata.completionRate = 100;
  this.calculateSNAMScore();
  return this.save();
};

// Static method to clean up test data
assessmentSchema.statics.cleanupTestData = async function() {
  if (process.env.NODE_ENV === 'test') {
    await this.deleteMany({});
  }
};

// Static method to create test assessment
assessmentSchema.statics.createTestAssessment = async function(userId, sessionId = null) {
  const testSessionId = sessionId || `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const assessment = new this({
    userId,
    sessionId: testSessionId,
    status: 'in-progress',
    totalQuestions: 11
  });

  await assessment.save();
  return assessment;
};

module.exports = mongoose.model('Assessment', assessmentSchema);
