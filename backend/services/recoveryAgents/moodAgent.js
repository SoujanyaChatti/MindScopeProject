/**
 * Mood Agent - Enhanced Version
 * Handles SNAM Criteria: 1 (Mood), 3 (Self-worth)
 *
 * Full capabilities:
 * - Mood tracking and patterns
 * - Cognitive restructuring (CBT)
 * - Self-compassion exercises
 * - Gratitude practices
 * - Thought reframing
 * - Daily affirmations
 * - Mood-boosting activities
 */

const BaseAgent = require('./baseAgent');
const geminiService = require('../geminiService');

class MoodAgent extends BaseAgent {
  constructor() {
    super(
      'mood',
      [1, 3],  // Mood, Self-worth
      'mood and self-compassion coach focused on emotional awareness, cognitive well-being, and building self-worth'
    );

    this.interventions = [
      {
        id: 'mood_awareness',
        level: 'light',
        title: 'Mood Awareness',
        description: 'Simply noticing and naming emotions without judgment.',
        duration: '2-5 minutes',
        type: 'awareness',
        steps: [
          'Pause and ask: What am I feeling right now?',
          'Name the emotion (sad, anxious, frustrated, numb, etc.)',
          'Notice where you feel it in your body',
          'Accept it without trying to change it',
          'Remind yourself: feelings are temporary'
        ]
      },
      {
        id: 'gratitude_practice',
        level: 'light',
        title: 'Gratitude Moments',
        description: 'Finding small things to appreciate, even on hard days.',
        duration: '3-5 minutes',
        type: 'positive_psychology',
        examples: [
          'A warm drink',
          'A comfortable chair',
          'A text from someone',
          'A moment of quiet',
          'Something that made you smile'
        ]
      },
      {
        id: 'self_compassion',
        level: 'moderate',
        title: 'Self-Compassion Break',
        description: 'Treating yourself with the kindness you\'d offer a friend.',
        duration: '5-10 minutes',
        type: 'self_compassion',
        script: `When you notice self-criticism, try this:

1. ACKNOWLEDGE: "This is a moment of difficulty."
2. COMMON HUMANITY: "Struggle is part of being human. I'm not alone in this."
3. KINDNESS: "May I be kind to myself. May I give myself the compassion I need."

Place your hand on your heart if it helps. Breathe slowly.`
      },
      {
        id: 'thought_record',
        level: 'moderate',
        title: 'Thought Record (CBT)',
        description: 'Examining and reframing unhelpful thoughts.',
        duration: '10-15 minutes',
        type: 'cognitive',
        steps: [
          'Situation: What happened?',
          'Emotion: What did you feel? (Rate 0-100)',
          'Automatic Thought: What went through your mind?',
          'Evidence For: What supports this thought?',
          'Evidence Against: What doesn\'t support it?',
          'Balanced Thought: What\'s a more balanced view?',
          'Re-rate Emotion: How do you feel now? (0-100)'
        ]
      },
      {
        id: 'cognitive_distortions',
        level: 'intensive',
        title: 'Identifying Thinking Patterns',
        description: 'Recognizing common unhelpful thinking styles.',
        duration: '15-20 minutes',
        type: 'cognitive',
        patterns: [
          { name: 'All-or-Nothing', description: 'Seeing things in black and white', example: '"If I\'m not perfect, I\'m a failure"' },
          { name: 'Catastrophizing', description: 'Expecting the worst', example: '"This will definitely go wrong"' },
          { name: 'Mind Reading', description: 'Assuming what others think', example: '"They must think I\'m stupid"' },
          { name: 'Should Statements', description: 'Rigid rules for self/others', example: '"I should be able to handle this"' },
          { name: 'Emotional Reasoning', description: 'Feelings as facts', example: '"I feel worthless, so I must be"' },
          { name: 'Labeling', description: 'Fixed labels on self', example: '"I\'m a loser"' }
        ]
      },
      {
        id: 'values_reflection',
        level: 'intensive',
        title: 'Values & Strengths Reflection',
        description: 'Reconnecting with what matters and recognizing your qualities.',
        duration: '20-30 minutes',
        type: 'positive_psychology',
        prompts: [
          'What qualities do people who care about you see in you?',
          'What have you overcome in your life?',
          'What values are most important to you?',
          'When have you shown strength or kindness?',
          'What would you want a friend to know about you?'
        ]
      }
    ];

    this.checkInQuestions = [
      {
        id: 'mood_rating',
        text: 'How would you rate your mood right now?',
        type: 'scale',
        scale: { min: 1, max: 10, labels: ['Very low', 'Neutral', 'Very good'] },
        quickResponses: [
          { label: 'Great (8-10)', value: 9, emoji: '😊' },
          { label: 'Good (6-7)', value: 7, emoji: '🙂' },
          { label: 'Okay (5)', value: 5, emoji: '😐' },
          { label: 'Low (3-4)', value: 4, emoji: '😔' },
          { label: 'Very low (1-2)', value: 2, emoji: '😢' }
        ],
        followUp: true
      },
      {
        id: 'mood_word',
        text: 'What word best describes how you\'re feeling?',
        type: 'open',
        suggestions: ['sad', 'anxious', 'numb', 'frustrated', 'lonely', 'hopeful', 'calm', 'content'],
        followUp: true
      },
      {
        id: 'self_talk',
        text: 'Have you noticed any self-critical thoughts today?',
        type: 'quick',
        quickResponses: [
          { label: 'No, feeling okay about myself', value: 'none', score: 5 },
          { label: 'A few minor ones', value: 'few', score: 3 },
          { label: 'Yes, quite a lot', value: 'many', score: 2 },
          { label: 'Very harsh self-criticism', value: 'severe', score: 1 }
        ],
        followUp: true
      },
      {
        id: 'positive_moment',
        text: 'Was there any positive moment today, even small?',
        type: 'open',
        placeholder: 'Even tiny moments count...'
      },
      {
        id: 'mood_trigger',
        text: 'Do you know what influenced your mood today?',
        type: 'quick',
        quickResponses: [
          { label: 'Yes, something specific', value: 'known' },
          { label: 'A few things', value: 'multiple' },
          { label: 'Not sure', value: 'unclear' },
          { label: 'Feels random', value: 'random' }
        ],
        followUp: true
      },
      {
        id: 'comparison',
        text: 'How does today compare to yesterday?',
        type: 'quick',
        quickResponses: [
          { label: 'Better', value: 'better', score: 5 },
          { label: 'About the same', value: 'same', score: 3 },
          { label: 'Worse', value: 'worse', score: 2 }
        ]
      }
    ];

    // Affirmations categorized by need
    this.affirmations = {
      selfWorth: [
        'You are worthy of love and kindness, especially from yourself.',
        'Your worth is not determined by your productivity.',
        'You are enough, just as you are right now.',
        'Mistakes don\'t define you - they help you grow.',
        'You deserve compassion, especially on hard days.'
      ],
      resilience: [
        'You have survived 100% of your worst days so far.',
        'This feeling is temporary. It will pass.',
        'You are stronger than you think.',
        'Small steps forward are still progress.',
        'It\'s okay to take things one moment at a time.'
      ],
      selfCompassion: [
        'It\'s okay to not be okay.',
        'You\'re doing the best you can with what you have.',
        'Being hard on yourself doesn\'t help - kindness does.',
        'You don\'t have to have it all figured out.',
        'Rest is not laziness - it\'s recovery.'
      ],
      hope: [
        'Better days are coming.',
        'This chapter doesn\'t define your whole story.',
        'You have gotten through hard times before.',
        'There are people who care about you.',
        'Tomorrow is a fresh start.'
      ]
    };

    // Thought reframing templates
    this.reframingTemplates = [
      {
        pattern: 'I\'m worthless',
        questions: ['What would a friend say to you?', 'What have you accomplished, even small things?', 'Is this thought helpful or harmful?'],
        reframe: 'I\'m struggling right now, but I have worth regardless of how I feel.'
      },
      {
        pattern: 'I always fail',
        questions: ['Is "always" really accurate?', 'Can you think of any successes?', 'What would you tell a friend who said this?'],
        reframe: 'I\'ve had setbacks, but I\'ve also had successes. One outcome doesn\'t define my ability.'
      },
      {
        pattern: 'Nobody cares',
        questions: ['Is there anyone who has shown care?', 'Might people care but not know how to show it?', 'Are you reaching out?'],
        reframe: 'It might feel that way right now, but there are people who care. I could try reaching out.'
      },
      {
        pattern: 'I should be better',
        questions: ['By whose standards?', 'Are these expectations realistic?', 'What if you\'re doing your best right now?'],
        reframe: 'I\'m doing what I can. Growth takes time, and I\'m allowed to be where I am.'
      }
    ];
  }

