const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          dateOfBirth: user.dateOfBirth,
          age: user.age,
          gender: user.gender,
          phoneNumber: user.phoneNumber,
          emergencyContact: user.emergencyContact,
          profileCompleted: user.profileCompleted,
          totalAssessments: user.totalAssessments,
          lastAssessmentDate: user.lastAssessmentDate,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get profile data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'firstName', 'lastName', 'phoneNumber', 'emergencyContact'
    ];
    
    // Filter only allowed updates
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Check if emergency contact is being updated
    if (updates.emergencyContact) {
      const user = await User.findById(req.user._id);
      const currentEmergencyContact = user.emergencyContact || {};
      
      filteredUpdates.emergencyContact = {
        ...currentEmergencyContact,
        ...updates.emergencyContact
      };
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      filteredUpdates,
      { new: true, runValidators: true }
    );

    // Mark profile as completed if all required fields are present
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'gender'];
    const hasAllRequiredFields = requiredFields.every(field => user[field]);
    
    if (hasAllRequiredFields && !user.profileCompleted) {
      user.profileCompleted = true;
      await user.save();
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          dateOfBirth: user.dateOfBirth,
          age: user.age,
          gender: user.gender,
          phoneNumber: user.phoneNumber,
          emergencyContact: user.emergencyContact,
          profileCompleted: user.profileCompleted,
          totalAssessments: user.totalAssessments,
          lastAssessmentDate: user.lastAssessmentDate,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/user/password
// @desc    Change user password
// @access  Private
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/user/account
// @desc    Deactivate user account
// @access  Private
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required to deactivate account'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is incorrect'
      });
    }

    // Deactivate account instead of deleting
    user.isActive = false;
    await user.save();

    res.json({
      status: 'success',
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to deactivate account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/user/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const Assessment = require('../models/Assessment');
    
    const stats = await Assessment.aggregate([
      { $match: { userId: req.user._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalAssessments: { $sum: 1 },
          averageScore: { $avg: '$phq9Scores.totalScore' },
          latestScore: { $max: '$phq9Scores.totalScore' },
          firstAssessment: { $min: '$createdAt' },
          lastAssessment: { $max: '$createdAt' }
        }
      }
    ]);

    const userStats = stats[0] || {
      totalAssessments: 0,
      averageScore: 0,
      latestScore: 0,
      firstAssessment: null,
      lastAssessment: null
    };

    res.json({
      status: 'success',
      data: {
        stats: {
          totalAssessments: userStats.totalAssessments,
          averageScore: Math.round(userStats.averageScore * 10) / 10,
          latestScore: userStats.latestScore,
          firstAssessment: userStats.firstAssessment,
          lastAssessment: userStats.lastAssessment
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
