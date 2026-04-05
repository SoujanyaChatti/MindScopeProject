// Test setup file
require('dotenv').config({ path: '.env.test' });

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRE = '1h';
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.GEMINI_API_URL = 'https://test-gemini-api.com';
process.env.MONGODB_URI = 'mongodb://localhost:27017/mindscope-test';

// Global test timeout
jest.setTimeout(10000);

// Global test cleanup
afterAll(async () => {
  const DatabaseConnection = require('../utils/database');
  await DatabaseConnection.cleanup();
  await DatabaseConnection.disconnect();
});