  /**
   * Get initial task when agent is activated
   */
  async getInitialTask(userId, severityScore, criterion) {
    let intervention;
    if (severityScore >= 3) {
      intervention = this.interventions.find(i => i.id === 'self_compassion');
    } else if (severityScore >= 2) {
      intervention = this.interventions.find(i => i.id === 'gratitude_practice');
    } else {
      intervention = this.interventions.find(i => i.id === 'mood_awareness');
    }

    return {
      type: 'initial',
      agentName: this.name,
      title: intervention.title,
      description: intervention.description,
      intervention: intervention,
      priority: this.getPriority(severityScore),
      suggestedReminders: [
        { type: 'check_in', time: '09:00', title: 'Morning mood check-in' },
        { type: 'check_in', time: '21:00', title: 'Evening reflection' }
      ],
      welcomeMessage: await this.generateWelcomeMessage(severityScore),
      initialAffirmation: this.getAffirmation('selfCompassion')
    };
  }

  /**
   * Generate personalized welcome message
   */
  async generateWelcomeMessage(severityScore) {
    const messages = {
      high: `I'm your Mood Agent. I know things feel heavy right now. My job is to help you understand your emotions and treat yourself with more kindness. We'll take this slowly, one small step at a time. You don't have to feel better immediately - just showing up is enough.`,
      medium: `I'm your Mood Agent, here to help you track and understand your emotions. We'll work on noticing patterns, challenging unhelpful thoughts, and building self-compassion. Small shifts in how we think can make a real difference over time.`,
      low: `I'm your Mood Agent. I'll help you maintain emotional awareness and continue building positive mental habits. Let's keep track of what's working and strengthen your emotional resilience.`
    };

    const level = severityScore >= 3 ? 'high' : severityScore >= 2 ? 'medium' : 'low';

    return {
      text: messages[level],
      quickResponses: ['Okay, let\'s start', 'I need something gentle', 'Tell me more']
    };
  }

