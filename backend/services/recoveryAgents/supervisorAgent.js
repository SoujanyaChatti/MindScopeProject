/**
 * Supervisor Agent - Agentic Orchestration Layer
 *
 * A meta-agent that coordinates all recovery agents using:
 * - Cross-agent communication and state sharing
 * - Dynamic priority adjustment based on progress
 * - Reflection loops with weekly planning
 * - Crisis detection and escalation
 * - Gemini function calling for autonomous decisions
 *
 * Inspired by 2025 multi-agent mental health systems (AutoCBT, MAGI)
 */

const geminiService = require('../geminiService');

class SupervisorAgent {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.name = 'supervisor';

    // Cross-agent influence mappings
    this.agentInfluences = {
      sleep: {
        affects: ['energy', 'mood', 'worry'],
        affectedBy: ['worry', 'activity']
      },
      energy: {
        affects: ['activity', 'mood'],
        affectedBy: ['sleep', 'nutrition']
      },
      mood: {
        affects: ['activity', 'worry', 'nutrition'],
        affectedBy: ['sleep', 'activity', 'energy']
      },
      worry: {
        affects: ['sleep', 'mood', 'energy'],
        affectedBy: ['mood', 'activity']
      },
      activity: {
        affects: ['mood', 'energy', 'sleep'],
        affectedBy: ['energy', 'mood']
      },
      nutrition: {
        affects: ['energy', 'mood'],
        affectedBy: ['mood', 'activity']
      }
    };

    // Escalation thresholds
    this.escalationThresholds = {
      negativeSentimentStreak: 3,  // 3 consecutive negative check-ins
      stalledProgressDays: 7,      // No improvement in 7 days
      crisisKeywords: ['hurt myself', 'end it', 'suicide', 'no point', 'give up', 'can\'t go on'],
      lowScoreThreshold: 2         // Average check-in score below 2
    };

