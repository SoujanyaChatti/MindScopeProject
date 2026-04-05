/**
 * Sleep Agent - Enhanced Version
 * Handles SNAM Criterion 7: Sleep Problems
 *
 * Full capabilities:
 * - Sleep pattern analysis
 * - Personalized sleep hygiene plans
 * - Wind-down routines
 * - Sleep diary tracking
 * - CBT-I techniques
 * - Voice-guided relaxation
 * - Smart reminders
 */

const BaseAgent = require('./baseAgent');
const geminiService = require('../geminiService');

class SleepAgent extends BaseAgent {
  constructor() {
    super(
      'sleep',
      [7],  // SNAM Criterion 7
      'sleep specialist focused on improving sleep quality and establishing healthy sleep habits'
    );

    // Sleep-specific configuration
    this.sleepConfig = {
      idealSleepHours: { min: 7, max: 9 },
      idealBedtime: '22:30',
      idealWakeTime: '06:30',
      windDownMinutes: 60,
      screenFreeMinutes: 30
    };

    this.interventions = [
      {
        id: 'sleep_hygiene_basic',
        level: 'light',
        title: 'Sleep Hygiene Basics',
        description: 'Establish consistent sleep and wake times, even on weekends.',
        duration: '1 week',
        type: 'habit',
        steps: [
          'Choose a target bedtime and wake time',
          'Set alarms for both sleep and wake',
          'Avoid sleeping in more than 30 minutes on weekends',
          'Track your consistency for 7 days'
        ]
      },
      {
        id: 'wind_down_routine',
        level: 'light',
        title: 'Wind-Down Routine',
        description: 'Create a relaxing pre-sleep routine to signal your body it\'s time for rest.',
        duration: '30-60 min before bed',
        type: 'routine',
        steps: [
          'Dim lights 1 hour before bed',
          'Stop work/stressful activities',
          'Do something relaxing: read, gentle stretch, warm bath',
          'Prepare for tomorrow briefly'
        ]
      },
      {
        id: 'screen_detox',
        level: 'moderate',
        title: 'Screen-Free Sleep Prep',
        description: 'Remove blue light exposure before bed for better melatonin production.',
        duration: '1 hour before bed',
        type: 'habit',
        steps: [
          'Set a "screens off" time 1 hour before bed',
          'Put phone in another room or use airplane mode',
          'Enable night mode if you must use devices',
          'Replace screen time with reading or relaxation'
        ]
      },
      {
        id: 'sleep_environment',
        level: 'moderate',
        title: 'Sleep Environment Optimization',
        description: 'Transform your bedroom into an ideal sleep sanctuary.',
        duration: 'One-time setup',
        type: 'environment',
        checklist: [
          'Room temperature: 65-68°F (18-20°C)',
          'Complete darkness (blackout curtains or eye mask)',
          'Quiet environment (earplugs or white noise)',
          'Comfortable bedding',
          'Remove work items from bedroom'
        ]
      },
      {
        id: 'stimulus_control',
        level: 'intensive',
        title: 'Stimulus Control (CBT-I)',
        description: 'Strengthen the association between bed and sleep.',
        duration: 'Ongoing',
        type: 'therapy',
        rules: [
          'Only go to bed when sleepy',
          'Use bed only for sleep (and intimacy)',
          'If awake >20 min, get up and do something calm',
          'Return to bed only when sleepy again',
          'Wake at same time regardless of sleep quality'
        ]
      },
      {
        id: 'sleep_restriction',
        level: 'intensive',
        title: 'Sleep Restriction Therapy',
        description: 'Temporarily limit time in bed to match actual sleep time, then gradually extend.',
        duration: '2-4 weeks',
        type: 'therapy',
        warning: 'May feel tired initially. Consult doctor if you have certain conditions.',
        steps: [
          'Calculate average sleep time from diary',
          'Set sleep window to match (min 5.5 hours)',
          'Extend by 15 min when sleeping 85%+ of time in bed',
          'Never restrict below 5.5 hours'
        ]
      }
    ];

    this.checkInQuestions = [
      {
        id: 'sleep_quality',
        text: 'How did you sleep last night?',
        type: 'quick',
        quickResponses: [
          { label: 'Great', value: 5, emoji: '😴' },
          { label: 'Good', value: 4, emoji: '🙂' },
          { label: 'Okay', value: 3, emoji: '😐' },
          { label: 'Poor', value: 2, emoji: '😕' },
          { label: 'Terrible', value: 1, emoji: '😫' }
        ],
        followUp: true
      },
      {
        id: 'bedtime',
        text: 'What time did you go to bed last night?',
        type: 'time',
        quickResponses: [
          { label: 'Before 10pm', value: 'early' },
          { label: '10-11pm', value: 'ideal' },
          { label: '11pm-12am', value: 'late' },
          { label: 'After midnight', value: 'very_late' }
        ]
      },
      {
        id: 'wake_time',
        text: 'What time did you wake up?',
        type: 'time',
        quickResponses: [
          { label: 'Before 6am', value: 'early' },
          { label: '6-7am', value: 'ideal' },
          { label: '7-8am', value: 'normal' },
          { label: 'After 8am', value: 'late' }
        ]
      },
      {
        id: 'sleep_issue',
        text: 'Did you have trouble falling asleep or staying asleep?',
        type: 'quick',
        quickResponses: [
          { label: 'Fell asleep easily', value: 'none' },
          { label: 'Took a while to fall asleep', value: 'onset' },
          { label: 'Woke up during night', value: 'maintenance' },
          { label: 'Woke too early', value: 'terminal' },
          { label: 'Multiple issues', value: 'multiple' }
        ],
        followUp: true
      },
      {
        id: 'feeling_rested',
        text: 'How rested do you feel this morning?',
        type: 'scale',
        scale: { min: 1, max: 10, labels: ['Exhausted', 'Somewhat rested', 'Fully rested'] },
        quickResponses: [
          { label: 'Refreshed', value: 9 },
          { label: 'Rested', value: 7 },
          { label: 'Somewhat tired', value: 5 },
          { label: 'Very tired', value: 3 },
          { label: 'Exhausted', value: 1 }
        ]
      },
      {
        id: 'screen_use',
        text: 'Did you use screens (phone/TV/computer) within an hour of bedtime?',
        type: 'quick',
        quickResponses: [
          { label: 'No screens', value: 'none', score: 5 },
          { label: 'Brief use', value: 'brief', score: 3 },
          { label: 'Moderate use', value: 'moderate', score: 2 },
          { label: 'Extensive use', value: 'extensive', score: 1 }
        ]
      },
      {
        id: 'caffeine',
        text: 'Did you have caffeine after 2pm yesterday?',
        type: 'quick',
        quickResponses: [
          { label: 'No caffeine', value: 'none' },
          { label: 'Before 2pm only', value: 'early' },
          { label: 'After 2pm', value: 'late' },
          { label: 'Evening caffeine', value: 'evening' }
        ]
      }
    ];

    // Relaxation exercises
    this.relaxationExercises = [
      {
        id: 'body_scan',
        title: 'Body Scan Relaxation',
        duration: '10 minutes',
        description: 'Progressive relaxation through body awareness',
        script: `Let's do a calming body scan together.

Find a comfortable position and close your eyes.

Take three slow, deep breaths...

Now, bring your attention to your feet. Notice any tension there. As you breathe out, let that tension release.

Move your attention to your calves and shins. Notice, then release any tension with your breath.

Continue to your thighs... your hips... your lower back...

Feel your belly rise and fall with each breath. Let your stomach be soft.

Notice your chest, your shoulders. These often hold stress. Let them drop and soften.

Move to your arms, your hands. Let them be heavy and relaxed.

Finally, notice your neck, your jaw, your face. Release any tension. Let your forehead be smooth.

Take a few more breaths, feeling your whole body relaxed and ready for sleep.`
      },
      {
        id: '478_breathing',
        title: '4-7-8 Breathing',
        duration: '5 minutes',
        description: 'Calming breath technique for sleep',
        script: `The 4-7-8 breathing technique helps calm your nervous system.

Get comfortable and let your lips part slightly.

Exhale completely through your mouth with a whoosh sound.

Now, close your lips and inhale quietly through your nose for 4 counts...
1... 2... 3... 4...

Hold your breath for 7 counts...
1... 2... 3... 4... 5... 6... 7...

Exhale completely through your mouth for 8 counts, making a whoosh sound...
1... 2... 3... 4... 5... 6... 7... 8...

That's one breath. Let's do three more cycles.

[Repeat]

With each cycle, you should feel more relaxed and ready for sleep.`
      },
      {
        id: 'progressive_muscle',
        title: 'Progressive Muscle Relaxation',
        duration: '15 minutes',
        description: 'Tense and release muscle groups for deep relaxation',
        script: `Progressive muscle relaxation helps release physical tension.

Lie down comfortably. We'll tense each muscle group for 5 seconds, then release.

Start with your feet. Curl your toes tightly... hold... and release. Feel the difference.

Now your calves. Point your toes up, feeling the stretch... hold... and release.

Your thighs. Squeeze them tightly... hold... and let go.

Your buttocks. Clench... hold... release.

Your stomach. Tighten your abs... hold... soften.

Make fists with your hands. Squeeze... hold... open and relax.

Bend your elbows and tense your biceps... hold... release.

Raise your shoulders to your ears... hold... let them drop.

Scrunch your face tightly... hold... and relax completely.

Now feel your whole body, heavy and relaxed, sinking into the bed.

Stay here as you drift toward sleep.`
      }
    ];
  }