  /**
   * Generate a daily check-in
   */
  async generateCheckIn(userId, recoveryData = null) {
    const hour = new Date().getHours();
    let question;

    // Morning check-in
    if (hour < 12) {
      question = this.checkInQuestions.find(q => q.id === 'mood_rating');
    }
    // Afternoon
    else if (hour < 18) {
      question = this.checkInQuestions.find(q => q.id === 'self_talk');
    }
    // Evening reflection
    else {
      question = this.checkInQuestions.find(q => q.id === 'positive_moment');
    }

    return {
      type: 'check_in',
      agentName: this.name,
      question: question,
      message: question.text,
      quickResponses: question.quickResponses || null,
      followUpEnabled: question.followUp || false
    };
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
      moodLevel: analysis.moodLevel,
      followUp: followUp.message,
      recommendation: followUp.recommendation,
      affirmation: followUp.affirmation,
      exercise: followUp.exercise,
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
      moodLevel: null,
      concerns: [],
      positives: []
    };

    if (questionId === 'mood_rating') {
      analysis.moodLevel = response.value;
      if (response.value <= 2) {
        analysis.sentiment = 'negative';
        analysis.concerns.push('Very low mood reported');
        analysis.shouldEscalate = response.value === 1;
      } else if (response.value <= 4) {
        analysis.sentiment = 'negative';
        analysis.concerns.push('Low mood reported');
      } else if (response.value >= 7) {
        analysis.sentiment = 'positive';
        analysis.positives.push('Good mood reported');
      }
    }

