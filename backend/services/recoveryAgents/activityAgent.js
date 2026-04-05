/**
 * Activity Agent - Enhanced Version
 * Handles SNAM Criteria: 2 (Interest/Enjoyment), 4 (Concentration), 9 (Psychomotor), 11 (Functioning)
 *
 * Full capabilities:
 * - Behavioral activation therapy
 * - Activity scheduling and tracking
 * - Social connection support
 * - Physical movement encouragement
 * - Micro-challenges and rewards
 * - Energy-matched activity suggestions
 */

const BaseAgent = require('./baseAgent');
const geminiService = require('../geminiService');

class ActivityAgent extends BaseAgent {
  constructor() {
    super(
      'activity',
      [2, 4, 9, 11],  // Interest, Concentration, Psychomotor, Functioning
      'behavioral activation coach focused on re-engaging with meaningful activities and building healthy routines'
    );

    this.interventions = [
      {
        id: 'micro_activation',
        level: 'light',
        title: 'Micro-Activation',
        description: 'Start with tiny activities lasting just 5 minutes. Success builds momentum.',
        duration: '5 minutes',
        type: 'behavioral_activation',
        examples: [
          'Step outside for fresh air',
          'Listen to one favorite song',
          'Text someone hello',
          'Make a cup of tea mindfully',
          'Look out the window for 5 minutes'
        ]
      },
      {
        id: 'pleasant_events',
        level: 'light',
        title: 'Pleasant Events Scheduling',
        description: 'Schedule one enjoyable activity each day, treating it as an appointment with yourself.',
        duration: '15-30 minutes daily',
        type: 'scheduling',
        steps: [
          'Choose one activity you used to enjoy',
          'Schedule a specific time for it',
          'Set a reminder',
          'Do it regardless of motivation (action before motivation)',
          'Rate enjoyment after (often better than expected)'
        ]
      },
      {
        id: 'social_micro',
        level: 'moderate',
        title: 'Social Micro-Connections',
        description: 'Small social interactions that don\'t require high energy.',
        duration: '5-15 minutes',
        type: 'social',
        examples: [
          'Send a thinking-of-you text to someone',
          'Comment on a friend\'s photo',
          'Have a 5-minute phone call',
          'Wave to a neighbor',
          'Chat briefly with a cashier'
        ]
      },
      {
        id: 'movement_snacks',
        level: 'moderate',
        title: 'Movement Snacks',
        description: 'Brief bursts of physical movement throughout the day.',
        duration: '2-5 minutes',
        type: 'physical',
        examples: [
          'Stretch at your desk',
          'Walk to get water',
          'Dance to one song',
          'Take stairs once',
          '10 jumping jacks'
        ]
      },
      {
        id: 'activity_hierarchy',
        level: 'intensive',
        title: 'Activity Hierarchy',
        description: 'Build a ladder from easy to challenging activities and climb it gradually.',
        duration: '2-3 weeks',
        type: 'behavioral_activation',
        steps: [
          'List activities from easiest to hardest',
          'Start with the easiest one',
          'Only move up when ready',
          'Celebrate each step',
          'Aim for the top over time'
        ]
      },
      {
        id: 'routine_building',
        level: 'intensive',
        title: 'Morning Routine Builder',
        description: 'Create a simple, consistent morning routine to start the day with momentum.',
        duration: '30-60 minutes morning routine',
        type: 'habit',
        template: [
          'Wake at consistent time',
          'Hydrate (glass of water)',
          'Brief movement (stretch/walk)',
          'One small accomplishment (make bed)',
          'Fuel (breakfast or snack)'
        ]
      }
    ];

    this.checkInQuestions = [
      {
        id: 'activity_done',
        text: 'Did you do any enjoyable activities today?',
        type: 'quick',
        quickResponses: [
          { label: 'Yes, several', value: 'multiple', score: 5 },
          { label: 'Yes, one thing', value: 'one', score: 4 },
          { label: 'Tried but didn\'t enjoy', value: 'tried', score: 3 },
          { label: 'No, couldn\'t motivate', value: 'none', score: 1 }
        ],
        followUp: true
      },
      {
        id: 'energy_level',
        text: 'How is your energy for activities today?',
        type: 'quick',
        quickResponses: [
          { label: 'Good energy', value: 'high', score: 5 },
          { label: 'Some energy', value: 'medium', score: 3 },
          { label: 'Low energy', value: 'low', score: 2 },
          { label: 'No energy at all', value: 'none', score: 1 }
        ],
        followUp: true
      },
      {
        id: 'social_connection',
        text: 'Did you connect with anyone today?',
        type: 'quick',
        quickResponses: [
          { label: 'Yes, good connection', value: 'good', score: 5 },
          { label: 'Brief interaction', value: 'brief', score: 3 },
          { label: 'No, kept to myself', value: 'none', score: 1 }
        ]
      },
      {
        id: 'movement',
        text: 'Did you do any physical movement today?',
        type: 'quick',
        quickResponses: [
          { label: 'Exercised', value: 'exercise', score: 5 },
          { label: 'Some walking', value: 'walking', score: 4 },
          { label: 'Light movement', value: 'light', score: 3 },
          { label: 'Very little', value: 'minimal', score: 2 },
          { label: 'None', value: 'none', score: 1 }
        ]
      },
      {
        id: 'accomplishment',
        text: 'Did you accomplish anything today, even something small?',
        type: 'quick',
        quickResponses: [
          { label: 'Yes, several things', value: 'multiple', score: 5 },
          { label: 'One or two things', value: 'some', score: 4 },
          { label: 'Something tiny', value: 'tiny', score: 3 },
          { label: 'Not really', value: 'none', score: 1 }
        ],
        followUp: true
      },
      {
        id: 'interest',
        text: 'Did anything feel interesting or enjoyable today?',
        type: 'open',
        placeholder: 'Even small moments count...'
      }
    ];

    // Activity suggestions by energy level
    this.activityBank = {
      veryLow: [
        { activity: 'Listen to calming music', duration: '5 min', type: 'passive' },
        { activity: 'Look at nature photos', duration: '5 min', type: 'passive' },
        { activity: 'Pet an animal', duration: '5 min', type: 'passive' },
        { activity: 'Watch clouds or rain', duration: '5 min', type: 'passive' },
        { activity: 'Smell something pleasant', duration: '1 min', type: 'sensory' }
      ],
      low: [
        { activity: 'Take a short walk outside', duration: '10 min', type: 'physical' },
        { activity: 'Call or text a friend', duration: '10 min', type: 'social' },
        { activity: 'Do gentle stretching', duration: '10 min', type: 'physical' },
        { activity: 'Read a few pages', duration: '10 min', type: 'mental' },
        { activity: 'Make a cup of tea mindfully', duration: '10 min', type: 'self-care' },
        { activity: 'Tidy one small area', duration: '10 min', type: 'accomplishment' }
      ],
      medium: [
        { activity: 'Go for a 20-min walk', duration: '20 min', type: 'physical' },
        { activity: 'Cook a simple meal', duration: '30 min', type: 'self-care' },
        { activity: 'Do a puzzle or craft', duration: '30 min', type: 'mental' },
        { activity: 'Watch a funny video compilation', duration: '15 min', type: 'mood' },
        { activity: 'Video call a friend', duration: '20 min', type: 'social' },
        { activity: 'Light gardening or plants care', duration: '20 min', type: 'nature' }
      ],
      high: [
        { activity: 'Exercise or workout', duration: '30-45 min', type: 'physical' },
        { activity: 'Meet a friend for coffee', duration: '1 hour', type: 'social' },
        { activity: 'Work on a hobby project', duration: '45 min', type: 'creative' },
        { activity: 'Explore somewhere new', duration: '1 hour', type: 'adventure' },
        { activity: 'Take a class or learn something', duration: '1 hour', type: 'growth' },
        { activity: 'Volunteer or help someone', duration: '1 hour', type: 'purpose' }
      ]
    };

    // Micro-challenges for motivation
    this.microChallenges = [
      { challenge: 'Take a photo of something beautiful today', reward: 'awareness boost' },
      { challenge: 'Give someone a genuine compliment', reward: 'connection' },
      { challenge: 'Try one new food or drink', reward: 'novelty' },
      { challenge: 'Write down 3 things you\'re grateful for', reward: 'perspective' },
      { challenge: 'Do something kind for yourself', reward: 'self-compassion' },
      { challenge: 'Move your body for 5 minutes', reward: 'energy' },
      { challenge: 'Reach out to someone you haven\'t talked to in a while', reward: 'reconnection' },
      { challenge: 'Spend 10 minutes in nature', reward: 'calm' },
      { challenge: 'Complete one task you\'ve been putting off', reward: 'accomplishment' },
      { challenge: 'Try a 2-minute breathing exercise', reward: 'center' }
    ];
  }

