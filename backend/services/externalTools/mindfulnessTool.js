/**
 * Mindfulness Tool for WorryAgent
 *
 * Provides mindfulness and meditation support:
 * - Guided meditation timer with structured sessions
 * - Breathing exercise timers
 * - Mindfulness reminders/scheduling
 * - Session tracking and streaks
 * - Integration-ready for external apps (Headspace, Calm APIs if available)
 *
 * This is primarily a self-contained tool since most meditation apps
 * don't offer free public APIs. It provides timer functionality and
 * guided content that can work standalone.
 */

class MindfulnessTool {
  constructor() {
    this.name = 'mindfulness';

    // Session types and their configurations
    this.sessionTypes = {
      breathing: {
        durations: [1, 2, 3, 5],
        techniques: ['box', 'calm', 'physiological', 'simple']
      },
      meditation: {
        durations: [3, 5, 10, 15, 20],
        types: ['body_scan', 'loving_kindness', 'mindful_awareness', 'grounding']
      },
      grounding: {
        durations: [2, 3, 5],
        exercises: ['5-4-3-2-1', 'body_anchor', 'palm_press']
      }
    };

    // Pre-built guided sessions
    this.guidedSessions = {
      anxiety_relief_3min: {
        name: 'Anxiety Relief',
        duration: 3,
        type: 'breathing',
        steps: [
          { time: 0, instruction: 'Find a comfortable position. You can sit or stand.', duration: 10 },
          { time: 10, instruction: 'Close your eyes or soften your gaze downward.', duration: 5 },
          { time: 15, instruction: 'Take a deep breath in... and let it out with a sigh.', duration: 10 },
          { time: 25, instruction: 'Now we\'ll do physiological sighs: Two inhales through the nose, then a long exhale.', duration: 10 },
          { time: 35, instruction: 'Inhale... inhale again... now exhale slowly...', duration: 15 },
          { time: 50, instruction: 'Again. Inhale... inhale... exhale all the way out...', duration: 15 },
          { time: 65, instruction: 'One more time. Inhale... small inhale... long exhale...', duration: 15 },
          { time: 80, instruction: 'Now breathe naturally. Notice how your body feels.', duration: 20 },
          { time: 100, instruction: 'Feel your feet on the ground. You are here. You are safe.', duration: 20 },
          { time: 120, instruction: 'Gently open your eyes when ready. Notice: you managed that anxiety moment.', duration: 30 },
          { time: 150, instruction: 'Well done. Take this calm with you.', duration: 30 }
        ]
      },
      body_scan_5min: {
        name: 'Quick Body Scan',
        duration: 5,
        type: 'meditation',
        steps: [
          { time: 0, instruction: 'Settle into a comfortable position. Close your eyes.', duration: 15 },
          { time: 15, instruction: 'Bring attention to your head. Notice any tension. Don\'t change it, just notice.', duration: 30 },
          { time: 45, instruction: 'Move to your face. Jaw, eyes, forehead. Let them soften.', duration: 30 },
          { time: 75, instruction: 'Notice your neck and shoulders. These often hold stress.', duration: 30 },
          { time: 105, instruction: 'Feel your arms and hands. Are they relaxed?', duration: 25 },
          { time: 130, instruction: 'Notice your chest and belly. Feel them rise and fall with breath.', duration: 30 },
          { time: 160, instruction: 'Move to your lower back and hips. Release any holding.', duration: 30 },
          { time: 190, instruction: 'Feel your legs: thighs, knees, calves.', duration: 25 },
          { time: 215, instruction: 'Finally, your feet. Feel them grounded.', duration: 25 },
          { time: 240, instruction: 'Now feel your whole body at once. Breathing as one.', duration: 30 },
          { time: 270, instruction: 'Gently wiggle fingers and toes. Open your eyes when ready.', duration: 30 }
        ]
      },
      grounding_2min: {
        name: 'Quick Grounding',
        duration: 2,
        type: 'grounding',
        steps: [
          { time: 0, instruction: 'Pause wherever you are. Feel your feet on the ground.', duration: 10 },
          { time: 10, instruction: 'Look around. Name 5 things you can see.', duration: 20 },
          { time: 30, instruction: 'Notice 4 things you can touch right now.', duration: 15 },
          { time: 45, instruction: 'Listen for 3 sounds.', duration: 15 },
          { time: 60, instruction: 'Notice 2 things you can smell.', duration: 15 },
          { time: 75, instruction: 'Taste 1 thing - even just the air or your mouth.', duration: 10 },
          { time: 85, instruction: 'Take a breath. You are here, in this moment.', duration: 15 },
          { time: 100, instruction: 'You are grounded. You are present.', duration: 20 }
        ]
      },
      loving_kindness_10min: {
        name: 'Loving Kindness',
        duration: 10,
        type: 'meditation',
        steps: [
          { time: 0, instruction: 'Sit comfortably. Close your eyes. Take a few settling breaths.', duration: 30 },
          { time: 30, instruction: 'Bring to mind someone you love deeply. Picture them.', duration: 20 },
          { time: 50, instruction: 'Silently wish them: May you be happy. May you be healthy. May you be safe. May you live with ease.', duration: 40 },
          { time: 90, instruction: 'Feel the warmth of sending these wishes.', duration: 30 },
          { time: 120, instruction: 'Now, bring yourself to mind. Yes, you deserve this too.', duration: 20 },
          { time: 140, instruction: 'Wish yourself: May I be happy. May I be healthy. May I be safe. May I live with ease.', duration: 50 },
          { time: 190, instruction: 'If this feels hard, that\'s okay. Try anyway.', duration: 30 },
          { time: 220, instruction: 'Now think of a neutral person - someone you neither like nor dislike.', duration: 20 },
          { time: 240, instruction: 'Send them the same wishes: May you be happy. May you be healthy. May you be safe.', duration: 40 },
          { time: 280, instruction: 'Now expand to all beings everywhere. All people, all creatures.', duration: 30 },
          { time: 310, instruction: 'May all beings be happy. May all beings be healthy. May all beings be safe.', duration: 50 },
          { time: 360, instruction: 'Feel this expanding circle of kindness.', duration: 30 },
          { time: 390, instruction: 'Rest in this feeling of goodwill.', duration: 60 },
          { time: 450, instruction: 'Bring your attention back to yourself, sitting here.', duration: 30 },
          { time: 480, instruction: 'Remember: you are worthy of this kindness too.', duration: 30 },
          { time: 510, instruction: 'Gently open your eyes. Carry this kindness with you.', duration: 90 }
        ]
      }
    };

    // Breathing patterns with precise timing
    this.breathingPatterns = {
      box: {
        name: 'Box Breathing',
        inhale: 4,
        hold1: 4,
        exhale: 4,
        hold2: 4,
        description: 'Calming technique used by Navy SEALs'
      },
      calm: {
        name: '4-7-8 Breath',
        inhale: 4,
        hold1: 7,
        exhale: 8,
        hold2: 0,
        description: 'Natural tranquilizer for the nervous system'
      },
      energizing: {
        name: 'Energizing Breath',
        inhale: 4,
        hold1: 2,
        exhale: 2,
        hold2: 0,
        description: 'Shorter exhale to increase alertness'
      },
      simple: {
        name: 'Simple Deep Breathing',
        inhale: 4,
        hold1: 0,
        exhale: 6,
        hold2: 0,
        description: 'Long exhale activates relaxation response'
      }
    };
  }

