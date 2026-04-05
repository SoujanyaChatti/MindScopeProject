const mongoose = require('mongoose');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  beforeEach(async () => {
    // Clear all users before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('User Creation', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        isActive: true
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male'
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe(userData.password);
      expect(user.password.length).toBeGreaterThan(20); // bcrypt hash length
    });

    it('should validate required fields', async () => {
      const user = new User({});

      await expect(user.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should validate gender enum', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'invalid-gender'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData = {
        email: 'unique-test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male'
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      try {
        await user2.save();
        fail('Expected duplicate email error');
      } catch (error) {
        expect(error.code).toBe(11000); // MongoDB duplicate key error
      }
    });
  });

  describe('User Methods', () => {
    it('should compare password correctly', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male'
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('Password123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('WrongPassword');
      expect(isNotMatch).toBe(false);
    });

    it('should have required fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male'
      };

      const user = new User(userData);
      await user.save();

      expect(user.email).toBeDefined();
      expect(user.firstName).toBeDefined();
      expect(user.lastName).toBeDefined();
    });
  });

  describe('User Queries', () => {
    beforeEach(async () => {
      // Clear existing users first
      await User.deleteMany({});
      
      const users = [
        {
          email: 'user1@example.com',
          password: 'Password123',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          isActive: true
        },
        {
          email: 'user2@example.com',
          password: 'Password123',
          firstName: 'Jane',
          lastName: 'Smith',
          dateOfBirth: new Date('1995-01-01'),
          gender: 'female',
          isActive: false
        }
      ];

      for (const userData of users) {
        const user = new User(userData);
        await user.save();
      }
    });

    it('should find active users', async () => {
      const activeUsers = await User.find({ isActive: true });
      expect(activeUsers.length).toBe(1);
      expect(activeUsers[0].email).toBe('user1@example.com');
    });

    it('should find users by email', async () => {
      const user = await User.findOne({ email: 'user1@example.com' });
      expect(user).toBeDefined();
      expect(user.firstName).toBe('John');
    });

    it('should exclude password from select', async () => {
      const user = await User.findOne({ email: 'user1@example.com' }).select('-password');
      expect(user.password).toBeUndefined();
    });
  });

  describe('User Updates', () => {
    let user;

    beforeEach(async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male'
      };

      user = new User(userData);
      await user.save();
    });

    it('should update user profile', async () => {
      const updates = {
        firstName: 'Johnny',
        lastName: 'Smith',
        phoneNumber: '+1234567890'
      };

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        updates,
        { new: true }
      );

      expect(updatedUser.firstName).toBe('Johnny');
      expect(updatedUser.lastName).toBe('Smith');
      expect(updatedUser.phoneNumber).toBe('+1234567890');
    });

    it('should deactivate user', async () => {
      await User.findByIdAndUpdate(user._id, { isActive: false });
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isActive).toBe(false);
    });
  });

  describe('User Statistics', () => {
    beforeEach(async () => {
      // Clear existing users first
      await User.deleteMany({});
      
      const users = [
        {
          email: 'user1@example.com',
          password: 'Password123',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          isActive: true,
          createdAt: new Date('2023-01-01')
        },
        {
          email: 'user2@example.com',
          password: 'Password123',
          firstName: 'Jane',
          lastName: 'Smith',
          dateOfBirth: new Date('1995-01-01'),
          gender: 'female',
          isActive: true,
          createdAt: new Date('2023-02-01')
        }
      ];

      for (const userData of users) {
        const user = new User(userData);
        await user.save();
      }
    });

    it('should count total users', async () => {
      const totalUsers = await User.countDocuments();
      expect(totalUsers).toBe(2);
    });

    it('should count active users', async () => {
      const activeUsers = await User.countDocuments({ isActive: true });
      expect(activeUsers).toBe(2);
    });

    it('should find users by date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      
      const usersInRange = await User.find({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });

      expect(usersInRange.length).toBe(1);
    });
  });
});
