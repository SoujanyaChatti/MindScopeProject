/**
 * Worry Agent (Enhanced)
 * Handles SNAM Criterion 5: Worry/Anxiety
 *
 * Provides comprehensive anxiety management including:
 * - Grounding exercises with guided scripts
 * - Worry time scheduling
 * - Worry decision tree (productive vs unproductive worry)
 * - Panic management techniques
 * - Exposure hierarchy for gradual anxiety reduction
 * - LLM-powered worry reframing
 */

const BaseAgent = require('./baseAgent');
const geminiService = require('../geminiService');

class WorryAgent extends BaseAgent {
  constructor() {
    super(
      'WorryAgent',
      [5],  // Worry/anxiety criterion
      'anxiety and worry management coach focused on CBT techniques, grounding, and perspective'
    );

    this.interventions = [
      // Light interventions
      {
        level: 'light',
        title: 'Box Breathing',
        description: 'Breathe in for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 4 times.',
        duration: '3 min',
        type: 'breathing'
      },
      {
        level: 'light',
        title: '5-4-3-2-1 Grounding',
        description: 'Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.',
        duration: '3-5 min',
        type: 'grounding'
      },
      {
        level: 'light',
        title: 'Cold Water Reset',
        description: 'Splash cold water on your face or hold ice cubes. This activates the dive reflex and calms your nervous system.',
        duration: '1-2 min',
        type: 'physical'
      },
      // Moderate interventions
      {
        level: 'moderate',
        title: 'Scheduled Worry Time',
        description: 'Set aside 15-20 minutes daily as "worry time." When worries arise outside this window, write them down and postpone to your scheduled slot.',
        duration: '15-20 min/day',
        type: 'cognitive'
      },
      {
        level: 'moderate',
        title: 'Worry Decision Tree',
        description: 'For each worry: Is it solvable? If yes, plan one small action. If no, practice acceptance. Is it happening now? If no, return to the present.',
        duration: '10 min',
        type: 'cognitive'
      },
      {
        level: 'moderate',
        title: 'Progressive Muscle Relaxation',
        description: 'Systematically tense each muscle group for 5 seconds, then release. Start from toes, work up to head.',
        duration: '15-20 min',
        type: 'relaxation'
      },
      // Intensive interventions
      {
        level: 'intensive',
        title: 'Anxiety Ladder',
        description: 'Create a list of anxiety-provoking situations ranked from least to most scary. Practice facing the easiest ones first.',
        duration: 'Ongoing',
        type: 'exposure'
      },
      {
        level: 'intensive',
        title: 'Worry Journal with Reframing',
        description: 'Write worries, identify cognitive distortions, challenge the thoughts, and write balanced alternatives.',
        duration: '15-20 min',
        type: 'cognitive'
      },
      {
        level: 'intensive',
        title: 'Values-Based Action',
        description: 'Identify what matters most to you. Take one small action aligned with your values, even while anxious.',
        duration: '20-30 min',
        type: 'acceptance'
      }
    ];

    this.checkInQuestions = {
      morning: [
        {
          text: 'How is your anxiety level this morning?',
          quickResponses: ['Calm and steady', 'Slightly on edge', 'Quite anxious', 'Very worried'],
          scoreMap: { 'Calm and steady': 1, 'Slightly on edge': 2, 'Quite anxious': 3, 'Very worried': 4 }
        },
        {
          text: 'Did you wake up with any specific worries on your mind?',
          quickResponses: ['No, mind is clear', 'Some background worries', 'Woke up thinking about worries', 'Couldn\'t sleep from worrying']
        },
        {
          text: 'How do you feel about facing the day ahead?',
          quickResponses: ['Ready and okay', 'A bit apprehensive', 'Dreading it', 'Overwhelming anxiety']
        }
      ],
      evening: [
        {
          text: 'How much did worry interfere with your day?',
          quickResponses: ['Not at all', 'A little', 'Quite a bit', 'Constantly'],
          scoreMap: { 'Not at all': 1, 'A little': 2, 'Quite a bit': 3, 'Constantly': 4 }
        },
        {
          text: 'Were you able to use any calming techniques today?',
          quickResponses: ['Yes, they helped', 'Tried but struggled', 'Forgot to try', 'Too anxious to try']
        },
        {
          text: 'Did you have any moments of calm or peace today?',
          quickResponses: ['Yes, several', 'A few brief ones', 'Barely any', 'No, constant worry']
        }
      ],
      general: [
        {
          text: 'Is your worry about something specific or general unease?',
          quickResponses: ['Specific thing', 'General anxiety', 'Both specific and general', 'Not sure']
        },
        {
          text: 'Do you feel your worry is about things you can control?',
          quickResponses: ['Mostly controllable', 'Some controllable', 'Mostly uncontrollable', 'All outside my control']
        },
        {
          text: 'How present are you able to be in the moment?',
          quickResponses: ['Very present', 'Sometimes present', 'Mind wanders to worries', 'Constantly in my head']
        }
      ],
      panic: [
        {
          text: 'Are you experiencing panic symptoms right now?',
          quickResponses: ['No', 'Mild symptoms', 'Yes, moderate', 'Yes, severe']
        },
        {
          text: 'Can you take a slow breath with me?',
          quickResponses: ['Yes, breathing now', 'Trying', 'Having trouble']
        }
      ]
    };

    // Comprehensive grounding exercises
    this.groundingExercises = {
      quick: [
        {
          name: 'Palm Press',
          duration: '30 seconds',
          script: 'Press your palms together firmly for 10 seconds. Focus all your attention on that pressure. Now slowly release and notice the tingling sensation. You are here. You are safe.'
        },
        {
          name: 'Feet on Ground',
          duration: '1 minute',
          script: 'Feel your feet on the floor. Press them down slightly. Notice the texture beneath them. Wiggle your toes. You are connected to the earth. You are grounded.'
        },
        {
          name: 'Cold Sensation',
          duration: '1 minute',
          script: 'Run cold water over your wrists or hold something cold. Focus entirely on that cold sensation. Let it anchor you to this moment.'
        }
      ],
      fiveSenses: {
        name: '5-4-3-2-1 Grounding',
        duration: '5 minutes',
        script: `Let's ground you in the present moment using your senses.

LOOK around and name 5 things you can see. Say them out loud or in your mind. Notice the colors, shapes, and details.

FEEL 4 things you can touch right now. It might be your clothes, the chair, the ground beneath you. Notice the textures.

LISTEN for 3 sounds around you. They might be distant or nearby. Just notice them without judgment.

SMELL 2 things. You might need to move or sniff your sleeve or the air. What do you notice?

TASTE 1 thing. Notice what's in your mouth right now. The taste of your last drink, or simply your own breath.

Take a slow breath. You are here, present in this moment.`
      },
      body: {
        name: 'Body Anchor',
        duration: '3 minutes',
        script: `Let's bring your attention to your body.

Starting at the top of your head, slowly scan down through your body.

Notice your forehead. Is it tense or relaxed? Don't change anything, just notice.

Move to your jaw. Notice if you're clenching. Gently let it soften.

Feel your shoulders. Let them drop slightly.

Notice your hands. Where are they? What do they feel?

Feel where your body contacts the chair or ground.

Your body is here, in this moment, safe and supported.

Take three slow breaths, feeling your belly rise and fall.`
      }
    };

    // Breathing exercises with precise timing
    this.breathingExercises = {
      box: {
        name: 'Box Breathing',
        duration: '4 minutes',
        pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
        rounds: 4,
        script: `Box breathing activates your calm nervous system.

Round 1:
- Breathe IN for 4 counts... 1... 2... 3... 4
- HOLD for 4 counts... 1... 2... 3... 4
- Breathe OUT for 4 counts... 1... 2... 3... 4
- HOLD for 4 counts... 1... 2... 3... 4

[Repeat for 4 rounds]

Well done. Notice how your body feels now compared to when you started.`
      },
      calm: {
        name: '4-7-8 Calming Breath',
        duration: '3 minutes',
        pattern: { inhale: 4, hold: 7, exhale: 8 },
        rounds: 4,
        script: `This breathing pattern is called a natural tranquilizer for the nervous system.

Place the tip of your tongue behind your upper front teeth.

Breathe IN through your nose for 4 counts... 1... 2... 3... 4

HOLD your breath for 7 counts... 1... 2... 3... 4... 5... 6... 7

Breathe OUT through your mouth for 8 counts, making a whoosh sound... 1... 2... 3... 4... 5... 6... 7... 8

This is one cycle. Let's do 3 more.

Notice the calm spreading through your body.`
      },
      physiological: {
        name: 'Physiological Sigh',
        duration: '1 minute',
        pattern: { inhale1: 2, inhale2: 1, exhale: 6 },
        script: `The physiological sigh is the fastest way to calm your nervous system.

Take a quick breath IN through your nose.
Without exhaling, take another small sip of air to fully expand your lungs.
Now slowly exhale through your mouth for a long count...

Let's do this 3 times. Each exhale, let your shoulders drop.`
      }
    };

    // Worry categories and patterns
    this.worryCategories = {
      health: ['sick', 'ill', 'disease', 'symptoms', 'dying', 'cancer', 'heart', 'pain'],
      relationships: ['leave', 'hate', 'angry', 'alone', 'rejection', 'abandoned', 'love'],
      work: ['job', 'fired', 'deadline', 'boss', 'fail', 'mistake', 'performance'],
      financial: ['money', 'bills', 'debt', 'afford', 'poor', 'bankrupt', 'expenses'],
      future: ['what if', 'going to', 'might', 'could happen', 'uncertain', 'unknown'],
      past: ['should have', 'regret', 'mistake', 'wish', 'if only']
    };

    // Cognitive distortions common in anxiety
    this.anxietyDistortions = {
      catastrophizing: {
        description: 'Jumping to the worst-case scenario',
        examples: ['What if I fail and lose everything?', 'This will definitely go wrong'],
        challenge: 'What is actually most likely to happen? What has happened in similar situations before?'
      },
      fortuneTelling: {
        description: 'Predicting negative outcomes without evidence',
        examples: ['They won\'t like me', 'I know I\'ll mess up'],
        challenge: 'Do I really know the future? What evidence supports this prediction?'
      },
      mindReading: {
        description: 'Assuming you know what others think',
        examples: ['They think I\'m stupid', 'Everyone can tell I\'m anxious'],
        challenge: 'How do I actually know what they\'re thinking? Could there be other explanations?'
      },
      overestimatingThreat: {
        description: 'Seeing danger where there is little',
        examples: ['That email must mean I\'m in trouble', 'This feeling means something is wrong'],
        challenge: 'How dangerous is this really? Have I survived similar situations?'
      },
      underestimatingCoping: {
        description: 'Believing you can\'t handle what comes',
        examples: ['I can\'t cope with uncertainty', 'I\'d fall apart if that happened'],
        challenge: 'What difficult things have I handled before? What resources do I have?'
      }
    };

    // Panic attack management
    this.panicManagement = {
      recognition: [
        'Racing heart',
        'Shortness of breath',
        'Chest tightness',
        'Trembling',
        'Dizziness',
        'Feeling of unreality',
        'Fear of losing control'
      ],
      reminders: [
        'Panic attacks are uncomfortable but not dangerous',
        'Your body is having a false alarm - there is no real threat',
        'These feelings will pass, usually within 10-20 minutes',
        'You have survived every panic attack you\'ve ever had',
        'Fighting the panic makes it worse - try to ride the wave'
      ],
      steps: [
        'Acknowledge: "I\'m having a panic attack. This will pass."',
        'Ground yourself: Feel your feet on the floor.',
        'Breathe slowly: Especially focus on long exhales.',
        'Stay present: Use 5-4-3-2-1 if needed.',
        'Don\'t flee: If safe, stay where you are.',
        'Ride it out: The panic will peak and then subside.'
      ]
    };

    // Acceptance-based coping statements
    this.acceptanceStatements = [
      'Anxiety is uncomfortable, but I can tolerate discomfort.',
      'I don\'t have to have certainty to feel okay.',
      'These feelings are temporary visitors, not permanent residents.',
      'I can feel anxious and still take action.',
      'Worry pretends to be necessary, but it rarely helps.',
      'I am more than my anxious thoughts.',
      'I can hold anxiety without letting it control me.',
      'This moment is manageable. I only need to handle right now.',
      'Uncertainty is part of life, and I can live with it.',
      'My anxiety wants to protect me, but I don\'t need protection right now.'
    ];
  }

