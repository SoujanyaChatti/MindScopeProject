/**
 * Recovery Model
 *
 * Stores user recovery journey data including:
 * - Active agents and their states
 * - Daily check-ins and responses
 * - Progress tracking per agent
 * - Intervention history
 * - Goals and milestones
 */

const mongoose = require('mongoose');

// Schema for individual check-in responses
const checkInResponseSchema = new mongoose.Schema({
  agentName: {
    type: String,
    required: true,
    enum: ['sleep', 'activity', 'mood', 'worry', 'nutrition', 'energy', 'social', 'learning']
  },
  question: String,
  response: String,
  quickResponse: String,  // If user selected a quick response option
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative']
  },
  score: {
    type: Number,
    min: 1,
    max: 5
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  followUp: String,
  agentRecommendation: String,
  // Voice analysis from SER
  voiceAnalysis: {
    dominantEmotion: String,
    emotions: mongoose.Schema.Types.Mixed,
    depressionScore: Number,
    prosody: mongoose.Schema.Types.Mixed,
    confidence: Number
  }
});

// Schema for micro-assessments
const microAssessmentSchema = new mongoose.Schema({
  agentName: String,
  assessmentType: String,
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  notes: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Schema for supervisor actions
const supervisorActionSchema = new mongoose.Schema({
  type: String,
  agentName: String,
  oldPriority: String,
  newPriority: String,
  reason: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Schema for cross-agent interventions
const crossInterventionSchema = new mongoose.Schema({
  id: String,
  primaryAgent: String,
  supportingAgents: [String],
  interventionType: String,
  plan: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Schema for escalations
const escalationSchema = new mongoose.Schema({
  id: String,
  urgency: {
    type: String,
    enum: ['immediate', 'urgent', 'routine']
  },
  reason: String,
  suggestedAction: String,
  resources: [mongoose.Schema.Types.Mixed],
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'resolved'],
    default: 'pending'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Schema for weekly reflections
const weeklyReflectionSchema = new mongoose.Schema({
  weekNumber: Number,
  summary: String,
  wins: [String],
  challenges: [{
    challenge: String,
    strategy: String
  }],
  nextWeekGoals: [String],
  focusArea: {
    area: String,
    why: String,
    howTo: String
  },
  analysis: mongoose.Schema.Types.Mixed,
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

// Schema for scheduled reflections
const scheduledReflectionSchema = new mongoose.Schema({
  id: String,
  type: {
    type: String,
    enum: ['daily', 'weekly', 'milestone']
  },
  focusAreas: [String],
  scheduledFor: Date,
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'skipped'],
    default: 'scheduled'
  },
  questions: [String],
  responses: mongoose.Schema.Types.Mixed
});

// Schema for tracking progress per criterion
const criterionProgressSchema = new mongoose.Schema({
  criterion: {
    type: Number,
    min: 1,
    max: 11
  },
  criterionName: String,
  initialScore: Number,
  currentScore: Number,
  scores: [{
    score: Number,
    date: Date
  }],
  trend: {
    type: String,
    enum: ['improving', 'stable', 'worsening', 'insufficient_data'],
    default: 'insufficient_data'
  }
});

// Schema for agent-specific state
const agentStateSchema = new mongoose.Schema({
  agentName: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  activatedAt: Date,
  deactivatedAt: Date,
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  currentIntervention: {
    title: String,
    description: String,
    level: String,
    startedAt: Date,
    completedAt: Date
  },
  interventionHistory: [{
    title: String,
    level: String,
    startedAt: Date,
    completedAt: Date,
    effectiveness: {
      type: String,
      enum: ['very_helpful', 'somewhat_helpful', 'not_helpful', 'not_rated']
    }
  }],
  checkInStreak: {
    type: Number,
    default: 0
  },
  lastCheckIn: Date,
  totalCheckIns: {
    type: Number,
    default: 0
  },
  customSettings: mongoose.Schema.Types.Mixed  // Agent-specific settings
});

// Schema for goals
const goalSchema = new mongoose.Schema({
  agentName: String,
  title: String,
  description: String,
  targetDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
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
  }
});

// Schema for reminders
const reminderSchema = new mongoose.Schema({
  agentName: String,
  type: {
    type: String,
    enum: ['check_in', 'activity', 'medication', 'sleep', 'meal', 'exercise', 'custom']
  },
  title: String,
  time: String,  // HH:MM format
  days: [String],  // ['monday', 'tuesday', ...]
  isActive: {
    type: Boolean,
    default: true
  },
  lastTriggered: Date,
  snoozeCount: {
    type: Number,
    default: 0
  }
});

// Main Recovery Schema
const recoverySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Link to triggering assessment
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment'
  },

  // Recovery plan status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'abandoned'],
    default: 'active'
  },

  // Plan duration
  planStartDate: {
    type: Date,
    default: Date.now
  },
  planEndDate: Date,
  plannedDurationDays: {
    type: Number,
    default: 14  // 2 weeks default
  },

  // Severity at start (from assessment)
  initialSeverity: {
    level: String,
    totalScore: Number,
    criteriaScores: mongoose.Schema.Types.Mixed
  },

  // Active agents
  activeAgents: [agentStateSchema],

  // All check-in responses
  checkIns: [checkInResponseSchema],

  // Progress per criterion
  criteriaProgress: [criterionProgressSchema],

  // User goals
  goals: [goalSchema],

  // Reminders
  reminders: [reminderSchema],

  // Daily summaries
  dailySummaries: [{
    date: Date,
    overallMood: Number,
    completedCheckIns: Number,
    completedActivities: Number,
    notes: String,
    agentSummaries: mongoose.Schema.Types.Mixed
  }],

  // Weekly progress reports
  weeklyReports: [{
    weekNumber: Number,
    startDate: Date,
    endDate: Date,
    overallProgress: String,
    criteriaChanges: mongoose.Schema.Types.Mixed,
    recommendations: [String],
    generatedAt: Date
  }],

  // User preferences
  preferences: {
    checkInTime: {
      type: String,
      default: '20:00'  // 8 PM default
    },
    checkInFrequency: {
      type: String,
      enum: ['daily', 'twice_daily', 'every_other_day'],
      default: 'daily'
    },
    preferredLanguage: {
      type: String,
      default: 'en'
    },
    enableVoice: {
      type: Boolean,
      default: false
    },
    enableReminders: {
      type: Boolean,
      default: true
    }
  },

  // ============================================
  // ADVANCED AGENTIC FEATURES
  // ============================================

  // Micro-assessments for outcome tracking
  microAssessments: [microAssessmentSchema],

  // Supervisor agent actions
  supervisorActions: [supervisorActionSchema],

  // Cross-agent interventions
  crossInterventions: [crossInterventionSchema],

  // Escalations to human/crisis resources
  escalations: [escalationSchema],

  // Weekly reflections generated by supervisor
  weeklyReflections: [weeklyReflectionSchema],

  // Scheduled reflections
  scheduledReflections: [scheduledReflectionSchema],

  // Intervention adjustments log
  interventionAdjustments: [{
    agentName: String,
    previousLevel: String,
    newLevel: String,
    direction: String,
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Crisis flag
  crisisFlag: {
    type: Boolean,
    default: false
  },
  crisisFlaggedAt: Date,

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
recoverySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to add a check-in response
recoverySchema.methods.addCheckIn = function(checkInData) {
  this.checkIns.push(checkInData);

  // Update agent state
  const agent = this.activeAgents.find(a => a.agentName === checkInData.agentName);
  if (agent) {
    agent.lastCheckIn = new Date();
    agent.totalCheckIns += 1;

    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (agent.lastCheckIn && agent.lastCheckIn >= yesterday) {
      agent.checkInStreak += 1;
    } else {
      agent.checkInStreak = 1;
    }
  }

  return this.save();
};

// Method to get agent state
recoverySchema.methods.getAgentState = function(agentName) {
  return this.activeAgents.find(a => a.agentName === agentName);
};

// Method to update criterion progress
recoverySchema.methods.updateCriterionProgress = function(criterion, newScore) {
  let progress = this.criteriaProgress.find(p => p.criterion === criterion);

  if (!progress) {
    progress = {
      criterion,
      initialScore: newScore,
      currentScore: newScore,
      scores: [{ score: newScore, date: new Date() }]
    };
    this.criteriaProgress.push(progress);
  } else {
    progress.currentScore = newScore;
    progress.scores.push({ score: newScore, date: new Date() });

    // Calculate trend
    if (progress.scores.length >= 3) {
      const recent = progress.scores.slice(-3).map(s => s.score);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

      if (avg < progress.initialScore - 0.5) {
        progress.trend = 'improving';
      } else if (avg > progress.initialScore + 0.5) {
        progress.trend = 'worsening';
      } else {
        progress.trend = 'stable';
      }
    }
  }

  return this.save();
};

// Method to generate daily summary
recoverySchema.methods.generateDailySummary = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCheckIns = this.checkIns.filter(c => {
    const checkInDate = new Date(c.timestamp);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate.getTime() === today.getTime();
  });

  const moodCheckIns = todayCheckIns.filter(c => c.agentName === 'mood');
  const avgMood = moodCheckIns.length > 0
    ? moodCheckIns.reduce((sum, c) => sum + (c.score || 3), 0) / moodCheckIns.length
    : null;

  const summary = {
    date: today,
    overallMood: avgMood,
    completedCheckIns: todayCheckIns.length,
    completedActivities: 0,  // Would be tracked separately
    agentSummaries: {}
  };

  // Group check-ins by agent
  this.activeAgents.forEach(agent => {
    const agentCheckIns = todayCheckIns.filter(c => c.agentName === agent.agentName);
    summary.agentSummaries[agent.agentName] = {
      checkIns: agentCheckIns.length,
      lastResponse: agentCheckIns[agentCheckIns.length - 1]?.response
    };
  });

  this.dailySummaries.push(summary);
  return this.save();
};

// Static method to get or create recovery for user
recoverySchema.statics.getOrCreateForUser = async function(userId, assessmentData = null) {
  let recovery = await this.findOne({ userId, status: 'active' });

  if (!recovery && assessmentData) {
    recovery = new this({
      userId,
      assessmentId: assessmentData._id,
      initialSeverity: {
        level: assessmentData.snamScores?.severityLevel,
        totalScore: assessmentData.snamScores?.totalScore,
        criteriaScores: assessmentData.snamScores?.criteriaScores
      }
    });
    await recovery.save();
  }

  return recovery;
};

const Recovery = mongoose.model('Recovery', recoverySchema);

module.exports = Recovery;
