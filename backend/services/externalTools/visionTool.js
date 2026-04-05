/**
 * Gemini Vision Tool for NutritionAgent
 *
 * Provides meal photo analysis capabilities:
 * - Food identification from photos
 * - Nutritional estimation
 * - Meal balance assessment
 * - Portion size feedback
 * - Mood-food pattern analysis
 *
 * Uses Google's Gemini Vision API (same API key as text generation).
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class VisionTool {
  constructor() {
    this.name = 'vision';
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Nutritional reference data for common foods
    this.nutritionReference = {
      categories: {
        protein: ['chicken', 'fish', 'meat', 'eggs', 'tofu', 'beans', 'lentils', 'cheese'],
        vegetables: ['salad', 'broccoli', 'carrots', 'spinach', 'tomato', 'peppers', 'leafy'],
        grains: ['rice', 'bread', 'pasta', 'oats', 'cereal', 'quinoa', 'noodles'],
        fruits: ['apple', 'banana', 'orange', 'berries', 'mango', 'grapes'],
        dairy: ['milk', 'yogurt', 'cheese', 'curd'],
        fats: ['oil', 'butter', 'nuts', 'avocado', 'fried']
      },
      moodFoods: {
        positive: ['fruits', 'vegetables', 'nuts', 'fish', 'whole grains', 'dark chocolate'],
        neutral: ['plain rice', 'bread', 'chicken', 'eggs'],
        comfort: ['pizza', 'burger', 'fries', 'ice cream', 'chips', 'sweets', 'fried']
      }
    };
  }

  /**
   * Get Gemini function declaration schema
   */
  static getSchema() {
    return {
      description: 'Meal photo analysis using Gemini Vision for nutritional insights',
      functions: [
        {
          name: 'analyzeMeal',
          description: 'Analyze a meal photo to identify foods and estimate nutritional content',
          parameters: {
            type: 'object',
            properties: {
              imageBase64: {
                type: 'string',
                description: 'Base64-encoded image data'
              },
              mimeType: {
                type: 'string',
                enum: ['image/jpeg', 'image/png', 'image/webp'],
                description: 'MIME type of the image'
              },
              mealType: {
                type: 'string',
                enum: ['breakfast', 'lunch', 'dinner', 'snack', 'unknown'],
                description: 'Type of meal being analyzed'
              }
            },
            required: ['imageBase64', 'mimeType']
          }
        },
        {
          name: 'assessMealBalance',
          description: 'Assess the nutritional balance of a meal based on photo analysis',
          parameters: {
            type: 'object',
            properties: {
              imageBase64: {
                type: 'string',
                description: 'Base64-encoded image data'
              },
              mimeType: {
                type: 'string',
                description: 'MIME type of the image'
              }
            },
            required: ['imageBase64', 'mimeType']
          }
        },
        {
          name: 'estimatePortionSize',
          description: 'Estimate portion size and caloric content from a meal photo',
          parameters: {
            type: 'object',
            properties: {
              imageBase64: {
                type: 'string',
                description: 'Base64-encoded image data'
              },
              mimeType: {
                type: 'string',
                description: 'MIME type of the image'
              }
            },
            required: ['imageBase64', 'mimeType']
          }
        },
        {
          name: 'getMoodFoodAnalysis',
          description: 'Analyze how the meal might affect mood based on its contents',
          parameters: {
            type: 'object',
            properties: {
              imageBase64: {
                type: 'string',
                description: 'Base64-encoded image data'
              },
              mimeType: {
                type: 'string',
                description: 'MIME type of the image'
              }
            },
            required: ['imageBase64', 'mimeType']
          }
        },
        {
          name: 'suggestImprovements',
          description: 'Suggest nutritional improvements for a meal',
          parameters: {
            type: 'object',
            properties: {
              imageBase64: {
                type: 'string',
                description: 'Base64-encoded image data'
              },
              mimeType: {
                type: 'string',
                description: 'MIME type of the image'
              },
              dietaryPreferences: {
                type: 'array',
                items: { type: 'string' },
                description: 'User dietary preferences (e.g., vegetarian, low-carb)'
              }
            },
            required: ['imageBase64', 'mimeType']
          }
        }
      ]
    };
  }

  /**
   * Check if vision tool is available
   */
  async isAvailable() {
    return !!process.env.GEMINI_API_KEY;
  }

  /**
   * Analyze a meal photo
   */
  async analyzeMeal(params, context = {}) {
    const { imageBase64, mimeType, mealType = 'unknown' } = params;

    const prompt = `You are a nutritionist analyzing a meal photo. Identify all foods visible and provide nutritional information.

Meal type: ${mealType}

Analyze this meal and return a JSON object with:
{
  "foods": [
    {
      "name": "food item name",
      "category": "protein/vegetable/grain/fruit/dairy/fat",
      "estimatedCalories": number,
      "estimatedProtein": "low/medium/high",
      "isHealthy": boolean
    }
  ],
  "overallCalories": "estimated total calories range",
  "mainComponents": ["list of main food groups present"],
  "missingComponents": ["list of food groups that could be added"],
  "confidence": "high/medium/low",
  "description": "Brief description of the meal"
}

Be realistic with calorie estimates. If you cannot clearly identify a food, make your best guess and note lower confidence.

IMPORTANT: Respond ONLY with valid JSON, no other text.`;

    try {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Clean and parse JSON
      const cleaned = this.cleanJsonResponse(text);
      const analysis = JSON.parse(cleaned);

      return {
        success: true,
        mealType,
        ...analysis,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Vision analyzeMeal error:', error);
      throw new Error(`Failed to analyze meal: ${error.message}`);
    }
  }

  /**
   * Assess nutritional balance of a meal
   */
  async assessMealBalance(params, context = {}) {
    const { imageBase64, mimeType } = params;

    const prompt = `You are a nutritionist evaluating the balance of a meal. Look at this meal photo and assess its nutritional balance.

Analyze and return a JSON object:
{
  "balanceScore": 1-10,
  "hasProtein": boolean,
  "hasVegetables": boolean,
  "hasGrains": boolean,
  "hasFruit": boolean,
  "hasDairy": boolean,
  "colorVariety": "poor/fair/good/excellent",
  "portionBalance": "too little/appropriate/too much",
  "strengths": ["list of nutritional strengths"],
  "improvements": ["list of suggested improvements"],
  "overallVerdict": "Brief overall assessment"
}

IMPORTANT: Respond ONLY with valid JSON, no other text.`;

    try {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      const cleaned = this.cleanJsonResponse(text);
      const assessment = JSON.parse(cleaned);

      // Add balance category
      const score = assessment.balanceScore;
      assessment.balanceCategory = score >= 8 ? 'excellent' :
        score >= 6 ? 'good' :
        score >= 4 ? 'fair' : 'needs improvement';

      return {
        success: true,
        ...assessment,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Vision assessMealBalance error:', error);
      throw new Error(`Failed to assess meal balance: ${error.message}`);
    }
  }

  /**
   * Estimate portion size and calories
   */
  async estimatePortionSize(params, context = {}) {
    const { imageBase64, mimeType } = params;

    const prompt = `You are a nutritionist estimating portion sizes from a meal photo. Be realistic and conservative with estimates.

Analyze the portion sizes and return a JSON object:
{
  "portions": [
    {
      "food": "food name",
      "estimatedAmount": "amount with unit (e.g., '1 cup', '150g', '4 oz')",
      "estimatedCalories": number,
      "portionAssessment": "small/medium/large/very large"
    }
  ],
  "totalCaloriesLow": number,
  "totalCaloriesHigh": number,
  "totalProteinGrams": "estimated range",
  "totalCarbsGrams": "estimated range",
  "totalFatGrams": "estimated range",
  "overallPortionSize": "light/moderate/generous/excessive",
  "recommendation": "Brief portion recommendation"
}

IMPORTANT: Respond ONLY with valid JSON, no other text.`;

    try {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      const cleaned = this.cleanJsonResponse(text);
      const estimate = JSON.parse(cleaned);

      // Add average calories
      estimate.averageCalories = Math.round(
        (estimate.totalCaloriesLow + estimate.totalCaloriesHigh) / 2
      );

      return {
        success: true,
        ...estimate,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Vision estimatePortionSize error:', error);
      throw new Error(`Failed to estimate portion size: ${error.message}`);
    }
  }

  /**
   * Analyze mood-food relationship
   */
  async getMoodFoodAnalysis(params, context = {}) {
    const { imageBase64, mimeType } = params;

    const prompt = `You are a nutritional psychologist analyzing how a meal might affect mood and mental well-being.

Based on the meal in this photo, analyze its potential mood impact:
{
  "moodImpact": "positive/neutral/negative",
  "moodScore": 1-10,
  "energyEffect": "energizing/sustaining/draining",
  "moodBoosters": ["foods in the meal that support good mood"],
  "concerns": ["foods that might negatively affect mood if eaten regularly"],
  "isComfortFood": boolean,
  "bloodSugarImpact": "stable/moderate spike/likely spike",
  "mentalClarityEffect": "supporting/neutral/potentially reducing",
  "recommendations": ["suggestions for mood-supporting eating"],
  "positiveAspects": "What's good about this meal for mental health"
}

Consider: omega-3s, complex carbs, protein, processed foods, sugar content, whole foods vs processed.

IMPORTANT: Respond ONLY with valid JSON, no other text.`;

    try {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      const cleaned = this.cleanJsonResponse(text);
      const analysis = JSON.parse(cleaned);

      return {
        success: true,
        ...analysis,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Vision getMoodFoodAnalysis error:', error);
      throw new Error(`Failed to analyze mood-food relationship: ${error.message}`);
    }
  }

  /**
   * Suggest improvements to a meal
   */
  async suggestImprovements(params, context = {}) {
    const { imageBase64, mimeType, dietaryPreferences = [] } = params;

    const preferencesText = dietaryPreferences.length > 0
      ? `User dietary preferences: ${dietaryPreferences.join(', ')}`
      : 'No specific dietary preferences';

    const prompt = `You are a nutritionist suggesting gentle improvements to a meal. Be encouraging, not critical.

${preferencesText}

Look at this meal and suggest improvements:
{
  "currentMealSummary": "Brief description of what you see",
  "whatWorksWell": ["positive aspects of this meal"],
  "suggestions": [
    {
      "suggestion": "specific improvement",
      "reason": "why it helps",
      "difficulty": "easy/medium",
      "moodBenefit": "how it might help mood/energy"
    }
  ],
  "easyAdditions": ["simple things to add"],
  "simpleSwaps": ["healthier alternatives that are easy"],
  "encouragement": "Positive, supportive message about their eating",
  "nextMealTip": "One tip for their next meal"
}

Keep suggestions practical and achievable. Don't be preachy or make the person feel bad.

IMPORTANT: Respond ONLY with valid JSON, no other text.`;

    try {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      const cleaned = this.cleanJsonResponse(text);
      const suggestions = JSON.parse(cleaned);

      return {
        success: true,
        dietaryPreferences,
        ...suggestions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Vision suggestImprovements error:', error);
      throw new Error(`Failed to suggest improvements: ${error.message}`);
    }
  }

  /**
   * Clean JSON response from Gemini
   */
  cleanJsonResponse(text) {
    let cleaned = text.trim();

    // Remove markdown code blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }

    return cleaned.trim();
  }

  /**
   * Validate that image data is usable
   */
  validateImageData(base64Data, mimeType) {
    if (!base64Data || base64Data.length === 0) {
      throw new Error('Image data is empty');
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(mimeType)) {
      throw new Error(`Invalid MIME type: ${mimeType}. Supported: ${validMimeTypes.join(', ')}`);
    }

    // Check approximate file size (base64 is ~33% larger than binary)
    const approximateSizeKB = (base64Data.length * 0.75) / 1024;
    if (approximateSizeKB > 10240) { // 10MB limit
      throw new Error('Image too large. Please use an image under 10MB.');
    }

    return true;
  }

  /**
   * Track meal for daily summary
   */
  async trackMealForSummary(mealData, userId) {
    // This would store meal data for daily/weekly nutrition summaries
    // Implementation depends on your storage strategy
    return {
      tracked: true,
      mealId: `meal_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = VisionTool;