  /**
   * Override base check-in to be time-aware and context-sensitive
   */
  async generateCheckIn(userId, context = {}) {
    const hour = new Date().getHours();
    const isPanic = context.isPanic || false;

    let questionSet;
    if (isPanic) {
      questionSet = this.checkInQuestions.panic;
    } else if (hour < 12) {
      questionSet = this.checkInQuestions.morning;
    } else if (hour >= 18) {
      questionSet = this.checkInQuestions.evening;
    } else {
      questionSet = this.checkInQuestions.general;
    }

    const question = questionSet[Math.floor(Math.random() * questionSet.length)];

    return {
      type: 'check_in',
      message: question.text,
      quickResponses: question.quickResponses || null,
      scoreMap: question.scoreMap || null,
      followUpEnabled: true,
      timeOfDay: hour < 12 ? 'morning' : hour >= 18 ? 'evening' : 'daytime',
      isPanicMode: isPanic
    };
  }

  /**
   * Get immediate grounding for acute anxiety
   */
  getImmediateGrounding(intensity = 'moderate') {
    if (intensity === 'severe' || intensity === 'panic') {
      return {
        exercise: this.breathingExercises.physiological,
        grounding: this.groundingExercises.quick[0],
        message: 'Let\'s focus on one thing: your breath. Everything else can wait.',
        followUp: this.groundingExercises.fiveSenses
      };
    } else if (intensity === 'high') {
      return {
        exercise: this.breathingExercises.calm,
        grounding: this.groundingExercises.body,
        message: 'Your body knows how to calm down. Let\'s help it along.'
      };
    } else {
      const quick = this.groundingExercises.quick[Math.floor(Math.random() * this.groundingExercises.quick.length)];
      return {
        exercise: quick,
        message: 'A quick grounding moment can help prevent worry from building.'
      };
    }
  }

