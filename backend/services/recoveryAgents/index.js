/**
 * Recovery Agents System
 *
 * Agentic recovery system that activates specialized agents based on
 * assessment results. Each agent focuses on a specific SNAM criterion
 * and provides personalized interventions.
 *
 * Architecture:
 * Assessment Results → Orchestrator → Activated Agents → Daily Check-ins
 */

const SleepAgent = require('./sleepAgent');
const ActivityAgent = require('./activityAgent');
const MoodAgent = require('./moodAgent');
const WorryAgent = require('./worryAgent');
const NutritionAgent = require('./nutritionAgent');
const EnergyAgent = require('./energyAgent');

class RecoveryOrchestrator {
  constructor() {
    this.agents = {
      sleep: new SleepAgent(),           // C7: Sleep problems
      activity: new ActivityAgent(),      // C2: Interest/enjoyment, C9: Psychomotor
      mood: new MoodAgent(),              // C1: Mood, C3: Self-worth
      worry: new WorryAgent(),            // C5: Worry/anxiety
      nutrition: new NutritionAgent(),    // C8: Eating changes
      energy: new EnergyAgent()           // C10: Tiredness/low energy
    };

    // Criterion to agent mapping
    this.criteriaAgentMap = {
      1: ['mood'],           // Feeling sad → MoodAgent
      2: ['activity'],       // Losing interest → ActivityAgent
      3: ['mood'],           // Self-worth → MoodAgent
      4: ['activity'],       // Concentration → ActivityAgent (cognitive exercises)
      5: ['worry'],          // Worry → WorryAgent
      6: null,               // Crisis - handled separately
      7: ['sleep'],          // Sleep → SleepAgent
      8: ['nutrition'],      // Eating → NutritionAgent
      9: ['activity'],       // Psychomotor → ActivityAgent
      10: ['energy'],        // Tiredness → EnergyAgent
      11: ['activity', 'mood'] // Functioning → Multiple agents
    };
  }

  /**
   * Activate agents based on assessment results
   * @param {Object} assessmentResult - Completed assessment with scores
   * @returns {Object} Activation result with active agents and initial tasks
   */
  async activateAgents(assessmentResult) {
    const { snamScores, userId } = assessmentResult;
    const rawCriteriaScores = snamScores?.criteriaScores || [];

    // Convert array format to object format if needed
    // Assessment model stores: [{criteria: 1, score: 2}, ...]
    // We need: {1: 2, 2: 2, ...}
    let criteriaScores = {};
    if (Array.isArray(rawCriteriaScores)) {
      rawCriteriaScores.forEach(item => {
        if (item.criteria !== undefined && item.score !== undefined) {
          criteriaScores[item.criteria] = item.score;
        }
      });
    } else {
      criteriaScores = rawCriteriaScores;
    }

    const activatedAgents = [];
    const initialTasks = [];

    // Determine which agents to activate based on scores
    for (const [criterion, score] of Object.entries(criteriaScores)) {
      if (score >= 1) {  // Activate if any symptom present
        const agentNames = this.criteriaAgentMap[criterion];
        if (agentNames) {
          for (const agentName of agentNames) {
            if (!activatedAgents.includes(agentName)) {
              activatedAgents.push(agentName);

              // Get initial task from agent
              const agent = this.agents[agentName];
              const task = await agent.getInitialTask(userId, score, criterion);
              if (task) {
                initialTasks.push({
                  agent: agentName,
                  ...task
                });
              }
            }
          }
        }
      }
    }

    // Store activation state
    const activationState = {
      userId,
      assessmentId: assessmentResult._id,
      activatedAgents,
      activatedAt: new Date(),
      severityLevel: snamScores?.severityLevel,
      totalScore: snamScores?.totalScore
    };

    return {
      success: true,
      activationState,
      initialTasks,
      message: `Activated ${activatedAgents.length} recovery agents`
    };
  }

  /**
   * Get daily check-in from all active agents
   * @param {String} userId - User ID
   * @param {Array} activeAgents - List of active agent names
   * @returns {Array} Check-in messages from agents
   */
  async getDailyCheckIns(userId, activeAgents) {
    const checkIns = [];

    for (const agentName of activeAgents) {
      const agent = this.agents[agentName];
      if (agent) {
        const checkIn = await agent.generateCheckIn(userId);
        if (checkIn) {
          checkIns.push({
            agent: agentName,
            ...checkIn
          });
        }
      }
    }

    return checkIns;
  }

  /**
   * Process user response to agent check-in
   * @param {String} agentName - Agent that asked the question
   * @param {String} userId - User ID
   * @param {String} response - User's response
   * @returns {Object} Agent's follow-up and any updates
   */
  async processAgentResponse(agentName, userId, response) {
    const agent = this.agents[agentName];
    if (!agent) {
      return { error: 'Agent not found' };
    }

    return await agent.processResponse(userId, response);
  }

  /**
   * Get progress report from all agents
   * @param {String} userId - User ID
   * @param {Array} activeAgents - List of active agent names
   * @returns {Object} Combined progress report
   */
  async getProgressReport(userId, activeAgents) {
    const reports = {};

    for (const agentName of activeAgents) {
      const agent = this.agents[agentName];
      if (agent) {
        reports[agentName] = await agent.getProgressReport(userId);
      }
    }

    return {
      userId,
      generatedAt: new Date(),
      agentReports: reports,
      overallProgress: this.calculateOverallProgress(reports)
    };
  }

  /**
   * Calculate overall progress from agent reports
   */
  calculateOverallProgress(reports) {
    const trends = Object.values(reports).map(r => r?.trend || 'stable');

    const improving = trends.filter(t => t === 'improving').length;
    const worsening = trends.filter(t => t === 'worsening').length;

    if (improving > worsening) return 'improving';
    if (worsening > improving) return 'worsening';
    return 'stable';
  }
}

module.exports = {
  RecoveryOrchestrator,
  SleepAgent,
  ActivityAgent,
  MoodAgent,
  WorryAgent,
  NutritionAgent,
  EnergyAgent
};