  /**
   * Get Gemini function declaration schema
   */
  static getSchema() {
    return {
      description: 'Mindfulness and meditation session management',
      functions: [
        {
          name: 'startSession',
          description: 'Start a guided mindfulness or breathing session',
          parameters: {
            type: 'object',
            properties: {
              sessionType: {
                type: 'string',
                enum: ['breathing', 'meditation', 'grounding'],
                description: 'Type of session'
              },
              duration: {
                type: 'integer',
                description: 'Duration in minutes'
              },
              technique: {
                type: 'string',
                description: 'Specific technique (e.g., "box", "body_scan", "5-4-3-2-1")'
              }
            },
            required: ['sessionType', 'duration']
          }
        },
        {
          name: 'getGuidedSession',
          description: 'Get a pre-built guided session with step-by-step instructions',
          parameters: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                enum: ['anxiety_relief_3min', 'body_scan_5min', 'grounding_2min', 'loving_kindness_10min'],
                description: 'ID of the pre-built session'
              }
            },
            required: ['sessionId']
          }
        },
        {
          name: 'getBreathingExercise',
          description: 'Get a breathing exercise with timing',
          parameters: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                enum: ['box', 'calm', 'energizing', 'simple'],
                description: 'Breathing pattern'
              },
              rounds: {
                type: 'integer',
                description: 'Number of breathing rounds (default 4)'
              }
            },
            required: ['pattern']
          }
        },
        {
          name: 'scheduleReminder',
          description: 'Schedule a mindfulness reminder',
          parameters: {
            type: 'object',
            properties: {
              time: {
                type: 'string',
                description: 'Time for reminder (e.g., "09:00", "14:30")'
              },
              type: {
                type: 'string',
                enum: ['breathing', 'check_in', 'grounding', 'gratitude'],
                description: 'Type of reminder'
              },
              frequency: {
                type: 'string',
                enum: ['once', 'daily', 'weekdays'],
                description: 'How often to remind'
              },
              message: {
                type: 'string',
                description: 'Custom reminder message'
              }
            },
            required: ['time', 'type']
          }
        },
        {
          name: 'getQuickCalm',
          description: 'Get an immediate calming technique for acute anxiety',
          parameters: {
            type: 'object',
            properties: {
              intensity: {
                type: 'string',
                enum: ['mild', 'moderate', 'severe'],
                description: 'Current anxiety intensity'
              },
              context: {
                type: 'string',
                enum: ['can_move', 'must_stay_still', 'in_public', 'at_home'],
                description: 'Current context/location'
              }
            }
          }
        },
        {
          name: 'trackSession',
          description: 'Track a completed mindfulness session',
          parameters: {
            type: 'object',
            properties: {
              sessionType: {
                type: 'string',
                description: 'Type of session completed'
              },
              duration: {
                type: 'integer',
                description: 'Duration in minutes'
              },
              anxietyBefore: {
                type: 'integer',
                description: 'Anxiety level before (1-10)'
              },
              anxietyAfter: {
                type: 'integer',
                description: 'Anxiety level after (1-10)'
              },
              notes: {
                type: 'string',
                description: 'Optional notes about the session'
              }
            },
            required: ['sessionType', 'duration']
          }
        }
      ]
    };
  }

  /**
   * Check if tool is available
   */
  async isAvailable() {
    return true; // Always available as it's self-contained
  }

  /**
   * Start a mindfulness session
   */
  async startSession(params, context = {}) {
    const { sessionType, duration, technique } = params;

    let session = {
      success: true,
      type: sessionType,
      duration,
      startTime: new Date().toISOString(),
      id: `session_${Date.now()}`
    };

    if (sessionType === 'breathing') {
      const pattern = this.breathingPatterns[technique] || this.breathingPatterns.simple;
      const cycleTime = pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2;
      const rounds = Math.floor((duration * 60) / cycleTime);

      session.technique = pattern.name;
      session.pattern = pattern;
      session.rounds = rounds;
      session.instructions = this.generateBreathingInstructions(pattern, rounds);
    } else if (sessionType === 'meditation') {
      session.technique = technique || 'mindful_awareness';
      session.instructions = this.generateMeditationInstructions(duration, technique);
    } else if (sessionType === 'grounding') {
      session.technique = technique || '5-4-3-2-1';
      session.instructions = this.generateGroundingInstructions(technique);
    }

    session.tips = [
      'Find a quiet spot if possible',
      'It\'s okay if your mind wanders - just gently return',
      'There\'s no wrong way to do this'
    ];

    return session;
  }

  /**
   * Get a pre-built guided session
   */
  async getGuidedSession(params, context = {}) {
    const { sessionId } = params;

    const session = this.guidedSessions[sessionId];
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      success: true,
      sessionId,
      name: session.name,
      duration: session.duration,
      type: session.type,
      totalSteps: session.steps.length,
      steps: session.steps,
      preparationTips: [
        'Find a comfortable position',
        'Silence notifications if possible',
        'Remember: this is your time'
      ]
    };
  }

  /**
   * Get a breathing exercise with full timing
   */
  async getBreathingExercise(params, context = {}) {
    const { pattern, rounds = 4 } = params;

    const breathPattern = this.breathingPatterns[pattern];
    if (!breathPattern) {
      throw new Error(`Breathing pattern not found: ${pattern}`);
    }

    const cycleTime = breathPattern.inhale + breathPattern.hold1 +
                      breathPattern.exhale + breathPattern.hold2;

    // Generate detailed timing for each round
    const roundInstructions = [];
    for (let i = 0; i < rounds; i++) {
      const roundStart = i * cycleTime;
      const round = {
        round: i + 1,
        steps: [
          { phase: 'inhale', duration: breathPattern.inhale, startAt: roundStart,
            instruction: `Breathe IN for ${breathPattern.inhale} seconds` }
        ]
      };

      let offset = breathPattern.inhale;

      if (breathPattern.hold1 > 0) {
        round.steps.push({
          phase: 'hold',
          duration: breathPattern.hold1,
          startAt: roundStart + offset,
          instruction: `HOLD for ${breathPattern.hold1} seconds`
        });
        offset += breathPattern.hold1;
      }

      round.steps.push({
        phase: 'exhale',
        duration: breathPattern.exhale,
        startAt: roundStart + offset,
        instruction: `Breathe OUT for ${breathPattern.exhale} seconds`
      });
      offset += breathPattern.exhale;

      if (breathPattern.hold2 > 0) {
        round.steps.push({
          phase: 'hold',
          duration: breathPattern.hold2,
          startAt: roundStart + offset,
          instruction: `HOLD for ${breathPattern.hold2} seconds`
        });
      }

      roundInstructions.push(round);
    }

    return {
      success: true,
      pattern: breathPattern.name,
      description: breathPattern.description,
      rounds,
      totalDuration: rounds * cycleTime,
      cycleTime,
      timing: breathPattern,
      roundInstructions,
      tips: [
        'Breathe through your nose if comfortable',
        'Keep shoulders relaxed',
        'If you feel dizzy, return to normal breathing'
      ]
    };
  }

  /**
   * Schedule a mindfulness reminder
   */
  async scheduleReminder(params, context = {}) {
    const { time, type, frequency = 'once', message } = params;

    // Default messages by type
    const defaultMessages = {
      breathing: '🌬️ Time for a breathing break. Just 3 deep breaths can help.',
      check_in: '💭 Mindful check-in: How are you feeling right now?',
      grounding: '🌿 Grounding moment: Feel your feet on the floor. You are here.',
      gratitude: '🙏 Gratitude pause: What\'s one small thing you\'re grateful for right now?'
    };

    const reminder = {
      success: true,
      reminderId: `reminder_${Date.now()}`,
      time,
      type,
      frequency,
      message: message || defaultMessages[type],
      createdAt: new Date().toISOString(),
      nextOccurrence: this.calculateNextOccurrence(time, frequency),
      suggestedDuration: type === 'breathing' ? '1-2 minutes' : '30 seconds'
    };

    // In production, this would integrate with a notification system
    // For now, return the reminder details
    return reminder;
  }

  /**
   * Get immediate calming technique for acute anxiety
   */
  async getQuickCalm(params = {}, context = {}) {
    const { intensity = 'moderate', context: situation = 'at_home' } = params;

    let response = {
      success: true,
      intensity,
      context: situation,
      techniques: []
    };

    // Primary technique based on intensity
    if (intensity === 'severe') {
      response.primary = {
        name: 'Physiological Sigh',
        duration: '30 seconds',
        steps: [
          'Take a quick breath in through your nose',
          'Without exhaling, take another small sip of air',
          'Now exhale slowly through your mouth for as long as you can',
          'Repeat 2-3 times'
        ],
        why: 'This is the fastest way to activate your calm nervous system'
      };

      response.techniques.push({
        name: 'Ice/Cold Water',
        available: situation !== 'in_public',
        instruction: 'Splash cold water on your face or hold ice cubes. This activates the dive reflex and slows your heart.'
      });
    } else if (intensity === 'moderate') {
      response.primary = {
        name: 'Box Breathing',
        duration: '2 minutes',
        steps: [
          'Breathe in for 4 counts',
          'Hold for 4 counts',
          'Breathe out for 4 counts',
          'Hold for 4 counts',
          'Repeat 4 times'
        ],
        why: 'Creates a sense of control and slows the stress response'
      };
    } else {
      response.primary = {
        name: 'Simple Long Exhale',
        duration: '1 minute',
        steps: [
          'Breathe in normally',
          'Exhale slowly, making it longer than the inhale',
          'Repeat 5-6 times'
        ],
        why: 'Long exhales activate your parasympathetic (calm) nervous system'
      };
    }

    // Context-appropriate secondary techniques
    if (situation === 'in_public') {
      response.techniques.push({
        name: 'Subtle Grounding',
        instruction: 'Feel your feet on the floor. Press them down slightly. No one will notice.'
      });
      response.techniques.push({
        name: 'Palm Press',
        instruction: 'Press your palms together for 10 seconds. Focus on the pressure.'
      });
    } else if (situation === 'must_stay_still') {
      response.techniques.push({
        name: 'Mental 5-4-3-2-1',
        instruction: 'In your mind: name 5 things you can see, 4 you can feel, 3 you can hear.'
      });
    } else {
      response.techniques.push({
        name: 'Shake it Out',
        instruction: 'Stand up and shake your hands and arms for 30 seconds. Releases tension.'
      });
      response.techniques.push({
        name: 'Cold Water',
        instruction: 'Splash cold water on your face and wrists.'
      });
    }

    response.reminder = 'This feeling will pass. You\'ve survived every anxious moment before this one.';
    response.aftercare = 'Once you feel a bit better, try a short grounding exercise to fully reset.';

    return response;
  }

  /**
   * Track a completed session
   */
  async trackSession(params, context = {}) {
    const { sessionType, duration, anxietyBefore, anxietyAfter, notes } = params;

    const session = {
      success: true,
      sessionId: `tracked_${Date.now()}`,
      sessionType,
      duration,
      completedAt: new Date().toISOString(),
      anxietyBefore: anxietyBefore || null,
      anxietyAfter: anxietyAfter || null,
      anxietyReduction: anxietyBefore && anxietyAfter ? anxietyBefore - anxietyAfter : null,
      notes: notes || null
    };

    // Calculate effectiveness
    if (session.anxietyReduction !== null) {
      if (session.anxietyReduction >= 3) {
        session.effectiveness = 'very effective';
        session.feedback = 'Great session! This technique really helped.';
      } else if (session.anxietyReduction >= 1) {
        session.effectiveness = 'effective';
        session.feedback = 'Good work. Every bit of calm counts.';
      } else if (session.anxietyReduction === 0) {
        session.effectiveness = 'neutral';
        session.feedback = 'Sometimes the benefit comes later. You did the practice, and that matters.';
      } else {
        session.effectiveness = 'challenging';
        session.feedback = 'This one was hard. That happens. Try a different technique next time, or a shorter session.';
      }
    } else {
      session.effectiveness = 'completed';
      session.feedback = 'Well done for completing the session!';
    }

    // Streak tracking would go here in production
    session.encouragement = this.getRandomEncouragement();

    return session;
  }

  // Helper methods

  generateBreathingInstructions(pattern, rounds) {
    const instructions = [
      'Find a comfortable position, sitting or standing.',
      'Let your shoulders drop.',
      `We\'ll do ${rounds} rounds of ${pattern.name}.`
    ];

    for (let i = 1; i <= rounds; i++) {
      instructions.push(`Round ${i}: Inhale... hold... exhale... hold...`);
    }

    instructions.push('Well done. Notice how your body feels now.');
    return instructions;
  }

  generateMeditationInstructions(duration, technique) {
    const baseInstructions = [
      'Find a comfortable position.',
      'Close your eyes or soften your gaze.',
      'Take a few natural breaths to settle.'
    ];

    if (technique === 'body_scan') {
      return [
        ...baseInstructions,
        'We\'ll scan through your body, noticing sensations.',
        'Start at the top of your head...',
        'Move slowly down through your body...',
        'End at your feet, feeling grounded.'
      ];
    }

    return [
      ...baseInstructions,
      'Simply notice your breath.',
      'When thoughts come, acknowledge them and return to the breath.',
      'There\'s no right or wrong way.',
      `Continue for ${duration} minutes.`
    ];
  }

  generateGroundingInstructions(technique) {
    if (technique === '5-4-3-2-1') {
      return [
        'Look around and name 5 things you can SEE.',
        'Notice 4 things you can TOUCH.',
        'Listen for 3 things you can HEAR.',
        'Identify 2 things you can SMELL.',
        'Notice 1 thing you can TASTE.',
        'Take a breath. You are here, present.'
      ];
    }

    return [
      'Feel your feet on the ground.',
      'Notice where your body contacts the chair.',
      'Take three slow breaths.',
      'You are here, in this moment, safe.'
    ];
  }

  calculateNextOccurrence(time, frequency) {
    const [hours, minutes] = time.split(':').map(Number);
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    if (next < new Date()) {
      next.setDate(next.getDate() + 1);
    }

    if (frequency === 'weekdays' && (next.getDay() === 0 || next.getDay() === 6)) {
      const daysToAdd = next.getDay() === 0 ? 1 : 2;
      next.setDate(next.getDate() + daysToAdd);
    }

    return next.toISOString();
  }

  getRandomEncouragement() {
    const encouragements = [
      'Every moment of mindfulness matters.',
      'You showed up for yourself. That takes strength.',
      'Building this habit is a gift to yourself.',
      'Small practices create big changes over time.',
      'Your nervous system thanks you.',
      'This is self-care in action.',
      'You\'re training your mind, one breath at a time.'
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  }
}

module.exports = MindfulnessTool;
