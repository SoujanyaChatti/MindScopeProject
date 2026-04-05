const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Assessment = require('../../models/Assessment');
const DatabaseConnection = require('../../utils/database');

/**
 * Generate a test JWT token for a user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateTestToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

/**
 * Create a test user
 * @param {Object} userData - User data
 * @returns {Object} Created user
 */
const createTestUser = async (userData = {}) => {
  return await User.createTestUser(userData);
};

/**
 * Clean up test data
 * @param {Array} collections - Array of collection names to clear
 */
const cleanupTestData = async (collections = ['users', 'assessments']) => {
  // Use the new database utility for cleanup
  await DatabaseConnection.cleanup();
  
  // Also clean up specific models if needed
  await User.cleanupTestData();
  await Assessment.cleanupTestData();
};

/**
 * Mock Gemini API response
 * @param {string} response - Mock response text
 * @returns {Object} Mock response object
 */
const mockGeminiResponse = (response = 'Test AI response') => ({
  data: {
    candidates: [{
      content: {
        parts: [{
          text: response
        }]
      }
    }]
  }
});

/**
 * Mock Gemini API error
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @returns {Object} Mock error object
 */
const mockGeminiError = (status = 500, message = 'API Error') => ({
  response: {
    status,
    data: {
      error: {
        code: status,
        message
      }
    }
  }
});

/**
 * Create test request object
 * @param {Object} options - Request options
 * @returns {Object} Mock request object
 */
const createMockRequest = (options = {}) => ({
  body: {},
  headers: {},
  user: null,
  ...options
});

/**
 * Create test response object
 * @returns {Object} Mock response object
 */
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create test next function
 * @returns {Function} Mock next function
 */
const createMockNext = () => jest.fn();

module.exports = {
  generateTestToken,
  createTestUser,
  cleanupTestData,
  mockGeminiResponse,
  mockGeminiError,
  createMockRequest,
  createMockResponse,
  createMockNext
};
