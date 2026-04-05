/**
 * Seed Script: Create Dummy Account with All Recovery Agents Enabled
 *
 * This script creates a test/demo account with:
 * - A user account (demo@mindscope.com)
 * - A completed assessment with moderate severity scores
 * - An active recovery plan with all 6 agents enabled
 * - Some sample check-ins and goals
 *
 * Usage: node scripts/seedDummyAccount.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Assessment = require('../models/Assessment');
const Recovery = require('../models/Recovery');

const DEMO_USER = {
  email: 'demo@mindscope.com',
  password: 'Demo123!',
  firstName: 'Demo',
  lastName: 'User',
  dateOfBirth: new Date('1995-06-15'),
  gender: 'prefer-not-to-say',
  phoneNumber: '+1234567890',
  profileCompleted: true,
  isActive: true
};

// Assessment with moderate scores to activate all agents
const DEMO_ASSESSMENT = {
  sessionId: `demo-session-${Date.now()}`,
  status: 'completed',
  currentQuestionIndex: 11,
  totalQuestions: 11,
  snamScores: {
    totalScore: 18,  // Moderate severity
    weightedScore: 17,
    averageConfidence: 0.85,
    severityLevel: 'moderate',
    meetsCoreCriteria: true,
    criteriaScores: [
      { criteria: 1, category: 'mood', score: 2, confidence: 0.85 },
      { criteria: 2, category: 'interest-enjoyment', score: 2, confidence: 0.8 },
      { criteria: 3, category: 'self-worth', score: 2, confidence: 0.85 },
      { criteria: 4, category: 'concentration', score: 1, confidence: 0.9 },
      { criteria: 5, category: 'worry', score: 2, confidence: 0.85 },
      { criteria: 6, category: 'scary-thoughts', score: 0, confidence: 0.95 },
      { criteria: 7, category: 'sleep-problems', score: 2, confidence: 0.9 },
      { criteria: 8, category: 'eating-changes', score: 2, confidence: 0.8 },
      { criteria: 9, category: 'psychomotor', score: 1, confidence: 0.85 },
      { criteria: 10, category: 'tiredness-low-energy', score: 2, confidence: 0.9 },
      { criteria: 11, category: 'functioning', score: 2, confidence: 0.85 }
    ],
    lowConfidenceCriteria: [],
    lastUpdated: new Date()
  },
  llmAnalysis: {
    overallAssessment: 'Demo user with moderate depression symptoms across multiple areas.',
    keyObservations: [
      'Sleep difficulties present',
      'Reduced interest in activities',
      'Some worry and anxiety symptoms',
      'Appetite changes noted',
      'Low energy levels'
    ],
    riskFactors: ['Sleep disturbance', 'Low motivation'],
    protectiveFactors: ['Seeking help', 'Social support available'],
    confidenceLevel: 0.85
  },
  recommendations: {
    lifestyleChanges: [
      { category: 'sleep', title: 'Sleep Hygiene', description: 'Establish consistent sleep schedule', priority: 'high', estimatedImpact: 'high' },
      { category: 'exercise', title: 'Gentle Movement', description: 'Daily walks', priority: 'medium', estimatedImpact: 'medium' }
    ],
    professionalHelp: {
      recommended: false,
      urgency: 'consider',
      reasoning: 'Moderate symptoms manageable with self-help strategies'
    },
    followUpSchedule: {
      suggestedInterval: 7,
      nextAssessment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  },
  responses: [
    {
      questionId: 'demo-1',
      questionText: 'How have you been feeling emotionally over the past two weeks?',
      questionCategory: 'snam',
      userResponse: 'Sometimes feeling down and sad, especially in the evenings',
      snamMapping: { score: 2, confidence: 0.85, category: 'mood', criteria: 1 }
    },
    {
      questionId: 'demo-2',
      questionText: 'Have you noticed any changes in your interest or enjoyment in activities?',
      questionCategory: 'snam',
      userResponse: 'Less interested in things I used to enjoy, harder to get motivated',
      snamMapping: { score: 2, confidence: 0.8, category: 'interest-enjoyment', criteria: 2 }
    },
    {
      questionId: 'demo-3',
      questionText: 'How do you feel about yourself lately?',
      questionCategory: 'snam',
      userResponse: 'Sometimes feeling not good enough, but trying to stay positive',
      snamMapping: { score: 2, confidence: 0.85, category: 'self-worth', criteria: 3 }
    },
    {
      questionId: 'demo-4',
      questionText: 'Have you had any difficulty concentrating?',
      questionCategory: 'snam',
      userResponse: 'A little distracted sometimes but mostly okay',
      snamMapping: { score: 1, confidence: 0.9, category: 'concentration', criteria: 4 }
    },
    {
      questionId: 'demo-5',
      questionText: 'Have you been feeling worried or anxious?',
      questionCategory: 'snam',
      userResponse: 'Yes, worrying about work and the future quite a bit',
      snamMapping: { score: 2, confidence: 0.85, category: 'worry', criteria: 5 }
    },
    {
      questionId: 'demo-6',
      questionText: 'Have you had any thoughts of harming yourself?',
      questionCategory: 'snam',
      userResponse: 'No, nothing like that',
      snamMapping: { score: 0, confidence: 0.95, category: 'scary-thoughts', criteria: 6 }
    },
    {
      questionId: 'demo-7',
      questionText: 'How has your sleep been?',
      questionCategory: 'snam',
      userResponse: 'Trouble falling asleep, waking up during the night',
      snamMapping: { score: 2, confidence: 0.9, category: 'sleep-problems', criteria: 7 }
    },
    {
      questionId: 'demo-8',
      questionText: 'Have you noticed any changes in your appetite or eating habits?',
      questionCategory: 'snam',
      userResponse: 'Eating less than usual, not as hungry',
      snamMapping: { score: 2, confidence: 0.8, category: 'eating-changes', criteria: 8 }
    },
    {
      questionId: 'demo-9',
      questionText: 'Have you felt restless or slowed down physically?',
      questionCategory: 'snam',
      userResponse: 'A bit sluggish sometimes',
      snamMapping: { score: 1, confidence: 0.85, category: 'psychomotor', criteria: 9 }
    },
    {
      questionId: 'demo-10',
      questionText: 'How are your energy levels?',
      questionCategory: 'snam',
      userResponse: 'Feeling tired most days, low energy',
      snamMapping: { score: 2, confidence: 0.9, category: 'tiredness-low-energy', criteria: 10 }
    },
    {
      questionId: 'demo-11',
      questionText: 'How has this been affecting your daily life and functioning?',
      questionCategory: 'snam',
      userResponse: 'Making it harder to do my normal activities, work is challenging',
      snamMapping: { score: 2, confidence: 0.85, category: 'functioning', criteria: 11 }
    }
  ],
  metadata: {
    startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    endTime: new Date(),
    duration: 1800,
    completionRate: 100
  }
};

// Recovery plan with all agents active
const DEMO_RECOVERY = {
  status: 'active',
  planStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Started 7 days ago
  plannedDurationDays: 14,
  activeAgents: [
    {
      agentName: 'sleep',
      isActive: true,
      activatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      priority: 'high',
      checkInStreak: 5,
      lastCheckIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      totalCheckIns: 7,
      currentIntervention: {
        title: 'Sleep Hygiene Basics',
        description: 'Establish consistent sleep and wake times',
        level: 'moderate',
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    },
    {
      agentName: 'activity',
      isActive: true,
      activatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      priority: 'medium',
      checkInStreak: 4,
      lastCheckIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      totalCheckIns: 6,
      currentIntervention: {
        title: 'Gentle Movement',
        description: 'Short daily walks to rebuild activity',
        level: 'light',
        startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      }
    },
    {
      agentName: 'mood',
      isActive: true,
      activatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      priority: 'high',
      checkInStreak: 6,
      lastCheckIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      totalCheckIns: 8,
      currentIntervention: {
        title: 'Mood Tracking',
        description: 'Daily mood check-ins to identify patterns',
        level: 'light',
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    },
    {
      agentName: 'worry',
      isActive: true,
      activatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      priority: 'medium',
      checkInStreak: 3,
      lastCheckIn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      totalCheckIns: 5,
      currentIntervention: {
        title: 'Grounding Basics',
        description: 'Learning 5-4-3-2-1 grounding technique',
        level: 'light',
        startedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      }
    },
    {
      agentName: 'nutrition',
      isActive: true,
      activatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      priority: 'low',
      checkInStreak: 2,
      lastCheckIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      totalCheckIns: 4,
      currentIntervention: {
        title: 'Regular Meals',
        description: 'Focus on eating at consistent times',
        level: 'light',
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    },
    {
      agentName: 'energy',
      isActive: true,
      activatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      priority: 'medium',
      checkInStreak: 4,
      lastCheckIn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      totalCheckIns: 5,
      currentIntervention: {
        title: 'Energy Awareness',
        description: 'Tracking energy levels throughout the day',
        level: 'light',
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    }
  ],
  checkIns: [
    // Sleep check-ins
    {
      agentName: 'sleep',
      question: 'How did you sleep last night?',
      response: 'Took a while to fall asleep but slept through the night',
      sentiment: 'neutral',
      score: 3,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      agentName: 'sleep',
      question: 'How rested do you feel this morning?',
      quickResponse: 'Somewhat rested',
      sentiment: 'neutral',
      score: 3,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    // Mood check-ins
    {
      agentName: 'mood',
      question: 'How are you feeling emotionally today?',
      response: 'A bit better than yesterday, had some moments of peace',
      sentiment: 'positive',
      score: 3,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      agentName: 'mood',
      question: 'What was the highlight of your day?',
      response: 'Had a nice conversation with a friend',
      sentiment: 'positive',
      score: 4,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    // Activity check-ins
    {
      agentName: 'activity',
      question: 'Did you do any activities today?',
      quickResponse: 'A short walk',
      sentiment: 'positive',
      score: 3,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    // Worry check-ins
    {
      agentName: 'worry',
      question: 'How is your anxiety level today?',
      quickResponse: 'Slightly on edge',
      sentiment: 'neutral',
      score: 3,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    // Nutrition check-ins
    {
      agentName: 'nutrition',
      question: 'Have you eaten regular meals today?',
      quickResponse: 'Skipped one',
      sentiment: 'neutral',
      score: 2,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    // Energy check-ins
    {
      agentName: 'energy',
      question: 'How is your energy level today?',
      quickResponse: 'Low but manageable',
      sentiment: 'neutral',
      score: 2,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ],
  goals: [
    {
      agentName: 'sleep',
      title: 'Consistent bedtime',
      description: 'Go to bed by 11pm every night this week',
      status: 'active',
      progress: 60,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      agentName: 'activity',
      title: 'Daily walk',
      description: 'Take a 10-minute walk every day',
      status: 'active',
      progress: 70,
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    },
    {
      agentName: 'mood',
      title: 'Gratitude practice',
      description: 'Write down 3 things I\'m grateful for each day',
      status: 'active',
      progress: 40,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  ],
  dailySummaries: [
    {
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      overallMood: 3.5,
      completedCheckIns: 5,
      completedActivities: 2,
      notes: 'Good day overall, completed walk and sleep check-in'
    },
    {
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      overallMood: 3,
      completedCheckIns: 4,
      completedActivities: 1,
      notes: 'Challenging day but managed to check in'
    }
  ],
  preferences: {
    checkInTime: '20:00',
    checkInFrequency: 'daily',
    preferredLanguage: 'en',
    enableVoice: false,
    enableReminders: true
  }
};

async function seedDummyAccount() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindscope';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if demo user already exists
    let user = await User.findOne({ email: DEMO_USER.email });

    if (user) {
      console.log('Demo user already exists. Cleaning up old data...');
      // Clean up existing assessment and recovery
      await Assessment.deleteMany({ userId: user._id });
      await Recovery.deleteMany({ userId: user._id });
    } else {
      // Create new user
      console.log('Creating demo user...');
      user = new User(DEMO_USER);
      await user.save();
      console.log('Demo user created:', user.email);
    }

    // Create assessment
    console.log('Creating demo assessment...');
    const assessment = new Assessment({
      userId: user._id,
      ...DEMO_ASSESSMENT
    });
    await assessment.save();
    console.log('Demo assessment created');

    // Update user's assessment count
    user.lastAssessmentDate = new Date();
    user.totalAssessments = 1;
    await user.save();

    // Create recovery plan
    console.log('Creating demo recovery plan with all agents...');
    const recovery = new Recovery({
      userId: user._id,
      assessmentId: assessment._id,
      initialSeverity: {
        level: DEMO_ASSESSMENT.snamScores.severityLevel,
        totalScore: DEMO_ASSESSMENT.snamScores.totalScore,
        criteriaScores: DEMO_ASSESSMENT.snamScores.criteriaScores
      },
      ...DEMO_RECOVERY
    });
    await recovery.save();
    console.log('Demo recovery plan created');

    console.log('\n========================================');
    console.log('DEMO ACCOUNT CREATED SUCCESSFULLY');
    console.log('========================================');
    console.log(`Email: ${DEMO_USER.email}`);
    console.log(`Password: ${DEMO_USER.password}`);
    console.log('');
    console.log('Active Recovery Agents:');
    DEMO_RECOVERY.activeAgents.forEach(agent => {
      console.log(`  - ${agent.agentName} (Priority: ${agent.priority})`);
    });
    console.log('');
    console.log('API Endpoints to test:');
    console.log('  GET  /api/recovery/status');
    console.log('  GET  /api/recovery/check-in');
    console.log('  POST /api/recovery/check-in');
    console.log('  GET  /api/recovery/progress');
    console.log('  GET  /api/recovery/agents/sleep/exercises');
    console.log('  GET  /api/recovery/agents/mood/affirmation');
    console.log('  GET  /api/recovery/agents/worry/grounding');
    console.log('  POST /api/recovery/agents/mood/reframe');
    console.log('  POST /api/recovery/agents/worry/process');
    console.log('========================================\n');

    await mongoose.disconnect();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding dummy account:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedDummyAccount();