  /**
   * Get initial task when agent is activated
   */
  async getInitialTask(userId, severityScore, criterion) {
    // Select intervention based on severity
    let intervention;
    if (severityScore >= 3) {
      intervention = this.interventions.find(i => i.id === 'stimulus_control');
    } else if (severityScore >= 2) {
      intervention = this.interventions.find(i => i.id === 'screen_detox');
    } else {
      intervention = this.interventions.find(i => i.id === 'sleep_hygiene_basic');
    }

    return {
      type: 'initial',
      agentName: this.name,
      title: intervention.title,
      description: intervention.description,
      intervention: intervention,
      priority: this.getPriority(severityScore),
      suggestedReminders: [
        { type: 'sleep', time: '22:00', title: 'Wind-down reminder' },
        { type: 'check_in', time: '08:00', title: 'Morning sleep check-in' }
      ],
      welcomeMessage: await this.generateWelcomeMessage(severityScore)
    };
  }

  /**
   * Generate personalized welcome message
   */
  async generateWelcomeMessage(severityScore) {
    const severity = severityScore >= 3 ? 'significant' : severityScore >= 2 ? 'moderate' : 'some';

    return {
      text: `I'm your Sleep Agent, here to help you get better rest. Based on your assessment, you're experiencing ${severity} sleep difficulties. Over the next couple of weeks, I'll guide you through proven techniques to improve your sleep. We'll start with small changes and build from there. Ready to begin?`,
      quickResponses: ['Yes, let\'s start', 'Tell me more first', 'Maybe later']
    };
  }

