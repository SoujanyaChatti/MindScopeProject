const axios = require('axios');
const geminiService = require('../../services/geminiService');

// Mock axios
jest.mock('axios');

describe('GeminiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.GEMINI_API_URL = 'https://test-api.com';
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: 'Generated AI response'
              }]
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await geminiService.generateContent('Test prompt');

      expect(result).toBe('Generated AI response');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('https://test-gemini-api.com'),
        expect.objectContaining({
          contents: [{
            parts: [{
              text: 'Test prompt'
            }]
          }]
        }),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        })
      );
    });

    it('should handle API key missing', async () => {
      const originalApiKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = '';

      // Mock axios to simulate API key error
      axios.post.mockRejectedValue(new Error('API key not configured'));

      await expect(geminiService.generateContent('Test prompt'))
        .rejects.toThrow('Failed to generate content with Gemini API');

      // Restore the original API key
      process.env.GEMINI_API_KEY = originalApiKey;
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      axios.post.mockRejectedValue(error);

      await expect(geminiService.generateContent('Test prompt'))
        .rejects.toThrow('Failed to generate content with Gemini API');
    });

    it('should handle 404 model not found error', async () => {
      const error = {
        response: {
          data: {
            error: {
              code: 404
            }
          }
        }
      };
      axios.post.mockRejectedValue(error);

      await expect(geminiService.generateContent('Test prompt'))
        .rejects.toThrow('AI service temporarily unavailable. Please try again later.');
    });

    it('should handle invalid response format', async () => {
      const mockResponse = {
        data: {
          candidates: []
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      await expect(geminiService.generateContent('Test prompt'))
        .rejects.toThrow('Failed to generate content with Gemini API');
    });
  });

  describe('mapResponseToPHQ9', () => {
    it('should map response to PHQ-9 score successfully', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  score: 2,
                  confidence: 0.8,
                  reasoning: 'User shows moderate symptoms'
                })
              }]
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await geminiService.mapResponseToPHQ9(
        'How are you feeling?',
        'I feel sad most days',
        'mood'
      );

      expect(result).toEqual({
        score: 2,
        confidence: 0.8,
        reasoning: 'User shows moderate symptoms'
      });
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: 'Invalid JSON response'
              }]
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await geminiService.mapResponseToPHQ9(
        'How are you feeling?',
        'I feel sad',
        'mood'
      );

      expect(result.score).toBe(1);
      expect(result.confidence).toBe(0.5);
      expect(result.reasoning).toBe('Unable to parse AI response, assigned conservative score');
    });

    it('should handle invalid score range', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  score: 5, // Invalid score
                  confidence: 0.8,
                  reasoning: 'Invalid score'
                })
              }]
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await geminiService.mapResponseToPHQ9(
        'How are you feeling?',
        'I feel sad',
        'mood'
      );

      expect(result.score).toBe(1);
      expect(result.confidence).toBe(0.5);
    });

    it('should fallback to keyword scoring on API error', async () => {
      axios.post.mockRejectedValue(new Error('API Error'));

      const result = await geminiService.mapResponseToPHQ9(
        'How are you feeling?',
        'I always feel terrible',
        'mood'
      );

      expect(result.score).toBe(3);
      expect(result.confidence).toBe(0.6);
      expect(result.reasoning).toBe('Fallback scoring based on keyword analysis');
    });
  });

  describe('selectNextQuestion', () => {
    it('should select next question successfully', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  nextQuestionId: 'question-2',
                  reasoning: 'User shows moderate symptoms, continue assessment'
                })
              }]
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const allQuestions = [
        { id: 'question-1', text: 'Question 1', category: 'mood' },
        { id: 'question-2', text: 'Question 2', category: 'sleep' }
      ];

      const askedQuestions = [{ id: 'question-1', text: 'Question 1', category: 'mood' }];
      const userResponses = [{ userResponse: 'I feel sad', phq9Mapping: { score: 2 } }];

      const result = await geminiService.selectNextQuestion(allQuestions, askedQuestions, userResponses);

      expect(result).toEqual({
        nextQuestionId: 'question-2',
        reasoning: 'User shows moderate symptoms, continue assessment'
      });
    });

    it('should handle assessment complete response', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  nextQuestionId: 'ASSESSMENT_COMPLETE',
                  reasoning: 'Enough information gathered'
                })
              }]
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const allQuestions = [{ id: 'question-1', text: 'Question 1', category: 'mood' }];
      const askedQuestions = [{ id: 'question-1', text: 'Question 1', category: 'mood' }];
      const userResponses = [{ userResponse: 'I feel fine', phq9Mapping: { score: 0 } }];

      const result = await geminiService.selectNextQuestion(allQuestions, askedQuestions, userResponses);

      expect(result.nextQuestionId).toBe('ASSESSMENT_COMPLETE');
    });

    it('should fallback to sequential selection on error', async () => {
      axios.post.mockRejectedValue(new Error('API Error'));

      const allQuestions = [
        { id: 'question-1', text: 'Question 1', category: 'mood' },
        { id: 'question-2', text: 'Question 2', category: 'sleep' }
      ];

      const askedQuestions = [{ id: 'question-1', text: 'Question 1', category: 'mood' }];
      const userResponses = [{ userResponse: 'I feel sad', phq9Mapping: { score: 2 } }];

      const result = await geminiService.selectNextQuestion(allQuestions, askedQuestions, userResponses);

      expect(result.nextQuestionId).toBe('question-2');
      expect(result.reasoning).toBe('Sequential question selection (fallback)');
    });

    it('should return assessment complete when no more questions', async () => {
      axios.post.mockRejectedValue(new Error('API Error'));

      const allQuestions = [{ id: 'question-1', text: 'Question 1', category: 'mood' }];
      const askedQuestions = [{ id: 'question-1', text: 'Question 1', category: 'mood' }];
      const userResponses = [{ userResponse: 'I feel sad', phq9Mapping: { score: 2 } }];

      const result = await geminiService.selectNextQuestion(allQuestions, askedQuestions, userResponses);

      expect(result.nextQuestionId).toBe('ASSESSMENT_COMPLETE');
      expect(result.reasoning).toBe('All questions have been asked');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations successfully', async () => {
      const mockRecommendations = {
        lifestyleChanges: [
          {
            category: 'sleep',
            title: 'Improve Sleep Schedule',
            description: 'Go to bed at the same time each night',
            priority: 'high',
            estimatedImpact: 'high'
          }
        ],
        professionalHelp: {
          recommended: true,
          urgency: 'soon',
          reasoning: 'Moderate symptoms detected',
          resources: ['Therapist', 'Counselor']
        },
        followUpSchedule: {
          suggestedInterval: 7,
          reasoning: 'Weekly check-ins recommended'
        }
      };

      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(mockRecommendations)
              }]
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await geminiService.generateRecommendations(
        15,
        'moderately-severe',
        [{ questionText: 'How are you?', userResponse: 'I feel sad' }]
      );

      expect(result).toEqual(mockRecommendations);
    });

    it('should fallback to default recommendations on error', async () => {
      axios.post.mockRejectedValue(new Error('API Error'));

      const result = await geminiService.generateRecommendations(
        20,
        'severe',
        [{ questionText: 'How are you?', userResponse: 'I feel terrible' }]
      );

      expect(result.lifestyleChanges).toBeDefined();
      expect(result.professionalHelp).toBeDefined();
      expect(result.followUpSchedule).toBeDefined();
      expect(result.professionalHelp.recommended).toBe(true);
      expect(result.professionalHelp.urgency).toBe('immediate');
    });

    it('should handle JSON parse error', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: 'Invalid JSON'
              }]
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await geminiService.generateRecommendations(
        10,
        'moderate',
        [{ questionText: 'How are you?', userResponse: 'I feel okay' }]
      );

      expect(result.lifestyleChanges).toBeDefined();
      expect(result.professionalHelp).toBeDefined();
    });
  });

  describe('answerMentalHealthQuestion', () => {
    it('should answer mental health questions', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: 'I understand you\'re feeling sad. It\'s important to talk to someone you trust about your feelings.'
              }]
            }
          }]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await geminiService.answerMentalHealthQuestion('I feel really sad today');

      expect(result).toBe('I understand you\'re feeling sad. It\'s important to talk to someone you trust about your feelings.');
    });

    it('should handle API errors gracefully', async () => {
      axios.post.mockRejectedValue(new Error('API Error'));

      const result = await geminiService.answerMentalHealthQuestion('I feel sad');

      expect(result).toBe('I apologize, but I\'m having trouble processing your question right now. For immediate mental health support, please contact a mental health professional or crisis helpline.');
    });
  });

  describe('getCategoryCriteria', () => {
    it('should return criteria for known categories', () => {
      const result = geminiService.getCategoryCriteria('mood');
      expect(result).toContain('feeling sad');
      expect(result).toContain('depressed');
    });

    it('should return default criteria for unknown categories', () => {
      const result = geminiService.getCategoryCriteria('unknown-category');
      expect(result).toBe('Analyze the response for symptoms related to this category');
    });
  });

  describe('fallbackScoring', () => {
    it('should score high severity keywords', () => {
      const result = geminiService.fallbackScoring('I always feel terrible', 'mood');
      expect(result.score).toBe(3);
      expect(result.confidence).toBe(0.6);
    });

    it('should score medium severity keywords', () => {
      const result = geminiService.fallbackScoring('I often feel sad', 'mood');
      expect(result.score).toBe(2);
      expect(result.confidence).toBe(0.5);
    });

    it('should score low severity keywords', () => {
      const result = geminiService.fallbackScoring('I sometimes feel a bit down', 'mood');
      expect(result.score).toBe(1);
      expect(result.confidence).toBe(0.4);
    });

    it('should score no symptoms', () => {
      const result = geminiService.fallbackScoring('I feel great', 'mood');
      expect(result.score).toBe(0);
      expect(result.confidence).toBe(0.3);
    });
  });

  describe('getFallbackRecommendations', () => {
    it('should return recommendations for severe depression', () => {
      const result = geminiService.getFallbackRecommendations('severe');
      expect(result.professionalHelp.recommended).toBe(true);
      expect(result.professionalHelp.urgency).toBe('immediate');
      expect(result.followUpSchedule.suggestedInterval).toBe(3);
    });

    it('should return recommendations for moderate depression', () => {
      const result = geminiService.getFallbackRecommendations('moderately-severe');
      expect(result.professionalHelp.recommended).toBe(true);
      expect(result.professionalHelp.urgency).toBe('soon');
      expect(result.followUpSchedule.suggestedInterval).toBe(7);
    });

    it('should return recommendations for minimal depression', () => {
      const result = geminiService.getFallbackRecommendations('minimal');
      expect(result.professionalHelp.recommended).toBe(false);
      expect(result.followUpSchedule.suggestedInterval).toBe(14);
    });
  });
});