  /**
   * Get initial task when agent is activated
   */
  async getInitialTask(userId, severityScore, criterion) {
    let intervention;
    if (severityScore >= 3) {
      intervention = this.interventions.find(i => i.id === 'micro_activation');
    } else if (severityScore >= 2) {
      intervention = this.interventions.find(i => i.id === 'pleasant_events');
    } else {
      intervention = this.interventions.find(i => i.id === 'movement_snacks');
    }

    return {
      type: 'initial',
      agentName: this.name,
      title: intervention.title,
      description: intervention.description,
      intervention: intervention,
      priority: this.getPriority(severityScore),
      suggestedReminders: [
        { type: 'activity', time: '10:00', title: 'Morning activity reminder' },
        { type: 'activity', time: '15:00', title: 'Afternoon movement break' },
        { type: 'check_in', time: '19:00', title: 'Evening activity check-in' }
      ],
      welcomeMessage: await this.generateWelcomeMessage(severityScore),
      firstActivity: this.getActivitySuggestion('low')
    };
  }

  /**
   * Generate personalized welcome message
   */
  async generateWelcomeMessage(severityScore) {
    const messages = {
      high: `I'm your Activity Agent. I know it can be hard to find interest in things right now. We're going to start very small - no pressure. Even tiny actions can create momentum. Let's begin with something that takes just 5 minutes.`,
      medium: `I'm your Activity Agent, here to help you reconnect with enjoyable activities. We'll start with small, manageable steps and build from there. The goal is action first - motivation often follows.`,
      low: `I'm your Activity Agent. I'll help you maintain and build on the activities that bring you joy. Let's make sure you're getting a good balance of enjoyment, connection, and movement.`
    };

    const level = severityScore >= 3 ? 'high' : severityScore >= 2 ? 'medium' : 'low';

    return {
      text: messages[level],
      quickResponses: ['Sounds good', 'What do I do first?', 'I need something very easy']
    };
  }

