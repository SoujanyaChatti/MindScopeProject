/**
 * Energy Agent
 * Handles SNAM Criterion 10: Tiredness/Low Energy
 *
 * Provides energy management strategies, pacing techniques, and fatigue tracking.
 */

const BaseAgent = require('./baseAgent');

class EnergyAgent extends BaseAgent {
  constructor() {
    super(
      'EnergyAgent',
      [10],  // Tiredness/low energy
      'energy and fatigue management coach focused on sustainable energy levels'
    );

    this.interventions = [
      {
        level: 'light',
        title: 'Energy Conservation',
        description: 'Prioritize your tasks. Do the most important thing when you have the most energy, usually earlier in the day.',
        duration: '5 min planning',
        type: 'pacing'
      },
      {
        level: 'light',
        title: 'Micro-Breaks',
        description: 'Take short 2-3 minute breaks every hour. Stand up, stretch, or look out a window.',
        duration: '2-3 min/hour',
        type: 'energy_management'
      },
      {
        level: 'moderate',
        title: 'Energy Audit',
        description: 'Notice what drains your energy (tasks, people, situations) and what gives energy. Try to balance them.',
        duration: '10 min reflection',
        type: 'awareness'
      },
      {
        level: 'moderate',
        title: 'Light Movement',
        description: 'Even a 10-minute walk can boost energy. Movement creates energy, even when you feel too tired.',
        duration: '10-15 min',
        type: 'physical'
      },
      {
        level: 'intensive',
        title: 'Activity Pacing',
        description: 'Break tasks into smaller chunks with rest periods between. Work for 25 minutes, rest for 5 (Pomodoro technique).',
        duration: 'Throughout day',
        type: 'pacing'
      },
      {
        level: 'intensive',
        title: 'Energy Rhythm Tracking',
        description: 'Track your energy levels throughout the day for a week. Identify your natural high and low energy times.',
        duration: '1 week',
        type: 'tracking'
      }
    ];

    this.checkInQuestions = [
      {
        text: 'How is your energy level today?',
        quickResponses: ['Good energy', 'Moderate', 'Low', 'Exhausted']
      },
      {
        text: 'Did you need to rest more than usual today?',
        quickResponses: ['No, felt energized', 'A bit more rest needed', 'Rested a lot', 'Couldn\'t do much at all']
      },
      {
        text: 'Were you able to complete tasks you planned?',
        quickResponses: ['Yes, all of them', 'Most of them', 'Some', 'Very few']
      },
      {
        text: 'Did any activities give you energy today?',
        quickResponses: ['Yes', 'A little', 'No, everything tired me out']
      },
      {
        text: 'How is your energy compared to yesterday?',
        quickResponses: ['Better', 'About the same', 'Worse']
      }
    ];

    // Energy-boosting quick tips
    this.quickEnergyTips = [
      'Try splashing cold water on your face for a quick energy boost.',
      'Step outside for 5 minutes. Fresh air and daylight help.',
      'Do 10 jumping jacks or march in place for 1 minute.',
      'Have a glass of water - dehydration causes fatigue.',
      'Take 5 deep breaths to increase oxygen flow.',
      'Put on an upbeat song and move to it for 2 minutes.',
      'Open a window and let fresh air in.'
    ];
  }

  /**
   * Get a quick energy tip
   */
  getQuickEnergyTip() {
    return this.quickEnergyTips[Math.floor(Math.random() * this.quickEnergyTips.length)];
  }

  /**
   * Generate energy-specific guidance
   */
  async generateEnergyGuidance(energyLevel) {
    if (energyLevel === 'exhausted') {
      return {
        message: 'When energy is very low, the priority is rest and essentials only.',
        suggestion: 'Focus on just one essential task today. Everything else can wait. Rest is productive too.',
        tip: 'If you can, try a 20-minute power nap (not longer, or it may affect night sleep).'
      };
    } else if (energyLevel === 'low') {
      return {
        message: 'Low energy days are tough. Be gentle with yourself.',
        suggestion: 'Try breaking tasks into tiny steps. Even "make coffee" can be: 1) stand up, 2) walk to kitchen, 3) turn on kettle...',
        tip: this.getQuickEnergyTip()
      };
    }
    return {
      message: 'Sounds like your energy is manageable today.',
      suggestion: 'This is a good day to tackle something you\'ve been putting off.',
      tip: 'Remember to take breaks to maintain this energy level.'
    };
  }

  /**
   * Suggest task based on current energy
   */
  suggestTaskForEnergy(energyLevel) {
    const tasks = {
      high: ['Tackle a challenging task', 'Exercise', 'Social activity', 'Important work'],
      moderate: ['Routine tasks', 'Light organization', 'Short walk', 'Phone call'],
      low: ['Rest', 'Light reading', 'Listen to music', 'Gentle stretching'],
      exhausted: ['Rest', 'Basic self-care only', 'Nothing demanding']
    };

    const level = tasks[energyLevel] || tasks.moderate;
    return level[Math.floor(Math.random() * level.length)];
  }
}

module.exports = EnergyAgent;