    // Gemini tools for autonomous actions
    this.tools = [
      {
        name: 'adjustAgentPriority',
        description: 'Adjust the priority level of a recovery agent based on user progress',
        parameters: {
          agentName: { type: 'string', description: 'Name of the agent to adjust' },
          newPriority: { type: 'string', enum: ['high', 'medium', 'low'] },
          reason: { type: 'string', description: 'Reason for adjustment' }
        }
      },
      {
        name: 'triggerCrossIntervention',
        description: 'Trigger a joint intervention involving multiple agents',
        parameters: {
          primaryAgent: { type: 'string' },
          supportingAgents: { type: 'array', items: { type: 'string' } },
          interventionType: { type: 'string' }
        }
      },
      {
        name: 'escalateToHuman',
        description: 'Escalate case to human professional or crisis resources',
        parameters: {
          urgency: { type: 'string', enum: ['immediate', 'urgent', 'routine'] },
          reason: { type: 'string' },
          suggestedAction: { type: 'string' }
        }
      },
      {
        name: 'scheduleReflection',
        description: 'Schedule a reflection session with the user',
        parameters: {
          type: { type: 'string', enum: ['daily', 'weekly', 'milestone'] },
          focusAreas: { type: 'array', items: { type: 'string' } }
        }
      },
      {
        name: 'adjustInterventionLevel',
        description: 'Move user to a different intervention intensity level',
        parameters: {
          agentName: { type: 'string' },
          direction: { type: 'string', enum: ['increase', 'decrease', 'maintain'] },
          reason: { type: 'string' }
        }
      }
    ];
  }

  /**
   * Main supervision loop - called periodically or after significant events
   */
  async supervise(userId, recoveryData) {
    const analysis = await this.analyzeRecoveryState(userId, recoveryData);
    const decisions = await this.makeAgenticDecisions(analysis);
    const actions = await this.executeDecisions(userId, recoveryData, decisions);

    return {
      analysis,
      decisions,
      actions,
      nextSupervisionIn: this.calculateNextSupervision(analysis)
    };
  }

  /**
   * Comprehensive analysis of user's recovery state
   */
  async analyzeRecoveryState(userId, recoveryData) {
    const activeAgents = recoveryData.activeAgents || [];
    const checkIns = recoveryData.checkIns || [];
    const criteriaProgress = recoveryData.criteriaProgress || [];

    // Calculate per-agent metrics
    const agentMetrics = {};
    for (const agent of activeAgents) {
      const agentCheckIns = checkIns.filter(c => c.agentName === agent.agentName);
      const recentCheckIns = agentCheckIns.slice(-7); // Last 7 check-ins

      agentMetrics[agent.agentName] = {
        totalCheckIns: agentCheckIns.length,
        recentCheckIns: recentCheckIns.length,
        averageScore: this.calculateAverageScore(recentCheckIns),
        sentimentTrend: this.calculateSentimentTrend(recentCheckIns),
        streak: agent.checkInStreak || 0,
        lastCheckIn: agent.lastCheckIn,
        priority: agent.priority,
        interventionLevel: agent.currentIntervention?.level || 'light',
        progressTrend: this.getProgressTrend(criteriaProgress, agent.agentName)
      };
    }

    // Cross-agent analysis
    const crossAgentInsights = this.analyzeCrossAgentPatterns(agentMetrics);

    // Crisis indicators
    const crisisIndicators = await this.detectCrisisIndicators(checkIns, agentMetrics);

    // Overall recovery health
    const overallHealth = this.calculateOverallHealth(agentMetrics, criteriaProgress);

    return {
      userId,
      timestamp: new Date(),
      agentMetrics,
      crossAgentInsights,
      crisisIndicators,
      overallHealth,
      daysInRecovery: recoveryData.daysActive || 0,
      totalCheckIns: checkIns.length
    };
  }

  /**
   * Use Gemini to make agentic decisions based on analysis
   */
  async makeAgenticDecisions(analysis) {
    const prompt = `You are a clinical supervisor AI coordinating a multi-agent mental health recovery system.

CURRENT STATE ANALYSIS:
${JSON.stringify(analysis, null, 2)}

AVAILABLE ACTIONS (function calls):
1. adjustAgentPriority - Change agent priority based on progress
2. triggerCrossIntervention - Create joint interventions between agents
3. escalateToHuman - Escalate to professional help if needed
4. scheduleReflection - Plan reflection sessions
5. adjustInterventionLevel - Modify intervention intensity

CROSS-AGENT INFLUENCE MAP:
- Sleep problems → affects energy, mood, worry
- Low energy → affects activity, mood
- Mood issues → affects activity, worry, nutrition
- Worry/anxiety → affects sleep, mood, energy
- Low activity → affects mood, energy, sleep
- Poor nutrition → affects energy, mood

Based on the analysis, determine what supervisory actions are needed. Consider:
1. Are any agents showing consistent negative trends? → Adjust priority or intervention level
2. Is there cross-agent interference? (e.g., worry affecting sleep) → Trigger joint intervention
3. Are there crisis indicators? → Escalate if needed
4. Is the user making good progress? → Consider reducing intensity or celebrating
5. Has it been a week? → Schedule reflection

Respond with a JSON array of decisions:
[
  {
    "action": "function_name",
    "parameters": {...},
    "reasoning": "brief explanation",
    "priority": "high/medium/low"
  }
]

Be conservative - only recommend actions when clearly needed. Empty array if no action needed.`;

    try {
      const result = await geminiService.generateContent(prompt, 1500);
      const cleaned = geminiService.cleanJsonResponse(result);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Supervisor decision error:', error);
      return this.fallbackDecisions(analysis);
    }
  }

  /**
   * Execute the decided actions
   */
  async executeDecisions(userId, recoveryData, decisions) {
    const executedActions = [];

    for (const decision of decisions) {
      try {
        let result;

        switch (decision.action) {
          case 'adjustAgentPriority':
            result = await this.executeAdjustPriority(
              userId, recoveryData, decision.parameters
            );
            break;

          case 'triggerCrossIntervention':
            result = await this.executeCrossIntervention(
              userId, recoveryData, decision.parameters
            );
            break;

          case 'escalateToHuman':
            result = await this.executeEscalation(
              userId, recoveryData, decision.parameters
            );
            break;

          case 'scheduleReflection':
            result = await this.executeScheduleReflection(
              userId, recoveryData, decision.parameters
            );
            break;

          case 'adjustInterventionLevel':
            result = await this.executeAdjustIntervention(
              userId, recoveryData, decision.parameters
            );
            break;

          default:
            result = { success: false, error: 'Unknown action' };
        }

        executedActions.push({
          ...decision,
          result,
          executedAt: new Date()
        });
      } catch (error) {
        executedActions.push({
          ...decision,
          result: { success: false, error: error.message },
          executedAt: new Date()
        });
      }
    }

    return executedActions;
  }

  /**
   * Execute priority adjustment
   */
  async executeAdjustPriority(userId, recoveryData, params) {
    const { agentName, newPriority, reason } = params;

    const agentIndex = recoveryData.activeAgents.findIndex(
      a => a.agentName === agentName
    );

    if (agentIndex === -1) {
      return { success: false, error: 'Agent not found' };
    }

    const oldPriority = recoveryData.activeAgents[agentIndex].priority;
    recoveryData.activeAgents[agentIndex].priority = newPriority;

    // Log the adjustment
    if (!recoveryData.supervisorActions) {
      recoveryData.supervisorActions = [];
    }

    recoveryData.supervisorActions.push({
      type: 'priority_adjustment',
      agentName,
      oldPriority,
      newPriority,
      reason,
      timestamp: new Date()
    });

    return {
      success: true,
      agentName,
      oldPriority,
      newPriority,
      reason
    };
  }

  /**
   * Execute cross-agent intervention
   */
  async executeCrossIntervention(userId, recoveryData, params) {
    const { primaryAgent, supportingAgents, interventionType } = params;

    // Generate a coordinated intervention plan
    const interventionPlan = await this.generateCrossIntervention(
      primaryAgent, supportingAgents, interventionType, recoveryData
    );

    // Store the cross-intervention
    if (!recoveryData.crossInterventions) {
      recoveryData.crossInterventions = [];
    }

    recoveryData.crossInterventions.push({
      id: `cross_${Date.now()}`,
      primaryAgent,
      supportingAgents,
      interventionType,
      plan: interventionPlan,
      status: 'active',
      createdAt: new Date()
    });

    return {
      success: true,
      intervention: interventionPlan
    };
  }

  /**
   * Generate coordinated cross-agent intervention
   */
  async generateCrossIntervention(primaryAgent, supportingAgents, type, recoveryData) {
    const interventionTemplates = {
      'sleep-worry': {
        title: 'Sleep-Anxiety Connection Protocol',
        description: 'Address worry patterns that interfere with sleep',
        steps: [
          { agent: 'worry', action: 'Schedule worry time 3 hours before bed' },
          { agent: 'worry', action: 'Practice brain dump journaling' },
          { agent: 'sleep', action: 'Implement wind-down routine' },
          { agent: 'sleep', action: 'Use progressive muscle relaxation' }
        ],
        duration: '1 week',
        successCriteria: 'Sleep quality rating improves by 1 point'
      },
      'energy-activity': {
        title: 'Energy-Paced Activity Building',
        description: 'Gradually increase activity while respecting energy levels',
        steps: [
          { agent: 'energy', action: 'Track energy patterns for 3 days' },
          { agent: 'activity', action: 'Match activities to peak energy times' },
          { agent: 'energy', action: 'Implement strategic rest periods' },
          { agent: 'activity', action: 'Use micro-activities during low energy' }
        ],
        duration: '1 week',
        successCriteria: 'Complete 5+ activities without energy crash'
      },
      'mood-activity': {
        title: 'Behavioral Activation for Mood',
        description: 'Use structured activity to lift mood',
        steps: [
          { agent: 'mood', action: 'Identify mood-activity connections' },
          { agent: 'activity', action: 'Schedule one pleasant activity daily' },
          { agent: 'mood', action: 'Track mood before/after activities' },
          { agent: 'activity', action: 'Gradually increase activity complexity' }
        ],
        duration: '2 weeks',
        successCriteria: 'Mood rating averages 3+ after activities'
      },
      'nutrition-energy': {
        title: 'Fuel for Energy Protocol',
        description: 'Optimize nutrition to support energy levels',
        steps: [
          { agent: 'nutrition', action: 'Establish regular meal times' },
          { agent: 'energy', action: 'Track energy around meals' },
          { agent: 'nutrition', action: 'Add energy-supporting foods' },
          { agent: 'energy', action: 'Identify energy crashes from food' }
        ],
        duration: '1 week',
        successCriteria: 'Fewer afternoon energy crashes'
      }
    };

    const key = `${primaryAgent}-${supportingAgents[0]}`;
    const reverseKey = `${supportingAgents[0]}-${primaryAgent}`;

    return interventionTemplates[key] ||
           interventionTemplates[reverseKey] ||
           this.generateCustomIntervention(primaryAgent, supportingAgents, type);
  }

  /**
   * Generate custom cross-intervention using LLM
   */
  async generateCustomIntervention(primaryAgent, supportingAgents, type) {
    const prompt = `Create a coordinated mental health intervention plan:

Primary Focus Agent: ${primaryAgent}
Supporting Agents: ${supportingAgents.join(', ')}
Intervention Type: ${type}

Create a structured plan with:
1. Title
2. Description
3. Steps (with which agent handles each)
4. Duration
5. Success criteria

Respond in JSON format.`;

    try {
      const result = await geminiService.generateContent(prompt, 800);
      return JSON.parse(geminiService.cleanJsonResponse(result));
    } catch {
      return {
        title: `${primaryAgent}-${supportingAgents[0]} Coordination`,
        description: 'Custom coordinated intervention',
        steps: [
          { agent: primaryAgent, action: 'Primary intervention focus' },
          { agent: supportingAgents[0], action: 'Supporting intervention' }
        ],
        duration: '1 week',
        successCriteria: 'Improvement in both areas'
      };
    }
  }

  /**
   * Execute escalation to human/crisis resources
   */
  async executeEscalation(userId, recoveryData, params) {
    const { urgency, reason, suggestedAction } = params;

    const escalation = {
      id: `esc_${Date.now()}`,
      userId,
      urgency,
      reason,
      suggestedAction,
      timestamp: new Date(),
      status: 'pending',
      resources: this.getEscalationResources(urgency)
    };

    // Store escalation
    if (!recoveryData.escalations) {
      recoveryData.escalations = [];
    }
    recoveryData.escalations.push(escalation);

    // For immediate urgency, also flag the recovery
    if (urgency === 'immediate') {
      recoveryData.crisisFlag = true;
      recoveryData.crisisFlaggedAt = new Date();
    }

    return {
      success: true,
      escalation,
      userNotification: this.generateEscalationMessage(urgency, reason)
    };
  }

  /**
   * Get crisis resources based on urgency
   */
  getEscalationResources(urgency) {
    const resources = {
      immediate: [
        { name: 'National Suicide Prevention Lifeline', contact: '988', available: '24/7' },
        { name: 'Crisis Text Line', contact: 'Text HOME to 741741', available: '24/7' },
        { name: 'Emergency Services', contact: '911', available: '24/7' }
      ],
      urgent: [
        { name: 'National Suicide Prevention Lifeline', contact: '988', available: '24/7' },
        { name: 'SAMHSA Helpline', contact: '1-800-662-4357', available: '24/7' },
        { name: 'Consider scheduling with mental health professional', contact: null }
      ],
      routine: [
        { name: 'Consider therapy or counseling', contact: null },
        { name: 'Talk to your doctor about your symptoms', contact: null },
        { name: 'SAMHSA Treatment Locator', contact: 'findtreatment.samhsa.gov' }
      ]
    };

    return resources[urgency] || resources.routine;
  }

  /**
   * Generate user-facing escalation message
   */
  generateEscalationMessage(urgency, reason) {
    const messages = {
      immediate: `I'm concerned about what you've shared. Your safety is the top priority right now. Please reach out to one of these resources immediately, or call 911 if you're in danger.`,
      urgent: `I've noticed some patterns in your check-ins that suggest you might benefit from additional support. Consider reaching out to a mental health professional soon.`,
      routine: `Based on your progress, it might be helpful to connect with additional professional support to complement your recovery journey.`
    };

    return messages[urgency] || messages.routine;
  }

  /**
   * Schedule a reflection session
   */
  async executeScheduleReflection(userId, recoveryData, params) {
    const { type, focusAreas } = params;

    const reflection = {
      id: `ref_${Date.now()}`,
      type,
      focusAreas,
      scheduledFor: this.calculateReflectionTime(type),
      status: 'scheduled',
      questions: await this.generateReflectionQuestions(type, focusAreas, recoveryData)
    };

    if (!recoveryData.scheduledReflections) {
      recoveryData.scheduledReflections = [];
    }
    recoveryData.scheduledReflections.push(reflection);

    return {
      success: true,
      reflection
    };
  }

  /**
   * Generate reflection questions based on focus areas
   */
  async generateReflectionQuestions(type, focusAreas, recoveryData) {
    const baseQuestions = {
      daily: [
        'What went well today?',
        'What was challenging?',
        'What\'s one thing you\'re proud of?'
      ],
      weekly: [
        'Looking back at this week, what progress have you noticed?',
        'What strategies worked well for you?',
        'What would you like to try differently next week?',
        'How has your overall mood been this week compared to last?'
      ],
      milestone: [
        'What have you learned about yourself during this recovery journey?',
        'What coping strategies have become most helpful?',
        'What goals would you like to set for the next phase?'
      ]
    };

    // Add focus-area specific questions
    const focusQuestions = focusAreas.map(area => {
      const areaQuestions = {
        sleep: 'How has your sleep quality changed?',
        mood: 'What patterns have you noticed in your mood?',
        activity: 'Which activities have brought you the most satisfaction?',
        worry: 'How have your anxiety levels changed?',
        energy: 'When do you feel most energized during the day?',
        nutrition: 'How has your relationship with food evolved?'
      };
      return areaQuestions[area] || null;
    }).filter(Boolean);

    return [...baseQuestions[type], ...focusQuestions];
  }

  /**
   * Calculate when reflection should occur
   */
  calculateReflectionTime(type) {
    const now = new Date();
    switch (type) {
      case 'daily':
        // Tonight at 8 PM
        now.setHours(20, 0, 0, 0);
        if (now < new Date()) now.setDate(now.getDate() + 1);
        return now;
      case 'weekly':
        // Next Sunday at 6 PM
        const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
        now.setDate(now.getDate() + daysUntilSunday);
        now.setHours(18, 0, 0, 0);
        return now;
      case 'milestone':
        // In 2 weeks
        now.setDate(now.getDate() + 14);
        now.setHours(18, 0, 0, 0);
        return now;
      default:
        return now;
    }
  }

  /**
   * Adjust intervention intensity level
   */
  async executeAdjustIntervention(userId, recoveryData, params) {
    const { agentName, direction, reason } = params;

    const agent = recoveryData.activeAgents.find(a => a.agentName === agentName);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    const levels = ['light', 'moderate', 'intensive'];
    const currentLevel = agent.currentIntervention?.level || 'light';
    const currentIndex = levels.indexOf(currentLevel);

    let newIndex;
    if (direction === 'increase') {
      newIndex = Math.min(currentIndex + 1, levels.length - 1);
    } else if (direction === 'decrease') {
      newIndex = Math.max(currentIndex - 1, 0);
    } else {
      newIndex = currentIndex;
    }

    const newLevel = levels[newIndex];

    // Get new intervention from the agent
    const agentInstance = this.orchestrator.agents[agentName];
    if (agentInstance) {
      const newIntervention = agentInstance.interventions.find(i => i.level === newLevel);
      if (newIntervention) {
        agent.currentIntervention = {
          ...newIntervention,
          assignedAt: new Date(),
          previousLevel: currentLevel
        };
      }
    }

    // Log the adjustment
    if (!recoveryData.interventionAdjustments) {
      recoveryData.interventionAdjustments = [];
    }
    recoveryData.interventionAdjustments.push({
      agentName,
      previousLevel: currentLevel,
      newLevel,
      direction,
      reason,
      timestamp: new Date()
    });

    return {
      success: true,
      agentName,
      previousLevel: currentLevel,
      newLevel,
      reason
    };
  }

  /**
   * Analyze cross-agent patterns
   */
  analyzeCrossAgentPatterns(agentMetrics) {
    const insights = [];

    // Check for sleep-worry connection
    if (agentMetrics.sleep?.averageScore < 3 && agentMetrics.worry?.averageScore < 3) {
      insights.push({
        pattern: 'sleep-worry-cycle',
        description: 'Both sleep and worry showing struggles - may be reinforcing each other',
        recommendation: 'Consider cross-intervention targeting worry before bed',
        severity: 'moderate'
      });
    }

    // Check for energy-activity connection
    if (agentMetrics.energy?.averageScore < 3 && agentMetrics.activity?.averageScore < 3) {
      insights.push({
        pattern: 'energy-activity-cycle',
        description: 'Low energy and low activity may be creating a negative cycle',
        recommendation: 'Focus on micro-activities that don\'t require high energy',
        severity: 'moderate'
      });
    }

    // Check for mood-activity connection
    if (agentMetrics.mood?.sentimentTrend === 'declining' &&
        agentMetrics.activity?.averageScore < 3) {
      insights.push({
        pattern: 'mood-activity-connection',
        description: 'Declining mood with low activity - behavioral activation opportunity',
        recommendation: 'Increase pleasant activity scheduling',
        severity: 'moderate'
      });
    }

    // Check for nutrition-energy connection
    if (agentMetrics.nutrition?.averageScore < 3 && agentMetrics.energy?.averageScore < 3) {
      insights.push({
        pattern: 'nutrition-energy-link',
        description: 'Poor nutrition may be contributing to low energy',
        recommendation: 'Focus on regular meals and energy-supporting foods',
        severity: 'low'
      });
    }

    return insights;
  }

  /**
   * Detect crisis indicators from check-ins
   */
  async detectCrisisIndicators(checkIns, agentMetrics) {
    const recentCheckIns = checkIns.slice(-10);
    const indicators = {
      detected: false,
      level: 'none',
      factors: []
    };

    // Check for negative sentiment streak
    const recentSentiments = recentCheckIns.map(c => c.sentiment);
    const negativeStreak = this.countConsecutive(recentSentiments, 'negative');

    if (negativeStreak >= this.escalationThresholds.negativeSentimentStreak) {
      indicators.factors.push({
        type: 'negative_streak',
        value: negativeStreak,
        description: `${negativeStreak} consecutive negative check-ins`
      });
      indicators.detected = true;
    }

    // Check for crisis keywords in responses
    const allResponses = recentCheckIns.map(c => c.response?.toLowerCase() || '');
    for (const keyword of this.escalationThresholds.crisisKeywords) {
      if (allResponses.some(r => r.includes(keyword))) {
        indicators.factors.push({
          type: 'crisis_language',
          value: keyword,
          description: 'Crisis-related language detected'
        });
        indicators.detected = true;
        indicators.level = 'high';
      }
    }

    // Check for consistently low scores
    const avgScores = Object.values(agentMetrics)
      .map(m => m.averageScore)
      .filter(s => s !== null);
    const overallAvg = avgScores.reduce((a, b) => a + b, 0) / avgScores.length;

    if (overallAvg < this.escalationThresholds.lowScoreThreshold) {
      indicators.factors.push({
        type: 'low_scores',
        value: overallAvg.toFixed(2),
        description: 'Consistently low check-in scores'
      });
      indicators.detected = true;
    }

    // Set overall level
    if (indicators.factors.some(f => f.type === 'crisis_language')) {
      indicators.level = 'immediate';
    } else if (indicators.factors.length >= 2) {
      indicators.level = 'urgent';
    } else if (indicators.detected) {
      indicators.level = 'routine';
    }

    return indicators;
  }

  /**
   * Calculate overall recovery health score
   */
  calculateOverallHealth(agentMetrics, criteriaProgress) {
    const metrics = Object.values(agentMetrics);

    // Average score across agents
    const avgScore = metrics
      .filter(m => m.averageScore !== null)
      .reduce((sum, m) => sum + m.averageScore, 0) / metrics.length || 0;

    // Engagement (based on streaks and check-in frequency)
    const avgStreak = metrics.reduce((sum, m) => sum + m.streak, 0) / metrics.length;
    const engagementScore = Math.min(5, avgStreak);

    // Progress trend
    const improvingCount = criteriaProgress.filter(p => p.trend === 'improving').length;
    const worseningCount = criteriaProgress.filter(p => p.trend === 'worsening').length;
    const progressScore = (improvingCount - worseningCount + criteriaProgress.length) /
                          (criteriaProgress.length * 2) * 5;

    const overallScore = (avgScore + engagementScore + progressScore) / 3;

    return {
      score: overallScore.toFixed(2),
      level: overallScore >= 4 ? 'excellent' :
             overallScore >= 3 ? 'good' :
             overallScore >= 2 ? 'fair' : 'needs_attention',
      components: {
        averageCheckInScore: avgScore.toFixed(2),
        engagementScore: engagementScore.toFixed(2),
        progressScore: progressScore.toFixed(2)
      }
    };
  }

  /**
   * Helper: Calculate average score from check-ins
   */
  calculateAverageScore(checkIns) {
    if (!checkIns.length) return null;
    const scores = checkIns.filter(c => c.score).map(c => c.score);
    if (!scores.length) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Helper: Calculate sentiment trend
   */
  calculateSentimentTrend(checkIns) {
    if (checkIns.length < 3) return 'insufficient_data';

    const sentimentScores = checkIns.map(c => {
      if (c.sentiment === 'positive') return 1;
      if (c.sentiment === 'negative') return -1;
      return 0;
    });

    const firstHalf = sentimentScores.slice(0, Math.floor(sentimentScores.length / 2));
    const secondHalf = sentimentScores.slice(Math.floor(sentimentScores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 0.3) return 'improving';
    if (secondAvg < firstAvg - 0.3) return 'declining';
    return 'stable';
  }

  /**
   * Helper: Get progress trend for agent's criteria
   */
  getProgressTrend(criteriaProgress, agentName) {
    const agentCriteria = {
      sleep: [7],
      activity: [2, 4, 9, 11],
      mood: [1, 3],
      worry: [5],
      nutrition: [8],
      energy: [10]
    };

    const criteria = agentCriteria[agentName] || [];
    const relevantProgress = criteriaProgress.filter(p =>
      criteria.includes(p.criterion)
    );

    if (!relevantProgress.length) return 'unknown';

    const trends = relevantProgress.map(p => p.trend);
    if (trends.every(t => t === 'improving')) return 'improving';
    if (trends.every(t => t === 'worsening')) return 'worsening';
    if (trends.some(t => t === 'worsening')) return 'mixed';
    return 'stable';
  }

  /**
   * Helper: Count consecutive occurrences
   */
  countConsecutive(arr, value) {
    let maxCount = 0;
    let currentCount = 0;

    for (const item of arr) {
      if (item === value) {
        currentCount++;
        maxCount = Math.max(maxCount, currentCount);
      } else {
        currentCount = 0;
      }
    }

    return maxCount;
  }

  /**
   * Fallback decisions when LLM fails
   */
  fallbackDecisions(analysis) {
    const decisions = [];

    // Check for crisis
    if (analysis.crisisIndicators.level === 'immediate') {
      decisions.push({
        action: 'escalateToHuman',
        parameters: {
          urgency: 'immediate',
          reason: 'Crisis indicators detected',
          suggestedAction: 'Connect with crisis resources'
        },
        reasoning: 'Crisis language or patterns detected',
        priority: 'high'
      });
    }

    // Check for stalled agents
    for (const [agentName, metrics] of Object.entries(analysis.agentMetrics)) {
      if (metrics.sentimentTrend === 'declining' && metrics.priority !== 'high') {
        decisions.push({
          action: 'adjustAgentPriority',
          parameters: {
            agentName,
            newPriority: 'high',
            reason: 'Declining sentiment trend'
          },
          reasoning: 'Agent showing declining progress',
          priority: 'medium'
        });
      }
    }

    // Schedule weekly reflection if due
    if (analysis.daysInRecovery > 0 && analysis.daysInRecovery % 7 === 0) {
      decisions.push({
        action: 'scheduleReflection',
        parameters: {
          type: 'weekly',
          focusAreas: Object.keys(analysis.agentMetrics)
        },
        reasoning: 'Weekly reflection due',
        priority: 'low'
      });
    }

    return decisions;
  }

  /**
   * Calculate when next supervision should occur
   */
  calculateNextSupervision(analysis) {
    // More frequent supervision for concerning patterns
    if (analysis.crisisIndicators.detected) {
      return '4 hours';
    }
    if (analysis.overallHealth.level === 'needs_attention') {
      return '12 hours';
    }
    if (analysis.crossAgentInsights.length > 0) {
      return '24 hours';
    }
    return '48 hours';
  }

  /**
   * Weekly reflection and planning - called by scheduler
   */
  async conductWeeklyReflection(userId, recoveryData) {
    const analysis = await this.analyzeRecoveryState(userId, recoveryData);

    const reflectionPrompt = `Based on this week's recovery data, generate a thoughtful weekly reflection and plan.

WEEK SUMMARY:
${JSON.stringify(analysis, null, 2)}

Generate:
1. A warm, encouraging summary of the week
2. Key wins to celebrate (even small ones)
3. Challenges faced and how to address them
4. Adjusted goals for next week
5. One specific focus area

Respond in JSON:
{
  "summary": "paragraph summary",
  "wins": ["win1", "win2"],
  "challenges": [{"challenge": "...", "strategy": "..."}],
  "nextWeekGoals": ["goal1", "goal2"],
  "focusArea": {"area": "...", "why": "...", "howTo": "..."}
}`;

    try {
      const result = await geminiService.generateContent(reflectionPrompt, 1200);
      const reflection = JSON.parse(geminiService.cleanJsonResponse(result));

      // Store the reflection
      if (!recoveryData.weeklyReflections) {
        recoveryData.weeklyReflections = [];
      }
      recoveryData.weeklyReflections.push({
        ...reflection,
        weekNumber: Math.ceil(recoveryData.daysActive / 7),
        generatedAt: new Date(),
        analysis: analysis.overallHealth
      });

      return reflection;
    } catch (error) {
      console.error('Weekly reflection error:', error);
      return this.generateFallbackReflection(analysis);
    }
  }

  /**
   * Fallback reflection if LLM fails
   */
  generateFallbackReflection(analysis) {
    return {
      summary: 'Thank you for another week of working on your recovery. Every step forward counts, no matter how small.',
      wins: ['Completed check-ins', 'Stayed engaged with recovery'],
      challenges: [{
        challenge: 'Maintaining consistency',
        strategy: 'Set specific times for check-ins and activities'
      }],
      nextWeekGoals: ['Continue daily check-ins', 'Try one new coping strategy'],
      focusArea: {
        area: 'consistency',
        why: 'Building habits takes time and regular practice',
        howTo: 'Use reminders and start with small, achievable goals'
      }
    };
  }
}

module.exports = SupervisorAgent;
