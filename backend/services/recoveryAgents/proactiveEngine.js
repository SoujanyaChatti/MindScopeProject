/**
 * Proactive Agent Engine
 *
 * Enables agents to take autonomous actions based on:
 * - Time-based triggers (scheduled check-ins, reminders)
 * - Event-based triggers (missed check-ins, SER detection, weather changes)
 * - Pattern-based triggers (declining trends, streaks)
 *
 * This engine runs periodically and coordinates with the SupervisorAgent
 * to decide when and how agents should proactively reach out.
 */

const { executeAgentToolCall, getToolAvailability } = require('../externalTools');
const geminiService = require('../geminiService');

class ProactiveEngine {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.scheduledTasks = new Map();
    this.triggers = new Map();
    this.lastActions = new Map(); // Prevent action spam

    // Minimum time between proactive actions per user (in ms)
    this.actionCooldown = 2 * 60 * 60 * 1000; // 2 hours

    // Configure trigger types
    this.triggerTypes = {
      MISSED_CHECKIN: 'missed_checkin',
      NEGATIVE_TREND: 'negative_trend',
      WEATHER_CHANGE: 'weather_change',
      SER_ALERT: 'ser_alert',
      SCHEDULED: 'scheduled',
      GOAL_PROGRESS: 'goal_progress',
      STREAK_MILESTONE: 'streak_milestone'
    };