    if (questionId === 'self_talk') {
      if (response.value === 'severe') {
        analysis.sentiment = 'negative';
        analysis.concerns.push('Severe self-criticism reported');
        analysis.needsSelfCompassion = true;
      } else if (response.value === 'many') {
        analysis.concerns.push('Significant self-critical thoughts');
        analysis.needsSelfCompassion = true;
      } else if (response.value === 'none') {
        analysis.positives.push('Minimal self-criticism');
      }
    }

    if (questionId === 'comparison') {
      if (response.value === 'better') {
        analysis.sentiment = 'positive';
        analysis.positives.push('Mood improving from yesterday');
      } else if (response.value === 'worse') {
        analysis.sentiment = 'negative';
        analysis.concerns.push('Mood declined from yesterday');
      }
    }

    return analysis;
  }

  /**
   * Analyze text response using LLM
   */
  async analyzeTextResponse(response, questionId) {
    try {
      const prompt = `You are a compassionate therapist analyzing a user's response about their mood and feelings.

Question context: ${questionId}
User's response: "${response}"

Analyze for:
1. Emotional state (specific emotions detected)
2. Mood level (very low/low/neutral/good/very good)
3. Signs of cognitive distortions (catastrophizing, all-or-nothing thinking, etc.)
4. Self-criticism or negative self-talk
5. Any positive elements or coping
6. Risk indicators requiring attention

Respond in JSON:
{
  "sentiment": "positive/neutral/negative",
  "emotions": ["list of emotions detected"],
  "moodLevel": "very_low/low/neutral/good/very_good",
  "cognitiveDistortions": ["any patterns noticed"],
  "selfCriticism": "none/mild/moderate/severe",
  "positives": ["any positive signs"],
  "concerns": ["any concerns"],
  "score": 1-5,
  "shouldEscalate": false,
  "suggestedApproach": "what might help this person"
}`;

      const result = await geminiService.generateContent(prompt, 600);
      const cleaned = geminiService.cleanJsonResponse(result);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Mood analysis error:', error);
      return {
        sentiment: 'neutral',
        moodLevel: 'neutral',
        score: 3,
        concerns: [],
        positives: []
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
      affirmation: null,
      exercise: null,
      nextAction: null
    };

    // Very low mood
    if (analysis.moodLevel === 'very_low' || analysis.concerns?.includes('Very low mood reported')) {
      followUp.message = 'I hear that things are really hard right now. That takes courage to share. You don\'t have to face this alone.';
      followUp.affirmation = this.getAffirmation('resilience');
      followUp.exercise = this.interventions.find(i => i.id === 'self_compassion');
      followUp.recommendation = 'Would you like to try a brief self-compassion exercise? It might help a little.';
      followUp.nextAction = { type: 'offer_exercise', exerciseId: 'self_compassion' };
      return followUp;
    }

    // Low mood
    if (analysis.moodLevel === 'low' || analysis.sentiment === 'negative') {
      followUp.message = 'Thank you for being honest about how you\'re feeling. Low mood days are hard.';
      followUp.affirmation = this.getAffirmation('selfCompassion');
      followUp.recommendation = 'Remember: feelings are temporary. What\'s one tiny thing that might help right now?';
      return followUp;
    }

    // Self-criticism detected
    if (analysis.needsSelfCompassion || analysis.selfCriticism === 'severe' || analysis.selfCriticism === 'moderate') {
      followUp.message = 'I notice you\'ve been hard on yourself. You deserve the same kindness you\'d give a friend.';
      followUp.affirmation = this.getAffirmation('selfWorth');
      followUp.exercise = this.interventions.find(i => i.id === 'self_compassion');
      followUp.recommendation = 'Try this: "What would I say to a friend feeling this way?" Then say it to yourself.';
      followUp.nextAction = { type: 'reframing_exercise' };
      return followUp;
    }

    // Cognitive distortions detected
    if (analysis.cognitiveDistortions?.length > 0) {
      const distortion = analysis.cognitiveDistortions[0];
      followUp.message = `I noticed a thought pattern that might not be serving you well. Let's look at it together.`;
      followUp.recommendation = `This sounds like "${distortion}" thinking. Ask yourself: Is this thought 100% true? What evidence is there for and against it?`;
      followUp.nextAction = { type: 'thought_record' };
      return followUp;
    }

    // Positive mood
    if (analysis.sentiment === 'positive') {
      followUp.message = 'It\'s good to hear you\'re doing okay! What do you think contributed to this?';
      followUp.affirmation = this.getAffirmation('hope');
      followUp.recommendation = 'Take note of what\'s working. These insights help on harder days.';
      return followUp;
    }

    // Neutral/default
    followUp.message = 'Thanks for checking in. Tracking your mood helps you understand patterns.';
    followUp.affirmation = this.getAffirmation('selfCompassion');
    followUp.recommendation = 'What\'s one small thing you can do for yourself today?';
    return followUp;
  }

  /**
   * Get affirmation by category
   */
  getAffirmation(category = 'selfCompassion') {
    const affirmations = this.affirmations[category] || this.affirmations.selfCompassion;
    return affirmations[Math.floor(Math.random() * affirmations.length)];
  }

  /**
   * Get all affirmations
   */
  getAllAffirmations() {
    return this.affirmations;
  }

  /**
   * Attempt to reframe a negative thought
   */
  async reframeThought(thought) {
    try {
      const prompt = `You are a compassionate CBT therapist helping reframe a negative thought.

The thought: "${thought}"

Provide:
1. Identify the cognitive distortion (if any)
2. Questions to challenge this thought
3. A more balanced alternative thought
4. A brief compassionate message

Keep it warm, not clinical. Respond in JSON:
{
  "distortion": "name of distortion or null",
  "challengeQuestions": ["3 questions to examine this thought"],
  "balancedThought": "a more balanced alternative",
  "compassionateMessage": "a warm, supportive message"
}`;

      const result = await geminiService.generateContent(prompt, 500);
      const cleaned = geminiService.cleanJsonResponse(result);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Reframing error:', error);
      return {
        distortion: null,
        challengeQuestions: [
          'Is this thought 100% true?',
          'What would you tell a friend who thought this?',
          'Will this matter in a year?'
        ],
        balancedThought: 'This is a difficult thought, but it may not be the whole picture.',
        compassionateMessage: 'It\'s okay to have hard thoughts. They don\'t define you.'
      };
    }
  }

  /**
   * Generate mood diary summary
   */
  async generateMoodSummary(checkIns) {
    if (checkIns.length < 3) {
      return {
        hasEnoughData: false,
        message: 'Keep logging your mood. After a few more entries, I\'ll identify patterns.'
      };
    }

    const moodScores = checkIns
      .filter(c => c.questionId === 'mood_rating')
      .map(c => c.score);

    const avgMood = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;

    // Calculate trend
    const recentScores = moodScores.slice(-5);
    const olderScores = moodScores.slice(0, -5);
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.length > 0
      ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length
      : recentAvg;

    let trend = 'stable';
    if (recentAvg > olderAvg + 0.5) trend = 'improving';
    if (recentAvg < olderAvg - 0.5) trend = 'declining';

    return {
      hasEnoughData: true,
      averageMood: avgMood.toFixed(1),
      totalEntries: moodScores.length,
      trend: trend,
      lowestMood: Math.min(...moodScores),
      highestMood: Math.max(...moodScores),
      insight: trend === 'improving'
        ? 'Your mood has been trending upward. Keep doing what\'s working!'
        : trend === 'declining'
        ? 'Your mood has dipped recently. Let\'s focus on self-care and support.'
        : 'Your mood has been relatively stable. Consistency is valuable.'
    };
  }

  /**
   * Get progress report
   */
  async getProgressReport(userId, recoveryData = null) {
    const checkIns = recoveryData?.checkIns?.filter(c => c.agentName === 'mood') || [];
    const summary = await this.generateMoodSummary(checkIns);

    return {
      agentName: this.name,
      criteria: [1, 3],
      criterionNames: ['Mood', 'Self-worth'],
      totalCheckIns: checkIns.length,
      ...summary,
      currentIntervention: recoveryData?.getAgentState?.('mood')?.currentIntervention || null
    };
  }
}

module.exports = MoodAgent;