  /**
   * Run worry through the decision tree
   */
  async processWorryDecisionTree(worry) {
    try {
      const prompt = `You are a CBT therapist helping someone process a worry using a decision tree approach.

Worry: "${worry}"

Analyze this worry and return a JSON object with:
1. "category": The type of worry (health, relationships, work, financial, future, past, or other)
2. "isSolvable": true if they can take action, false if it's outside their control
3. "isCurrently": true if it's happening now, false if it's about past or future
4. "suggestedAction": If solvable, one small concrete action they could take
5. "acceptanceStatement": If not solvable, a compassionate acceptance statement
6. "timeframe": "past", "present", or "future"
7. "distortion": Which anxiety distortion this might be (catastrophizing, fortuneTelling, mindReading, overestimatingThreat, underestimatingCoping, or none)
8. "balancedPerspective": A more balanced way to view this worry

Respond ONLY with valid JSON.`;

      const result = await geminiService.generateContent(prompt, 600);
      const cleaned = geminiService.cleanJsonResponse(result);
      const analysis = JSON.parse(cleaned);

      // Build response based on decision tree
      let response = {
        worry,
        analysis,
        guidance: []
      };

      // Branch 1: Is it solvable?
      if (analysis.isSolvable) {
        response.guidance.push({
          step: 'action',
          message: `This is something you can influence. Here's a small step: ${analysis.suggestedAction}`
        });
      } else {
        response.guidance.push({
          step: 'acceptance',
          message: `This is outside your direct control. ${analysis.acceptanceStatement}`
        });
      }

      // Branch 2: Is it happening now?
      if (!analysis.isCurrently) {
        response.guidance.push({
          step: 'present',
          message: analysis.timeframe === 'past'
            ? 'This has already happened. You cannot change the past, but you can choose how to move forward.'
            : 'This hasn\'t happened yet. Right now, in this moment, you are okay.'
        });
      }

      // Branch 3: Cognitive distortion
      if (analysis.distortion !== 'none' && this.anxietyDistortions[analysis.distortion]) {
        const distortion = this.anxietyDistortions[analysis.distortion];
        response.guidance.push({
          step: 'distortion',
          distortionType: analysis.distortion,
          message: `Your mind might be ${distortion.description.toLowerCase()}. Ask yourself: ${distortion.challenge}`
        });
      }

      response.balancedView = analysis.balancedPerspective;

      return response;
    } catch (error) {
      console.error('Worry decision tree error:', error);
      return {
        worry,
        guidance: [
          { step: 'general', message: 'Let\'s break this down: Can you do something about this right now? If yes, take one small action. If no, try to let it go for now.' }
        ],
        balancedView: 'Worrying about this doesn\'t change it. What matters is what you do in this moment.'
      };
    }
  }