    // Agent proactive capabilities
    this.agentCapabilities = {
      activity: {
        canScheduleCalendar: true,
        canSendReminders: true,
        triggers: ['MISSED_CHECKIN', 'NEGATIVE_TREND', 'WEATHER_CHANGE', 'SCHEDULED']
      },
      nutrition: {
        canAnalyzePhotos: true,
        canTrackMeals: true,
        triggers: ['MISSED_CHECKIN', 'SCHEDULED']
      },
      energy: {
        canCheckWeather: true,
        canSuggestActivities: true,
        triggers: ['WEATHER_CHANGE', 'NEGATIVE_TREND', 'SCHEDULED']
      },
      worry: {
        canStartMindfulness: true,
        canScheduleReminders: true,
        triggers: ['SER_ALERT', 'NEGATIVE_TREND', 'SCHEDULED']
      },
      sleep: {
        canScheduleRoutines: true,
        canSendReminders: true,
        triggers: ['SCHEDULED', 'NEGATIVE_TREND']
      },
      mood: {
        canSuggestActivities: true,
        canTriggerMindfulness: true,
        triggers: ['SER_ALERT', 'NEGATIVE_TREND', 'WEATHER_CHANGE']
      }
    };
  }

  /**
   * Register a proactive trigger for a user
   */
  registerTrigger(userId, agentName, triggerType, conditions, action) {
    const triggerId = `${userId}_${agentName}_${triggerType}_${Date.now()}`;

    const trigger = {
      id: triggerId,
      userId,
      agentName,
      triggerType,
      conditions,
      action,
      enabled: true,
      createdAt: new Date(),
      lastFired: null,
      fireCount: 0
    };

    this.triggers.set(triggerId, trigger);
    return triggerId;
  }

  /**
   * Check and fire triggers for a user
   */
  async checkTriggers(userId, recoveryData, context = {}) {
    const firedActions = [];
    const now = new Date();

    for (const [triggerId, trigger] of this.triggers) {
      if (trigger.userId !== userId || !trigger.enabled) continue;

      // Check if agent is still active for this user
      const agentActive = recoveryData?.activeAgents?.some(
        a => a.agentName.toLowerCase() === trigger.agentName.toLowerCase()
      );
      if (!agentActive) continue;

      // Check cooldown
      if (this.isOnCooldown(userId, trigger.agentName)) continue;

      // Evaluate trigger conditions
      const shouldFire = await this.evaluateTriggerConditions(
        trigger,
        recoveryData,
        context
      );

      if (shouldFire) {
        try {
          const action = await this.executeProactiveAction(trigger, recoveryData, context);
          firedActions.push({
            triggerId,
            agentName: trigger.agentName,
            triggerType: trigger.triggerType,
            action,
            timestamp: now
          });

          // Update trigger state
          trigger.lastFired = now;
          trigger.fireCount++;

          // Update cooldown
          this.setLastAction(userId, trigger.agentName);
        } catch (error) {
          console.error(`Proactive action failed for trigger ${triggerId}:`, error);
        }
      }
    }

    return firedActions;
  }

  /**
   * Evaluate if trigger conditions are met
   */
  async evaluateTriggerConditions(trigger, recoveryData, context) {
    const { triggerType, conditions, agentName } = trigger;

    switch (triggerType) {
      case this.triggerTypes.MISSED_CHECKIN:
        return this.checkMissedCheckIn(agentName, recoveryData, conditions);

      case this.triggerTypes.NEGATIVE_TREND:
        return this.checkNegativeTrend(agentName, recoveryData, conditions);

      case this.triggerTypes.WEATHER_CHANGE:
        return await this.checkWeatherChange(recoveryData, conditions);

      case this.triggerTypes.SER_ALERT:
        return this.checkSERAlert(context, conditions);

      case this.triggerTypes.SCHEDULED:
        return this.checkScheduledTime(conditions);

      case this.triggerTypes.GOAL_PROGRESS:
        return this.checkGoalProgress(agentName, recoveryData, conditions);

      case this.triggerTypes.STREAK_MILESTONE:
        return this.checkStreakMilestone(agentName, recoveryData, conditions);

      default:
        return false;
    }
  }

  /**
   * Check if user missed a check-in
   */
  checkMissedCheckIn(agentName, recoveryData, conditions) {
    const { hoursThreshold = 24 } = conditions;

    const agentCheckIns = recoveryData?.checkIns?.filter(
      c => c.agentName.toLowerCase() === agentName.toLowerCase()
    ) || [];

    if (agentCheckIns.length === 0) return true;

    const lastCheckIn = new Date(agentCheckIns[agentCheckIns.length - 1].timestamp);
    const hoursSince = (Date.now() - lastCheckIn) / (1000 * 60 * 60);

    return hoursSince >= hoursThreshold;
  }

  /**
   * Check for negative trend in agent metrics
   */
  checkNegativeTrend(agentName, recoveryData, conditions) {
    const { checkInsToAnalyze = 5, declineThreshold = -0.5 } = conditions;

    const agentCheckIns = recoveryData?.checkIns?.filter(
      c => c.agentName.toLowerCase() === agentName.toLowerCase()
    ) || [];

    if (agentCheckIns.length < checkInsToAnalyze) return false;

    const recentCheckIns = agentCheckIns.slice(-checkInsToAnalyze);

    // Calculate trend (simple linear)
    const scores = recentCheckIns.map((c, i) => ({
      x: i,
      y: c.score || c.sentimentScore || 3
    }));

    const n = scores.length;
    const sumX = scores.reduce((s, p) => s + p.x, 0);
    const sumY = scores.reduce((s, p) => s + p.y, 0);
    const sumXY = scores.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = scores.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return slope <= declineThreshold;
  }

  /**
   * Check for significant weather change
   */
  async checkWeatherChange(recoveryData, conditions) {
    const { significantChangeThreshold = 10 } = conditions; // degrees

    const toolAvailable = await getToolAvailability();
    if (!toolAvailable.weather) return false;

    // Would compare current weather with stored previous weather
    // For now, return false (requires weather tracking implementation)
    return false;
  }

  /**
   * Check if SER detected concerning emotions
   */
  checkSERAlert(context, conditions) {
    const { emotionThreshold = 0.6, concerningEmotions = ['sad', 'fearful'] } = conditions;

    const serData = context.serAnalysis || context.emotionAnalysis;
    if (!serData || !serData.success) return false;

    // Check if dominant emotion is concerning
    if (concerningEmotions.includes(serData.dominantEmotion)) {
      const emotionScore = serData.emotions?.[serData.dominantEmotion] || 0;
      return emotionScore >= emotionThreshold;
    }

    // Check depression relevance score
    if (serData.depressionRelevance?.score >= 0.7) {
      return true;
    }

    return false;
  }

  /**
   * Check if scheduled time has arrived
   */
  checkScheduledTime(conditions) {
    const { scheduledHours = [], dayOfWeek = null } = conditions;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Check day of week if specified
    if (dayOfWeek !== null && currentDay !== dayOfWeek) {
      return false;
    }

    // Check if current hour matches any scheduled hour
    return scheduledHours.includes(currentHour);
  }

  /**
   * Check goal progress
   */
  checkGoalProgress(agentName, recoveryData, conditions) {
    const { goalType, targetProgress = 0.5 } = conditions;

    // Implementation would depend on how goals are tracked
    // Return false for now
    return false;
  }

  /**
   * Check streak milestones
   */
  checkStreakMilestone(agentName, recoveryData, conditions) {
    const { milestones = [3, 7, 14, 30] } = conditions;

    const agentData = recoveryData?.activeAgents?.find(
      a => a.agentName.toLowerCase() === agentName.toLowerCase()
    );

    if (!agentData) return false;

    const streak = agentData.streak || 0;
    return milestones.includes(streak);
  }

  /**
   * Execute a proactive action
   */
  async executeProactiveAction(trigger, recoveryData, context) {
    const { agentName, action, triggerType } = trigger;

    // Generate proactive message using LLM
    const message = await this.generateProactiveMessage(
      agentName,
      triggerType,
      recoveryData,
      context
    );

    // Execute any tool calls
    let toolResult = null;
    if (action.toolCall) {
      toolResult = await executeAgentToolCall(
        agentName,
        action.toolCall.tool,
        action.toolCall.function,
        action.toolCall.params,
        context
      );
    }

    return {
      type: 'proactive_outreach',
      agentName,
      triggerType,
      message,
      toolResult,
      suggestedActions: action.suggestedActions || [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate a proactive message
   */
  async generateProactiveMessage(agentName, triggerType, recoveryData, context) {
    const templates = {
      missed_checkin: {
        activity: "Haven't heard from you in a while. How are you doing with activities?",
        nutrition: "It's been a bit since we connected about eating. How's your appetite today?",
        energy: "Checking in on your energy levels. How are you feeling?",
        worry: "Just reaching out to see how your anxiety has been.",
        sleep: "How has sleep been going?",
        mood: "Wanted to check in on how you're feeling."
      },
      negative_trend: {
        activity: "I've noticed activity has been harder lately. That's okay - let's find something small that might help.",
        energy: "Your energy seems to be lower recently. Let's talk about that.",
        worry: "Anxiety seems to be higher lately. Would a quick grounding exercise help?",
        mood: "I've noticed you might be struggling a bit. I'm here for you."
      },
      weather_change: {
        activity: "The weather has changed - I have some activity ideas that match the conditions.",
        energy: "With this weather, here are some energy-supportive suggestions."
      },
      ser_alert: {
        worry: "I sense you might be feeling anxious. Would you like to try a quick calming technique?",
        mood: "It sounds like you're having a tough moment. I'm here."
      }
    };

    // Get template
    let baseMessage = templates[triggerType]?.[agentName.toLowerCase()] ||
                      "Just checking in. How are you doing?";

    // Personalize with LLM if we have context
    try {
      const prompt = `You are a supportive ${agentName} recovery agent. Generate a brief, warm, proactive check-in message.

Base message: "${baseMessage}"
Trigger: ${triggerType}
Recent data: ${JSON.stringify(recoveryData?.checkIns?.slice(-3) || [])}

Requirements:
- Keep it to 1-2 sentences
- Be warm but not intrusive
- Don't be preachy
- Ask one simple question

Return only the message text, nothing else.`;

      const result = await geminiService.generateContent(prompt, 100);
      return result.trim() || baseMessage;
    } catch (error) {
      return baseMessage;
    }
  }

  /**
   * Set up default triggers for a user based on their active agents
   */
  setupDefaultTriggers(userId, recoveryData) {
    const activeAgents = recoveryData?.activeAgents || [];

    activeAgents.forEach(agent => {
      const agentName = agent.agentName.toLowerCase();
      const capabilities = this.agentCapabilities[agentName];

      if (!capabilities) return;

      // Missed check-in trigger (24 hours)
      if (capabilities.triggers.includes('MISSED_CHECKIN')) {
        this.registerTrigger(
          userId,
          agentName,
          this.triggerTypes.MISSED_CHECKIN,
          { hoursThreshold: 24 },
          {
            suggestedActions: ['gentle_reminder', 'offer_help']
          }
        );
      }

      // Negative trend trigger
      if (capabilities.triggers.includes('NEGATIVE_TREND')) {
        this.registerTrigger(
          userId,
          agentName,
          this.triggerTypes.NEGATIVE_TREND,
          { checkInsToAnalyze: 5, declineThreshold: -0.5 },
          {
            suggestedActions: ['offer_support', 'suggest_intervention']
          }
        );
      }

      // Scheduled daily check-in
      if (capabilities.triggers.includes('SCHEDULED')) {
        const scheduledHours = this.getDefaultScheduledHours(agentName);
        this.registerTrigger(
          userId,
          agentName,
          this.triggerTypes.SCHEDULED,
          { scheduledHours },
          {
            suggestedActions: ['daily_checkin']
          }
        );
      }
    });
  }

  /**
   * Get default scheduled hours for an agent
   */
  getDefaultScheduledHours(agentName) {
    const schedules = {
      activity: [10, 15], // 10am and 3pm
      nutrition: [8, 12, 18], // Meal times
      energy: [9, 14], // Morning and afternoon
      worry: [9, 21], // Morning and evening
      sleep: [21], // Evening
      mood: [10, 19] // Morning and evening
    };
    return schedules[agentName.toLowerCase()] || [10];
  }

  /**
   * Check action cooldown
   */
  isOnCooldown(userId, agentName) {
    const key = `${userId}_${agentName}`;
    const lastAction = this.lastActions.get(key);

    if (!lastAction) return false;

    return (Date.now() - lastAction) < this.actionCooldown;
  }

  /**
   * Set last action time
   */
  setLastAction(userId, agentName) {
    const key = `${userId}_${agentName}`;
    this.lastActions.set(key, Date.now());
  }

  /**
   * Disable a trigger
   */
  disableTrigger(triggerId) {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.enabled = false;
    }
  }

  /**
   * Get all triggers for a user
   */
  getUserTriggers(userId) {
    const userTriggers = [];
    for (const [id, trigger] of this.triggers) {
      if (trigger.userId === userId) {
        userTriggers.push({
          id,
          ...trigger
        });
      }
    }
    return userTriggers;
  }

  /**
   * Clear all triggers for a user
   */
  clearUserTriggers(userId) {
    for (const [id, trigger] of this.triggers) {
      if (trigger.userId === userId) {
        this.triggers.delete(id);
      }
    }
  }

  /**
   * Activity-specific: Schedule activities in calendar when check-in missed
   */
  async proactiveActivityScheduling(userId, recoveryData, context) {
    const toolAvailable = await getToolAvailability();
    if (!toolAvailable.calendar) return null;

    // Get user's typical energy level
    const recentEnergy = recoveryData?.checkIns?.filter(
      c => c.agentName.toLowerCase() === 'activity' || c.agentName.toLowerCase() === 'energy'
    ).slice(-5);

    const avgEnergy = recentEnergy?.length > 0
      ? recentEnergy.reduce((s, c) => s + (c.score || 3), 0) / recentEnergy.length
      : 3;

    // Determine activity level based on energy
    const activityDuration = avgEnergy >= 4 ? 30 : avgEnergy >= 2.5 ? 15 : 10;
    const activityType = avgEnergy >= 4 ? 'physical' : 'relaxation';

    // Find a good time slot
    try {
      const slotResult = await executeAgentToolCall(
        'activity',
        'calendar',
        'suggestTimeSlot',
        {
          duration: activityDuration,
          preferredTimeOfDay: 'morning',
          daysAhead: 3
        },
        context
      );

      if (slotResult.success && slotResult.data.suggestions.length > 0) {
        // Create the event
        const eventResult = await executeAgentToolCall(
          'activity',
          'calendar',
          'createEvent',
          {
            title: 'Wellness Activity',
            description: `A ${activityDuration}-minute ${activityType} activity suggested by your Activity Agent.`,
            startTime: slotResult.data.suggestions[0].start,
            duration: activityDuration,
            activityType
          },
          context
        );

        return eventResult;
      }
    } catch (error) {
      console.error('Proactive activity scheduling failed:', error);
    }

    return null;
  }

  /**
   * Worry-specific: Start mindfulness when SER detects anxiety
   */
  async proactiveMindfulnessResponse(userId, serAnalysis, context) {
    if (!serAnalysis?.success) return null;

    const dominantEmotion = serAnalysis.dominantEmotion;
    const intensity = serAnalysis.depressionRelevance?.level || 'moderate';

    // Determine appropriate response
    let sessionType = 'breathing';
    let technique = 'simple';

    if (dominantEmotion === 'fearful' || intensity === 'high') {
      technique = 'physiological'; // Fastest calming
    } else if (dominantEmotion === 'sad') {
      sessionType = 'meditation';
      technique = 'loving_kindness';
    }

    try {
      const quickCalm = await executeAgentToolCall(
        'worry',
        'mindfulness',
        'getQuickCalm',
        {
          intensity: intensity === 'high' ? 'severe' : intensity === 'elevated' ? 'moderate' : 'mild',
          context: 'at_home'
        },
        context
      );

      return {
        serTrigger: true,
        emotion: dominantEmotion,
        intensity,
        response: quickCalm.data,
        message: `I noticed you might be feeling ${dominantEmotion}. Here's something that might help.`
      };
    } catch (error) {
      console.error('Proactive mindfulness response failed:', error);
    }

    return null;
  }
}

module.exports = ProactiveEngine;
