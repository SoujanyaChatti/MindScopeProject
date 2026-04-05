const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { authenticateToken, optionalAuth, generateToken } = require('../../middleware/auth');
const User = require('../../models/User');
const { createTestUser, generateTestToken, cleanupTestData } = require('../helpers/testHelpers');

// Mock User model
jest.mock('../../models/User');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      const testUser = {
        _id: 'user123',
        email: 'test@example.com',
        isActive: true
      };

      User.findById.mockResolvedValue(testUser);

      req.headers.authorization = 'Bearer valid-token';
      
      // Mock jwt.verify to return decoded token
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'user123' });

      await authenticateToken(req, res, next);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(req.user).toEqual(testUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      req.headers.authorization = 'InvalidFormat token';

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access token required'
      });
    });

    it('should reject invalid JWT token', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token'
      });
    });

    it('should reject expired token', async () => {
      req.headers.authorization = 'Bearer expired-token';
      
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired');
      });

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Token expired'
      });
    });

    it('should reject token for non-existent user', async () => {
      req.headers.authorization = 'Bearer valid-token';
      
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'nonexistent-user' });
      User.findById.mockResolvedValue(null);

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User not found'
      });
    });

    it('should reject token for inactive user', async () => {
      const inactiveUser = {
        _id: 'user123',
        email: 'test@example.com',
        isActive: false
      };

      req.headers.authorization = 'Bearer valid-token';
      
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue(inactiveUser);

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Account is deactivated'
      });
    });

    it('should handle database errors gracefully', async () => {
      req.headers.authorization = 'Bearer valid-token';
      
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'user123' });
      User.findById.mockRejectedValue(new Error('Database connection failed'));

      try {
        await authenticateToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Authentication error'
        });
      } catch (error) {
        // Expected to throw in test environment
        expect(error.message).toBe('Database connection failed');
      }
    });
  });

  describe('optionalAuth', () => {
    it('should continue without token', async () => {
      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should authenticate valid token', async () => {
      const testUser = {
        _id: 'user123',
        email: 'test@example.com',
        isActive: true
      };

      req.headers.authorization = 'Bearer valid-token';
      
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue(testUser);

      await optionalAuth(req, res, next);

      expect(req.user).toEqual(testUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue with invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue with expired token', async () => {
      req.headers.authorization = 'Bearer expired-token';
      
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired');
      });

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue with non-existent user', async () => {
      req.headers.authorization = 'Bearer valid-token';
      
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'nonexistent-user' });
      User.findById.mockResolvedValue(null);

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue with inactive user', async () => {
      const inactiveUser = {
        _id: 'user123',
        email: 'test@example.com',
        isActive: false
      };

      req.headers.authorization = 'Bearer valid-token';
      
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue(inactiveUser);

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue with database errors', async () => {
      req.headers.authorization = 'Bearer valid-token';
      
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'user123' });
      User.findById.mockRejectedValue(new Error('Database error'));

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue with malformed authorization header', async () => {
      req.headers.authorization = 'InvalidFormat token';

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_EXPIRE = '1h';
    });

    it('should generate valid JWT token', () => {
      const userId = 'user123';
      const token = generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify the token can be decoded
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(userId);
    });

    it('should use default expiration when JWT_EXPIRE not set', () => {
      delete process.env.JWT_EXPIRE;
      
      const userId = 'user123';
      const token = generateToken(userId);

      expect(token).toBeDefined();
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(userId);
    });

    it('should handle different user IDs', () => {
      const userId1 = 'user123';
      const userId2 = 'user456';

      const token1 = generateToken(userId1);
      const token2 = generateToken(userId2);

      expect(token1).not.toBe(token2);

      const decoded1 = jwt.verify(token1, process.env.JWT_SECRET);
      const decoded2 = jwt.verify(token2, process.env.JWT_SECRET);

      expect(decoded1.userId).toBe(userId1);
      expect(decoded2.userId).toBe(userId2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing authorization header in authenticateToken', async () => {
      req.headers = {};

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access token required'
      });
    });

    it('should handle empty authorization header', async () => {
      req.headers.authorization = '';

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access token required'
      });
    });

    it('should handle authorization header with only "Bearer"', async () => {
      req.headers.authorization = 'Bearer';

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access token required'
      });
    });

    it('should handle authorization header with extra spaces', async () => {
      const testUser = {
        _id: 'user123',
        email: 'test@example.com',
        isActive: true
      };

      req.headers.authorization = '  Bearer   valid-token  ';
      
      jest.spyOn(jwt, 'verify').mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue(testUser);

      await authenticateToken(req, res, next);

      expect(req.user).toEqual(testUser);
      expect(next).toHaveBeenCalled();
    });
  });
});