  /**
   * Generate personalized worry reframe using LLM
   */
  async reframeWorry(worry, context = {}) {
    try {
      const prompt = `You are a compassionate CBT therapist helping someone reframe an anxious thought.

Worried thought: "${worry}"
${context.previousWorries ? `They've also worried about: ${context.previousWorries.join(', ')}` : ''}

Provide a reframe that:
1. Validates their feeling without agreeing with the worry
2. Offers a more balanced perspective
3. Is gentle, not dismissive

Return JSON with:
{
  "validation": "Acknowledging their anxiety...",
  "reframe": "A more balanced way to see this...",
  "copingQuestion": "A helpful question they could ask themselves",
  "reminder": "A brief calming reminder"
}

Respond ONLY with valid JSON.`;

      const result = await geminiService.generateContent(prompt, 400);
      const cleaned = geminiService.cleanJsonResponse(result);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Worry reframe error:', error);
      return {
        validation: 'It\'s understandable to feel worried about this.',
        reframe: 'Many things we worry about either don\'t happen or are more manageable than we expect.',
        copingQuestion: 'If this worry came true, what would you actually do? You\'d probably find a way to cope.',
        reminder: 'You have handled difficult things before. You can handle this too.'
      };
    }
  }

  /**
   * Get worry time guidance
   */
  getWorryTimeGuidance(phase = 'setup') {
    const guidance = {
      setup: {
        title: 'Setting Up Your Worry Time',
        steps: [
          'Choose a consistent time each day (not close to bedtime).',
          'Set a timer for 15-20 minutes.',
          'Find a specific "worry spot" - a place you\'ll use for this.',
          'Keep paper and pen nearby to write worries.'
        ],
        rules: [
          'When a worry pops up outside worry time, jot it down and postpone.',
          'Tell yourself: "I\'ll worry about this at [time]."',
          'During worry time, really let yourself worry.',
          'When the timer ends, stop and do something else.'
        ]
      },
      during: {
        title: 'During Your Worry Time',
        steps: [
          'Look at the worries you\'ve collected.',
          'For each worry, ask: Is this still bothering me?',
          'If yes, explore it fully. Write about it.',
          'Try to problem-solve solvable worries.',
          'For unsolvable worries, practice accepting uncertainty.'
        ]
      },
      outside: {
        title: 'Worry Popped Up?',
        steps: [
          'Notice the worry without engaging with it.',
          'Write it down briefly.',
          'Tell yourself: "I\'ll give this attention at [worry time]."',
          'Gently redirect to the present moment.',
          'Use a quick grounding if needed.'
        ],
        reminder: 'The worry will still be there during worry time if it\'s important. Right now, be here.'
      }
    };

    return guidance[phase] || guidance.setup;
  }

  /**
   * Get panic attack support
   */
  getPanicSupport(phase = 'during') {
    if (phase === 'during') {
      return {
        title: 'You\'re Having a Panic Attack',
        immediateMessage: 'This is scary but not dangerous. Your body is having a false alarm. It will pass.',
        steps: this.panicManagement.steps,
        breathing: this.breathingExercises.physiological,
        grounding: this.groundingExercises.quick[1], // Feet on ground
        reminders: this.panicManagement.reminders.slice(0, 3)
      };
    } else if (phase === 'after') {
      return {
        title: 'Recovering from a Panic Attack',
        message: 'You got through it. That took strength.',
        tips: [
          'Rest if you need to. Your body worked hard.',
          'Drink some water.',
          'Don\'t analyze the panic attack right now.',
          'Be kind to yourself - panic attacks are exhausting.',
          'Notice: You survived it. You always do.'
        ],
        affirmation: 'You are stronger than your panic. You proved it again just now.'
      };
    }
    return {
      title: 'Understanding Panic',
      message: 'Panic attacks are your body\'s alarm system going off when there\'s no real threat.',
      symptoms: this.panicManagement.recognition,
      facts: [
        'Panic attacks typically peak within 10 minutes.',
        'They are not dangerous, even though they feel terrible.',
        'Your body is trying to protect you.',
        'Learning to ride them out reduces their power over time.'
      ]
    };
  }

  /**
   * Generate anxiety ladder (exposure hierarchy)
   */
  async generateAnxietyLadder(fearTopic) {
    try {
      const prompt = `You are a CBT therapist creating an exposure hierarchy (anxiety ladder) for gradual anxiety reduction.

Fear/anxiety topic: "${fearTopic}"

Create an anxiety ladder with 6 steps from least scary (1) to most scary (6).
Each step should be specific, actionable, and slightly harder than the previous.

Return JSON array:
[
  {"level": 1, "task": "Easiest exposure", "anxiety": "2/10"},
  {"level": 2, "task": "...", "anxiety": "4/10"},
  ...up to level 6
]

Respond ONLY with valid JSON array.`;

      const result = await geminiService.generateContent(prompt, 500);
      const cleaned = geminiService.cleanJsonResponse(result);
      const ladder = JSON.parse(cleaned);

      return {
        topic: fearTopic,
        ladder,
        instructions: [
          'Start at level 1 and stay there until anxiety drops to 3/10 or below.',
          'Repeat the same step multiple times if needed.',
          'Only move up when you feel ready.',
          'Some anxiety is expected - that\'s how you learn it\'s not dangerous.',
          'Progress at your own pace. This is not a race.'
        ]
      };
    } catch (error) {
      console.error('Anxiety ladder error:', error);
      return {
        topic: fearTopic,
        ladder: [
          { level: 1, task: 'Think about the feared situation briefly', anxiety: '2/10' },
          { level: 2, task: 'Look at pictures or read about it', anxiety: '4/10' },
          { level: 3, task: 'Talk about it with someone safe', anxiety: '5/10' },
          { level: 4, task: 'Watch videos about it', anxiety: '6/10' },
          { level: 5, task: 'Be near the situation briefly', anxiety: '7/10' },
          { level: 6, task: 'Engage with the situation fully', anxiety: '8/10' }
        ],
        instructions: ['This is a generic ladder. Work with a therapist for personalized exposure.']
      };
    }
  }

  /**
   * Get random acceptance statement
   */
  getAcceptanceStatement() {
    return this.acceptanceStatements[Math.floor(Math.random() * this.acceptanceStatements.length)];
  }

  /**
   * Generate worry journal summary
   */
  async generateWorrySummary(worryEntries) {
    if (!worryEntries || worryEntries.length < 3) {
      return {
        message: 'Keep tracking your worries. After a few more entries, I can help you see patterns.',
        canSummarize: false
      };
    }

    try {
      const prompt = `You are a CBT therapist analyzing a worry journal.

Recent worry entries:
${worryEntries.map((e, i) => `${i + 1}. "${e.worry}" - Anxiety: ${e.anxietyLevel}/10 - Outcome: ${e.outcome || 'unknown'}`).join('\n')}

Analyze and return JSON:
{
  "mainThemes": ["theme1", "theme2"],
  "commonDistortions": ["distortion1", "distortion2"],
  "positivePatterns": "Any helpful patterns you notice",
  "worryAccuracy": "How often did predicted worries actually happen?",
  "suggestion": "One personalized suggestion based on their patterns",
  "encouragement": "A genuine, specific encouragement"
}

Respond ONLY with valid JSON.`;

      const result = await geminiService.generateContent(prompt, 500);
      const cleaned = geminiService.cleanJsonResponse(result);
      const summary = JSON.parse(cleaned);

      return {
        ...summary,
        canSummarize: true,
        entriesAnalyzed: worryEntries.length
      };
    } catch (error) {
      console.error('Worry summary error:', error);
      return {
        mainThemes: ['General anxiety'],
        suggestion: 'Continue tracking. Awareness itself often reduces worry\'s power.',
        encouragement: 'Every entry you make is a step toward understanding your patterns.',
        canSummarize: true,
        entriesAnalyzed: worryEntries.length
      };
    }
  }

  /**
   * Categorize worry based on keywords
   */
  categorizeWorry(worryText) {
    const lowerWorry = worryText.toLowerCase();

    for (const [category, keywords] of Object.entries(this.worryCategories)) {
      if (keywords.some(keyword => lowerWorry.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Generate progress report with worry-specific insights
   */
  async getProgressReport(userId, recoveryData) {
    const worryCheckIns = recoveryData?.checkIns?.filter(c => c.agentName === 'worry') || [];
    const recentCheckIns = worryCheckIns.slice(-14);

    const avgAnxiety = recentCheckIns.length > 0
      ? recentCheckIns.reduce((sum, c) => sum + (c.score || 3), 0) / recentCheckIns.length
      : null;

    // Analyze anxiety level trends
    let trend = 'insufficient_data';
    if (recentCheckIns.length >= 5) {
      const firstHalf = recentCheckIns.slice(0, Math.floor(recentCheckIns.length / 2));
      const secondHalf = recentCheckIns.slice(Math.floor(recentCheckIns.length / 2));

      const firstAvg = firstHalf.reduce((s, c) => s + (c.score || 3), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, c) => s + (c.score || 3), 0) / secondHalf.length;

      if (secondAvg < firstAvg - 0.3) trend = 'improving';
      else if (secondAvg > firstAvg + 0.3) trend = 'worsening';
      else trend = 'stable';
    }

    return {
      agent: 'worry',
      criterion: 5,
      totalCheckIns: worryCheckIns.length,
      recentCheckIns: recentCheckIns.length,
      averageAnxiety: avgAnxiety ? avgAnxiety.toFixed(1) : null,
      trend,
      trendMessage: {
        improving: 'Your anxiety levels are trending downward. Keep using those techniques!',
        stable: 'Your anxiety has been steady. Consistency in practice helps.',
        worsening: 'Anxiety has been higher lately. This is information, not failure. What extra support might help?',
        insufficient_data: 'Keep checking in so we can track your patterns.'
      }[trend],
      tips: trend === 'worsening'
        ? ['Consider adding more grounding breaks', 'Try the worry time technique', 'Be extra gentle with yourself']
        : ['Keep up your grounding practice', 'Notice what\'s helping'],
      encouragement: this.getAcceptanceStatement()
    };
  }
}

module.exports = WorryAgent;