  /**
   * Generate a daily check-in
   */
  async generateCheckIn(userId, recoveryData = null) {
    const hour = new Date().getHours();
    let question;

    // Morning check-in focuses on last night's sleep
    if (hour < 12) {
      question = this.checkInQuestions.find(q => q.id === 'sleep_quality');
    }
    // Evening check-in focuses on sleep preparation
    else if (hour >= 20) {
      question = {
        id: 'evening_prep',
        text: 'It\'s getting close to bedtime. Have you started winding down?',
        type: 'quick',
        quickResponses: [
          { label: 'Yes, relaxing now', value: 'yes' },
          { label: 'About to start', value: 'soon' },
          { label: 'Not yet', value: 'no' },
          { label: 'Need help winding down', value: 'help' }
        ]
      };
    }
    // Afternoon check-in
    else {
      question = this.checkInQuestions.find(q => q.id === 'feeling_rested');
    }

    return {
      type: 'check_in',
      agentName: this.name,
      question: question,
      message: question.text,
      quickResponses: question.quickResponses,
      followUpEnabled: question.followUp || false
    };
  }

  /**
   * Process user's response to check-in
   */
  async processResponse(userId, response, questionId, recoveryData = null) {
    const question = this.checkInQuestions.find(q => q.id === questionId) ||
                     { id: questionId };

    // Analyze the response
    let analysis;
    if (typeof response === 'object' && response.value !== undefined) {
      // Quick response selected
      analysis = await this.analyzeQuickResponse(questionId, response);
    } else {
      // Free text response
      analysis = await this.analyzeTextResponse(response, questionId);
    }

    // Generate follow-up based on analysis
    const followUp = await this.generateFollowUp(analysis, questionId);

    return {
      agentName: this.name,
      understood: true,
      analysis: analysis,
      sentiment: analysis.sentiment,
      score: analysis.score,
      followUp: followUp.message,
      recommendation: followUp.recommendation,
      shouldEscalate: analysis.shouldEscalate || false,
      nextAction: followUp.nextAction
    };
  }