  /**
   * Generate a daily check-in
   */
  async generateCheckIn(userId, recoveryData = null) {
    const hour = new Date().getHours();
    let question;
    let includeActivity = false;

    // Morning: energy-based suggestion
    if (hour < 12) {
      question = this.checkInQuestions.find(q => q.id === 'energy_level');
      includeActivity = true;
    }
    // Afternoon: movement check
    else if (hour < 17) {
      question = this.checkInQuestions.find(q => q.id === 'movement');
      includeActivity = true;
    }
    // Evening: accomplishment reflection
    else {
      question = this.checkInQuestions.find(q => q.id === 'accomplishment');
    }

    const response = {
      type: 'check_in',
      agentName: this.name,
      question: question,
      message: question.text,
      quickResponses: question.quickResponses,
      followUpEnabled: question.followUp || false
    };

    if (includeActivity) {
      response.suggestedActivity = this.getActivitySuggestion('low');
    }

    return response;
  }

  /**
   * Process user's response to check-in
   */
  async processResponse(userId, response, questionId, recoveryData = null) {
    let analysis;
    if (typeof response === 'object' && response.value !== undefined) {
      analysis = await this.analyzeQuickResponse(questionId, response);
    } else {
      analysis = await this.analyzeTextResponse(response, questionId);
    }

    const followUp = await this.generateFollowUp(analysis, questionId);

    return {
      agentName: this.name,
      understood: true,
      analysis: analysis,
      sentiment: analysis.sentiment,
      score: analysis.score,
      followUp: followUp.message,
      recommendation: followUp.recommendation,
      suggestedActivity: followUp.activity,
      microChallenge: followUp.challenge,
      shouldEscalate: analysis.shouldEscalate || false,
      nextAction: followUp.nextAction
    };
  }

