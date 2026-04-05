const { validationResult } = require('express-validator');
const {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validateAssessmentResponse,
  validateChatMessage,
  handleValidationErrors
} = require('../../middleware/validation');

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
  body: jest.fn(() => ({
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isISO8601: jest.fn().mockReturnThis()
  }))
}));

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('handleValidationErrors', () => {
    it('should call next when no validation errors', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 with errors when validation fails', () => {
      const mockErrors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too short' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: mockErrors
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateUserRegistration', () => {
    it('should be an array of validation middleware functions', () => {
      expect(Array.isArray(validateUserRegistration)).toBe(true);
      expect(validateUserRegistration.length).toBeGreaterThan(0);
    });
  });

  describe('validateUserLogin', () => {
    it('should be an array of validation middleware functions', () => {
      expect(Array.isArray(validateUserLogin)).toBe(true);
      expect(validateUserLogin.length).toBeGreaterThan(0);
    });
  });

  describe('validateProfileUpdate', () => {
    it('should be an array of validation middleware functions', () => {
      expect(Array.isArray(validateProfileUpdate)).toBe(true);
      expect(validateProfileUpdate.length).toBeGreaterThan(0);
    });
  });

  describe('validateAssessmentResponse', () => {
    it('should be an array of validation middleware functions', () => {
      expect(Array.isArray(validateAssessmentResponse)).toBe(true);
      expect(validateAssessmentResponse.length).toBeGreaterThan(0);
    });
  });

  describe('validateChatMessage', () => {
    it('should be an array of validation middleware functions', () => {
      expect(Array.isArray(validateChatMessage)).toBe(true);
      expect(validateChatMessage.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing body', () => {
      req.body = undefined;
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ field: 'body', message: 'Body is required' }]
      });

      handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle null values', () => {
      req.body = { message: null };
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ field: 'message', message: 'Message cannot be null' }]
      });

      handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle whitespace-only messages', () => {
      req.body = { message: '   ' };
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ field: 'message', message: 'Message cannot be empty' }]
      });

      handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});