  /**
   * Analyze quick response selection
   */
  async analyzeQuickResponse(questionId, response) {
    const analysis = {
      questionId,
      responseValue: response.value,
      score: response.score || 3,
      sentiment: 'neutral',
      concerns: [],
      positives: []
    };

    // Specific analysis based on question
    if (questionId === 'sleep_quality') {
      if (response.value <= 2) {
        analysis.sentiment = 'negative';
        analysis.concerns.push('Poor sleep quality reported');
      } else if (response.value >= 4) {
        analysis.sentiment = 'positive';
        analysis.positives.push('Good sleep quality');
      }
    }

    if (questionId === 'sleep_issue') {
      if (response.value !== 'none') {
        analysis.concerns.push(`Sleep issue: ${response.value}`);
        analysis.issueType = response.value;
      }
    }

    if (questionId === 'screen_use') {
      if (response.value === 'extensive' || response.value === 'moderate') {
        analysis.concerns.push('Excessive screen use before bed');
      }
    }

    return analysis;
  }

  /**
   * Analyze free text response using LLM
   */
  async analyzeTextResponse(response, questionId) {
    try {
      const prompt = `You are a sleep specialist analyzing a user's response about their sleep.

Question context: ${questionId}
User's response: "${response}"

Analyze this response and identify:
1. Sleep quality indicators (good/moderate/poor)
2. Specific sleep issues mentioned (onset insomnia, maintenance, early waking, etc.)
3. Contributing factors (stress, screens, caffeine, environment, etc.)
4. Sentiment (positive/neutral/negative)
5. Any concerning patterns

Respond in JSON:
{
  "sentiment": "positive/neutral/negative",
  "sleepQuality": "good/moderate/poor",
  "issues": ["list of specific issues"],
  "factors": ["contributing factors mentioned"],
  "score": 1-5,
  "concerns": ["any concerning patterns"],
  "positives": ["any positive signs"],
  "shouldEscalate": false
}`;

      const result = await geminiService.generateContent(prompt, 500);
      const cleaned = geminiService.cleanJsonResponse(result);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Sleep analysis error:', error);
      return {
        sentiment: 'neutral',
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
    // Handle specific sleep issues
    if (analysis.issueType === 'onset') {
      return {
        message: 'Difficulty falling asleep can be frustrating. This is often related to an active mind or not feeling sleepy enough at bedtime.',
        recommendation: 'Try the 4-7-8 breathing technique tonight. Only go to bed when you feel truly sleepy, not just tired.',
        nextAction: {
          type: 'offer_exercise',
          exerciseId: '478_breathing'
        }
      };
    }

    if (analysis.issueType === 'maintenance') {
      return {
        message: 'Waking during the night is common. The key is how easily you fall back asleep.',
        recommendation: 'If you\'re awake more than 20 minutes, get up and do something calm in dim light until you feel sleepy again.',
        nextAction: {
          type: 'tip',
          content: 'Keep the room cool and dark. Avoid checking the time - it creates anxiety.'
        }
      };
    }

    if (analysis.concerns?.includes('Excessive screen use before bed')) {
      return {
        message: 'Screen light, especially blue light, can delay your body\'s sleep signals.',
        recommendation: 'Try putting your phone in another room 1 hour before bed tonight. I can remind you.',
        nextAction: {
          type: 'suggest_reminder',
          reminder: { type: 'activity', time: '21:00', title: 'Screens off - wind down time' }
        }
      };
    }

    // Positive response
    if (analysis.sentiment === 'positive') {
      return {
        message: 'That\'s great to hear! Good sleep makes such a difference.',
        recommendation: 'Keep up what\'s working. Consistency is key.',
        nextAction: {
          type: 'encouragement',
          content: 'You\'re making progress! 🌟'
        }
      };
    }

    // Default follow-up
    return {
      message: 'Thank you for sharing. Every bit of information helps me understand your sleep better.',
      recommendation: 'Let\'s keep tracking and we\'ll identify patterns to improve your sleep.',
      nextAction: null
    };
  }

  /**
   * Get a relaxation exercise
   */
  getRelaxationExercise(type = null) {
    if (type) {
      return this.relaxationExercises.find(e => e.id === type) || this.relaxationExercises[0];
    }
    // Return random exercise
    const index = Math.floor(Math.random() * this.relaxationExercises.length);
    return this.relaxationExercises[index];
  }

  /**
   * Generate sleep diary summary
   */
  async generateSleepDiarySummary(checkIns) {
    if (checkIns.length < 3) {
      return {
        message: 'Keep logging your sleep. After a few more entries, I\'ll be able to identify patterns.',
        hasEnoughData: false
      };
    }

    // Calculate averages
    const qualityScores = checkIns.filter(c => c.questionId === 'sleep_quality').map(c => c.score);
    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;

    const patterns = [];
    const recommendations = [];

    if (avgQuality < 3) {
      patterns.push('Overall sleep quality has been below average');
      recommendations.push('Consider trying a wind-down routine 1 hour before bed');
    }

    // Check for screen use patterns
    const screenCheckIns = checkIns.filter(c => c.questionId === 'screen_use');
    const highScreenUse = screenCheckIns.filter(c => c.responseValue === 'extensive' || c.responseValue === 'moderate');
    if (highScreenUse.length > screenCheckIns.length / 2) {
      patterns.push('Frequent screen use before bed detected');
      recommendations.push('Reducing screen time before bed could significantly improve your sleep');
    }

    return {
      hasEnoughData: true,
      averageQuality: avgQuality.toFixed(1),
      totalNights: qualityScores.length,
      patterns,
      recommendations,
      trend: avgQuality >= 3.5 ? 'improving' : avgQuality <= 2.5 ? 'needs_attention' : 'stable'
    };
  }

  /**
   * Get progress report
   */
  async getProgressReport(userId, recoveryData = null) {
    const checkIns = recoveryData?.checkIns?.filter(c => c.agentName === 'sleep') || [];

    const summary = await this.generateSleepDiarySummary(checkIns);

    return {
      agentName: this.name,
      criterion: 7,
      criterionName: 'Sleep Problems',
      totalCheckIns: checkIns.length,
      ...summary,
      currentIntervention: recoveryData?.getAgentState?.('sleep')?.currentIntervention || null
    };
  }
}

module.exports = SleepAgent;