  /**
   * Analyze quick response
   */
  async analyzeQuickResponse(questionId, response) {
    const analysis = {
      questionId,
      responseValue: response.value,
      score: response.score || 3,
      sentiment: 'neutral',
      concerns: [],
      positives: [],
      energyLevel: null
    };

    // Determine sentiment and flags based on question
    if (questionId === 'activity_done') {
      if (response.value === 'none') {
        analysis.sentiment = 'negative';
        analysis.concerns.push('No activities completed');
      } else if (response.value === 'multiple') {
        analysis.sentiment = 'positive';
        analysis.positives.push('Multiple activities completed');
      }
    }

    if (questionId === 'energy_level') {
      analysis.energyLevel = response.value;
      if (response.value === 'none' || response.value === 'low') {
        analysis.sentiment = 'negative';
        analysis.concerns.push('Low energy reported');
      } else if (response.value === 'high') {
        analysis.sentiment = 'positive';
        analysis.positives.push('Good energy levels');
      }
    }

    if (questionId === 'social_connection') {
      if (response.value === 'none') {
        analysis.concerns.push('No social connection today');
      }
    }

    return analysis;
  }

  /**
   * Analyze text response using LLM
   */
  async analyzeTextResponse(response, questionId) {
    try {
      const prompt = `You are a behavioral activation therapist analyzing a user's response about their activities.

Question context: ${questionId}
User's response: "${response}"

Analyze this response for:
1. Activity engagement level (high/medium/low/none)
2. Types of activities mentioned (social, physical, creative, accomplishment, etc.)
3. Sentiment and enjoyment level
4. Signs of progress or struggle
5. Energy level indicated

Respond in JSON:
{
  "sentiment": "positive/neutral/negative",
  "engagementLevel": "high/medium/low/none",
  "activityTypes": ["list of activity types"],
  "score": 1-5,
  "concerns": ["any concerns"],
  "positives": ["positive signs"],
  "suggestedFocus": "what type of activity to suggest next",
  "shouldEscalate": false
}`;

      const result = await geminiService.generateContent(prompt, 500);
      const cleaned = geminiService.cleanJsonResponse(result);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Activity analysis error:', error);
      return {
        sentiment: 'neutral',
        score: 3,
        concerns: [],
        positives: [],
        engagementLevel: 'medium'
      };
    }
  }

  /**
   * Generate follow-up based on analysis
   */
  async generateFollowUp(analysis, questionId) {
    const followUp = {
      message: '',
      recommendation: '',
      activity: null,
      challenge: null,
      nextAction: null
    };

    // Low energy responses
    if (analysis.energyLevel === 'none' || analysis.energyLevel === 'low') {
      followUp.message = 'When energy is low, even tiny actions count. Let\'s find something gentle.';
      followUp.activity = this.getActivitySuggestion('veryLow');
      followUp.recommendation = 'Try this: ' + followUp.activity.activity;
      return followUp;
    }

    // No activities completed
    if (analysis.concerns?.includes('No activities completed')) {
      followUp.message = 'That\'s okay - some days are harder than others. Would you like to try something small right now?';
      followUp.activity = this.getActivitySuggestion('low');
      followUp.recommendation = 'Here\'s an easy one: ' + followUp.activity.activity;
      followUp.nextAction = { type: 'suggest_activity', activity: followUp.activity };
      return followUp;
    }

    // No social connection
    if (analysis.concerns?.includes('No social connection today')) {
      followUp.message = 'Connection is important, even in small doses. Could you send someone a quick message?';
      followUp.recommendation = 'Try texting or calling someone you care about, even just to say hi.';
      followUp.nextAction = { type: 'social_prompt' };
      return followUp;
    }

    // Positive responses
    if (analysis.sentiment === 'positive') {
      followUp.message = 'That\'s great! Every activity builds momentum. How did it feel?';
      followUp.challenge = this.getMicroChallenge();
      followUp.recommendation = `Here's a small challenge for tomorrow: ${followUp.challenge.challenge}`;
      return followUp;
    }

    // Good energy - suggest more challenging activity
    if (analysis.energyLevel === 'high') {
      followUp.message = 'Great energy today! This is a good time to tackle something meaningful.';
      followUp.activity = this.getActivitySuggestion('high');
      followUp.recommendation = 'Consider: ' + followUp.activity.activity;
      return followUp;
    }

    // Default
    followUp.message = 'Thanks for checking in. Let\'s keep building those positive activities.';
    followUp.activity = this.getActivitySuggestion('medium');
    followUp.recommendation = 'Suggestion for tomorrow: ' + followUp.activity.activity;
    return followUp;
  }

