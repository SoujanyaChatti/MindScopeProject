/**
 * Base Recovery Agent
 *
 * Abstract base class for all recovery agents.
 * Each agent specializes in a specific aspect of mental health recovery.
 */

const geminiService = require('../geminiService');

class BaseAgent {
  constructor(name, criteria, description) {
    this.name = name;
    this.criteria = criteria;  // SNAM criteria numbers this agent handles
    this.description = description;
    this.interventions = [];
    this.checkInQuestions = [];
  }

  /**
   * Get initial task when agent is activated
   * @param {String} userId - User ID
   * @param {Number} severityScore - Score for this criterion (0-3)
   * @param {Number} criterion - SNAM criterion number
   */
  async getInitialTask(userId, severityScore, criterion) {
    const intervention = this.selectIntervention(severityScore);

    return {
      type: 'initial',
      title: intervention.title,
      description: intervention.description,
      priority: this.getPriority(severityScore),
      estimatedDuration: intervention.duration,
      criterion: criterion
    };
  }

  /**
   * Generate a check-in message for the user
   * @param {String} userId - User ID
   */
  async generateCheckIn(userId) {
    const question = this.selectCheckInQuestion();

    return {
      type: 'check_in',
      message: question.text,
      quickResponses: question.quickResponses || null,
      followUpEnabled: true
    };
  }

  /**
   * Process user's response to check-in
   * @param {String} userId - User ID
   * @param {String} response - User's response text
   */
  async processResponse(userId, response) {
    // Use LLM to analyze response and generate follow-up
    const analysis = await this.analyzeResponse(response);

    return {
      understood: true,
      sentiment: analysis.sentiment,
      followUp: analysis.followUp,
      recommendation: analysis.recommendation,
      shouldEscalate: analysis.shouldEscalate
    };
  }

  /**
   * Analyze user response using LLM
   */
  async analyzeResponse(response) {
    try {
      const prompt = `You are a ${this.description} helping with mental health recovery.

User's response: "${response}"

Analyze this response and provide:
1. Sentiment (positive, neutral, negative)
2. A supportive follow-up message (1-2 sentences)
3. A specific recommendation based on what they said
4. Whether this needs escalation (true if concerning, false otherwise)

Respond in JSON:
{"sentiment":"positive/neutral/negative","followUp":"supportive message","recommendation":"specific tip","shouldEscalate":false}`;

      const result = await geminiService.generateContent(prompt, 500);
      const cleaned = geminiService.cleanJsonResponse(result);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error(`${this.name} analysis error:`, error);
      return {
        sentiment: 'neutral',
        followUp: "Thank you for sharing. I'm here to support you.",
        recommendation: this.interventions[0]?.description || 'Take it one step at a time.',
        shouldEscalate: false
      };
    }
  }

  /**
   * Get progress report for this agent's domain
   * @param {String} userId - User ID
   */
  async getProgressReport(userId) {
    // This would normally query stored data
    // For now, return a template
    return {
      agent: this.name,
      criteria: this.criteria,
      trend: 'stable',
      checkInsCompleted: 0,
      interventionsCompleted: 0,
      notes: []
    };
  }

  /**
   * Select appropriate intervention based on severity
   */
  selectIntervention(severityScore) {
    if (severityScore >= 3) {
      return this.interventions.find(i => i.level === 'intensive') || this.interventions[0];
    } else if (severityScore >= 2) {
      return this.interventions.find(i => i.level === 'moderate') || this.interventions[0];
    }
    return this.interventions.find(i => i.level === 'light') || this.interventions[0];
  }

  /**
   * Select a check-in question (can be randomized)
   */
  selectCheckInQuestion() {
    const index = Math.floor(Math.random() * this.checkInQuestions.length);
    return this.checkInQuestions[index] || { text: 'How are you doing today?' };
  }

  /**
   * Get priority level based on severity
   */
  getPriority(severityScore) {
    if (severityScore >= 3) return 'high';
    if (severityScore >= 2) return 'medium';
    return 'low';
  }
}

module.exports = BaseAgent;
