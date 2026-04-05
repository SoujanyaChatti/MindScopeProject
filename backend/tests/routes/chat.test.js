const request = require('supertest');
const express = require('express');
const chatRoutes = require('../../routes/chat');
const geminiService = require('../../services/geminiService');
const { createTestUser, generateTestToken, cleanupTestData } = require('../helpers/testHelpers');
const DatabaseTestHelper = require('../helpers/databaseTestHelper');

// Mock the Gemini service
jest.mock('../../services/geminiService');

describe('Chat Routes', () => {
  let app;
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Setup test database
    await DatabaseTestHelper.setup();
    
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/chat', chatRoutes);
  });

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clean up database before each test
    await cleanupTestData();
    
    // Create fresh test user for each test
    testUser = await createTestUser();
    authToken = generateTestToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestData();
    await DatabaseTestHelper.teardown();
  });

  describe('POST /api/chat/message', () => {
    it('should send a message and get AI response', async () => {
      const mockResponse = 'This is a helpful mental health response';
      geminiService.answerMentalHealthQuestion.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'I feel sad today' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.message).toBe(mockResponse);
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.isAuthenticated).toBe(false);
      expect(geminiService.answerMentalHealthQuestion).toHaveBeenCalledWith('I feel sad today');
    });

    it('should handle authenticated user messages', async () => {
      const mockResponse = 'Personalized response for authenticated user';
      geminiService.answerMentalHealthQuestion.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'I need help with anxiety' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.message).toBe(mockResponse);
      expect(response.body.data.isAuthenticated).toBe(true);
    });

    it('should validate message length', async () => {
      const longMessage = 'a'.repeat(2001); // Exceeds 2000 character limit

      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: longMessage })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should handle empty message', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: '' })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should handle Gemini service errors', async () => {
      geminiService.answerMentalHealthQuestion.mockRejectedValue(new Error('AI service unavailable'));

      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'I feel depressed' })
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Failed to process message');
    });

    it('should handle missing message field', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/chat/resources', () => {
    it('should return mental health resources', async () => {
      const response = await request(app)
        .get('/api/chat/resources')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.resources).toBeDefined();
      expect(response.body.data.resources.crisis).toBeDefined();
      expect(response.body.data.resources.general).toBeDefined();
      expect(response.body.data.resources.selfHelp).toBeDefined();
      expect(response.body.data.disclaimer).toBeDefined();
    });

    it('should include crisis support information', async () => {
      const response = await request(app)
        .get('/api/chat/resources')
        .expect(200);

      const crisis = response.body.data.resources.crisis;
      expect(crisis.title).toBe('Crisis Support');
      expect(crisis.contacts).toBeDefined();
      expect(crisis.contacts.length).toBeGreaterThan(0);
      
      // Check for specific crisis resources
      const suicidePrevention = crisis.contacts.find(c => c.name === 'National Suicide Prevention Lifeline');
      expect(suicidePrevention).toBeDefined();
      expect(suicidePrevention.phone).toBe('988');
    });

    it('should include general mental health resources', async () => {
      const response = await request(app)
        .get('/api/chat/resources')
        .expect(200);

      const general = response.body.data.resources.general;
      expect(general.title).toBe('General Mental Health Resources');
      expect(general.resources).toBeDefined();
      expect(general.resources.length).toBeGreaterThan(0);
    });

    it('should include self-help resources', async () => {
      const response = await request(app)
        .get('/api/chat/resources')
        .expect(200);

      const selfHelp = response.body.data.resources.selfHelp;
      expect(selfHelp.title).toBe('Self-Help Resources');
      expect(selfHelp.resources).toBeDefined();
      expect(selfHelp.resources.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/chat/faq', () => {
    it('should return frequently asked questions', async () => {
      const response = await request(app)
        .get('/api/chat/faq')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.faqs).toBeDefined();
      expect(Array.isArray(response.body.data.faqs)).toBe(true);
      expect(response.body.data.faqs.length).toBeGreaterThan(0);
      expect(response.body.data.note).toBeDefined();
    });

    it('should include depression-related questions', async () => {
      const response = await request(app)
        .get('/api/chat/faq')
        .expect(200);

      const faqs = response.body.data.faqs;
      const depressionQuestion = faqs.find(faq => faq.question === 'What is depression?');
      expect(depressionQuestion).toBeDefined();
      expect(depressionQuestion.answer).toBeDefined();
    });

    it('should include treatment-related questions', async () => {
      const response = await request(app)
        .get('/api/chat/faq')
        .expect(200);

      const faqs = response.body.data.faqs;
      const treatmentQuestion = faqs.find(faq => faq.question === 'How is depression treated?');
      expect(treatmentQuestion).toBeDefined();
      expect(treatmentQuestion.answer).toBeDefined();
    });

    it('should include professional help questions', async () => {
      const response = await request(app)
        .get('/api/chat/faq')
        .expect(200);

      const faqs = response.body.data.faqs;
      const helpQuestion = faqs.find(faq => faq.question === 'When should I seek professional help?');
      expect(helpQuestion).toBeDefined();
      expect(helpQuestion.answer).toBeDefined();
    });
  });

  describe('POST /api/chat/feedback', () => {
    it('should submit feedback successfully', async () => {
      const feedbackData = {
        rating: 4,
        feedback: 'The chat was very helpful',
        message: 'I got good advice'
      };

      const response = await request(app)
        .post('/api/chat/feedback')
        .send(feedbackData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Thank you for your feedback!');
    });

    it('should submit feedback with authentication', async () => {
      const feedbackData = {
        rating: 5,
        feedback: 'Excellent service',
        message: 'Very helpful responses'
      };

      const response = await request(app)
        .post('/api/chat/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(feedbackData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Thank you for your feedback!');
    });

    it('should validate rating range', async () => {
      const invalidFeedback = {
        rating: 6, // Invalid rating
        feedback: 'Test feedback'
      };

      const response = await request(app)
        .post('/api/chat/feedback')
        .send(invalidFeedback)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Rating must be between 1 and 5');
    });

    it('should validate minimum rating', async () => {
      const invalidFeedback = {
        rating: 0, // Invalid rating
        feedback: 'Test feedback'
      };

      const response = await request(app)
        .post('/api/chat/feedback')
        .send(invalidFeedback)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Rating must be between 1 and 5');
    });

    it('should handle missing rating', async () => {
      const invalidFeedback = {
        feedback: 'Test feedback'
      };

      const response = await request(app)
        .post('/api/chat/feedback')
        .send(invalidFeedback)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Rating must be between 1 and 5');
    });

    it('should handle server errors gracefully', async () => {
      // Mock console.log to throw an error
      const originalConsoleLog = console.log;
      console.log = jest.fn(() => {
        throw new Error('Database error');
      });

      const feedbackData = {
        rating: 3,
        feedback: 'Test feedback'
      };

      const response = await request(app)
        .post('/api/chat/feedback')
        .send(feedbackData)
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Failed to submit feedback');

      // Restore console.log
      console.log = originalConsoleLog;
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .put('/api/chat/message')
        .expect(404);
    });
  });
});