  /**
   * Get activity suggestion based on energy level
   */
  getActivitySuggestion(energyLevel) {
    const bank = this.activityBank[energyLevel] || this.activityBank.low;
    return bank[Math.floor(Math.random() * bank.length)];
  }

  /**
   * Get multiple activity suggestions
   */
  getActivitySuggestions(energyLevel, count = 3) {
    const bank = this.activityBank[energyLevel] || this.activityBank.low;
    const shuffled = [...bank].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get a micro-challenge
   */
  getMicroChallenge() {
    return this.microChallenges[Math.floor(Math.random() * this.microChallenges.length)];
  }

  /**
   * Generate activity plan for the week
   */
  async generateWeeklyPlan(userPreferences = {}, energyPatterns = null) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const plan = {};

    days.forEach(day => {
      // Weekend activities can be longer
      const isWeekend = day === 'Saturday' || day === 'Sunday';
      const energyLevel = isWeekend ? 'medium' : 'low';

      plan[day] = {
        morning: this.getActivitySuggestion(energyLevel),
        afternoon: isWeekend ? this.getActivitySuggestion('medium') : null,
        evening: this.getActivitySuggestion('low'),
        challenge: Math.random() > 0.5 ? this.getMicroChallenge() : null
      };
    });

    return {
      weekStarting: new Date(),
      plan: plan,
      tips: [
        'Remember: action comes before motivation',
        'Even 5 minutes counts',
        'Rate your enjoyment after activities - it\'s often better than expected'
      ]
    };
  }

  /**
   * Get progress report
   */
  async getProgressReport(userId, recoveryData = null) {
    const checkIns = recoveryData?.checkIns?.filter(c => c.agentName === 'activity') || [];

    // Calculate engagement metrics
    const activityCheckIns = checkIns.filter(c => c.questionId === 'activity_done');
    const completedActivities = activityCheckIns.filter(c =>
      c.responseValue !== 'none' && c.responseValue !== 'tried'
    ).length;

    const engagementRate = activityCheckIns.length > 0
      ? (completedActivities / activityCheckIns.length * 100).toFixed(0)
      : 0;

    // Calculate average energy
    const energyCheckIns = checkIns.filter(c => c.questionId === 'energy_level');
    const avgEnergy = energyCheckIns.length > 0
      ? (energyCheckIns.reduce((sum, c) => sum + (c.score || 3), 0) / energyCheckIns.length).toFixed(1)
      : null;

    return {
      agentName: this.name,
      criteria: [2, 4, 9, 11],
      criterionNames: ['Interest/Enjoyment', 'Concentration', 'Psychomotor', 'Functioning'],
      totalCheckIns: checkIns.length,
      engagementRate: `${engagementRate}%`,
      averageEnergy: avgEnergy,
      activitiesCompleted: completedActivities,
      trend: parseInt(engagementRate) >= 50 ? 'on_track' : 'needs_attention',
      recommendations: parseInt(engagementRate) < 50
        ? ['Try starting with smaller activities', 'Set specific times for activities']
        : ['Keep up the momentum', 'Try gradually increasing activity duration']
    };
  }
}

module.exports = ActivityAgent;
