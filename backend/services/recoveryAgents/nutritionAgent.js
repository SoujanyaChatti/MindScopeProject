/**
 * Nutrition Agent
 * Handles SNAM Criterion 8: Eating Changes
 *
 * Provides nutrition guidance, meal planning support, and appetite tracking.
 */

const BaseAgent = require('./baseAgent');

class NutritionAgent extends BaseAgent {
  constructor() {
    super(
      'NutritionAgent',
      [8],  // Eating changes
      'nutrition and eating habits coach focused on balanced eating and meal consistency'
    );

    this.interventions = [
      {
        level: 'light',
        title: 'Hydration Reminder',
        description: 'Start with water. Aim to drink a glass of water with each meal. Dehydration can affect mood and energy.',
        duration: 'Throughout day',
        type: 'habit'
      },
      {
        level: 'light',
        title: 'One Balanced Meal',
        description: 'Focus on having at least one balanced meal today with protein, vegetables, and whole grains.',
        duration: '20-30 min',
        type: 'nutrition'
      },
      {
        level: 'moderate',
        title: 'Regular Meal Times',
        description: 'Try to eat at roughly the same times each day. Consistency helps regulate appetite and energy.',
        duration: 'Daily practice',
        type: 'routine'
      },
      {
        level: 'moderate',
        title: 'Mindful Eating',
        description: 'For one meal today, eat without screens. Notice the taste, texture, and how full you feel.',
        duration: '15-20 min',
        type: 'mindfulness'
      },
      {
        level: 'intensive',
        title: 'Meal Prep Sunday',
        description: 'Prepare some simple meals or ingredients for the week ahead. Having food ready makes eating easier.',
        duration: '1-2 hours/week',
        type: 'planning'
      },
      {
        level: 'intensive',
        title: 'Mood-Food Journal',
        description: 'Track what you eat and how you feel after. Notice patterns between food choices and mood.',
        duration: '5 min after meals',
        type: 'tracking'
      }
    ];

    this.checkInQuestions = [
      {
        text: 'Have you eaten regular meals today?',
        quickResponses: ['Yes, all meals', 'Skipped one', 'Skipped several', 'Haven\'t eaten much']
      },
      {
        text: 'How is your appetite?',
        quickResponses: ['Normal', 'Less than usual', 'More than usual', 'No appetite']
      },
      {
        text: 'Did you drink enough water today?',
        quickResponses: ['Yes, good hydration', 'Some', 'Not much', 'Forgot to drink water']
      },
      {
        text: 'Have you been eating mostly healthy foods or comfort foods?',
        quickResponses: ['Mostly healthy', 'Mix of both', 'Mostly comfort food', 'Not eating much']
      },
      {
        text: 'Did you eat mindfully (without screens/distractions) for any meal?',
        quickResponses: ['Yes', 'Partly', 'No, ate while distracted']
      }
    ];

    // Simple meal suggestions
    this.simpleMeals = {
      breakfast: [
        'Oatmeal with banana and honey',
        'Toast with peanut butter and fruit',
        'Yogurt with granola',
        'Eggs and toast'
      ],
      lunch: [
        'Sandwich with vegetables',
        'Salad with protein (chicken, eggs, or beans)',
        'Soup with bread',
        'Rice bowl with vegetables'
      ],
      dinner: [
        'Grilled protein with vegetables',
        'Pasta with vegetables',
        'Stir-fry with rice',
        'Simple dal with rice and vegetables'
      ],
      snacks: [
        'Fruit',
        'Nuts',
        'Yogurt',
        'Crackers with cheese'
      ]
    };
  }

  /**
   * Get meal suggestion based on type
   */
  getMealSuggestion(mealType) {
    const meals = this.simpleMeals[mealType] || this.simpleMeals.snacks;
    return meals[Math.floor(Math.random() * meals.length)];
  }

  /**
   * Generate eating-specific guidance
   */
  async generateEatingGuidance(appetiteLevel) {
    if (appetiteLevel === 'no_appetite') {
      return {
        message: 'When appetite is low, small amounts still help.',
        suggestion: 'Try having something small like a few crackers, a banana, or some yogurt. Even a little nourishment helps.',
        tip: 'Sometimes drinking calories (smoothie, milk, juice) is easier than eating.'
      };
    } else if (appetiteLevel === 'overeating') {
      return {
        message: 'Emotional eating is common when we\'re struggling.',
        suggestion: 'Before eating, pause and ask: Am I hungry, or am I feeling something? Both are okay, just notice.',
        tip: 'If eating for comfort, try to include some nutritious options alongside comfort foods.'
      };
    }
    return {
      message: 'Good to hear your appetite is okay.',
      suggestion: 'Keep up the regular meals. Consistency helps.',
      tip: this.getMealSuggestion('snacks') + ' makes a good healthy snack.'
    };
  }
}

module.exports = NutritionAgent;
