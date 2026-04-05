const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateChatMessage } = require('../middleware/validation');
const geminiService = require('../services/geminiService');

const router = express.Router();

// @route   POST /api/chat/message
// @desc    Send a message to the AI chat assistant
// @access  Public (optional auth for personalized responses)
router.post('/message', optionalAuth, validateChatMessage, async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user; // May be null if not authenticated

    // Generate AI response
    const aiResponse = await geminiService.answerMentalHealthQuestion(message);

    // Log the interaction (optional - for analytics)
    if (user) {
      // Could store chat history in database if needed
      console.log(`Chat interaction - User: ${user._id}, Message: ${message.substring(0, 100)}...`);
    }

    res.json({
      status: 'success',
      data: {
        message: aiResponse,
        timestamp: new Date().toISOString(),
        isAuthenticated: !!user
      }
    });
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/chat/resources
// @desc    Get mental health resources and crisis information
// @access  Public
router.get('/resources', (req, res) => {
  const resources = {
    crisis: {
      title: 'Crisis Support',
      description: 'If you\'re having thoughts of self-harm or suicide, please reach out immediately.',
      contacts: [
        {
          name: 'National Suicide Prevention Lifeline',
          phone: '988',
          website: 'https://suicidepreventionlifeline.org',
          available: '24/7'
        },
        {
          name: 'Crisis Text Line',
          text: 'Text HOME to 741741',
          website: 'https://www.crisistextline.org',
          available: '24/7'
        },
        {
          name: 'Emergency Services',
          phone: '911',
          description: 'For immediate emergencies'
        }
      ]
    },
    general: {
      title: 'General Mental Health Resources',
      description: 'Additional resources for mental health support and information.',
      resources: [
        {
          name: 'Mental Health America',
          website: 'https://mhanational.org',
          description: 'Comprehensive mental health resources and screening tools'
        },
        {
          name: 'National Alliance on Mental Illness (NAMI)',
          website: 'https://www.nami.org',
          description: 'Support groups and educational resources'
        },
        {
          name: 'SAMHSA National Helpline',
          phone: '1-800-662-4357',
          website: 'https://www.samhsa.gov/find-help/national-helpline',
          description: 'Substance abuse and mental health treatment referral service'
        },
        {
          name: 'BetterHelp',
          website: 'https://www.betterhelp.com',
          description: 'Online therapy platform'
        },
        {
          name: 'Talkspace',
          website: 'https://www.talkspace.com',
          description: 'Online therapy and psychiatry services'
        }
      ]
    },
    selfHelp: {
      title: 'Self-Help Resources',
      description: 'Tools and techniques you can use to support your mental health.',
      resources: [
        {
          name: 'Mindfulness and Meditation',
          apps: ['Headspace', 'Calm', 'Insight Timer'],
          description: 'Apps for guided meditation and mindfulness practices'
        },
        {
          name: 'Mood Tracking',
          apps: ['Moodpath', 'Daylio', 'eMoods'],
          description: 'Apps to track your mood and identify patterns'
        },
        {
          name: 'Sleep Improvement',
          apps: ['Sleep Cycle', 'Headspace for Sleep'],
          description: 'Apps to improve sleep quality and establish routines'
        },
        {
          name: 'Physical Activity',
          apps: ['Nike Training Club', 'MyFitnessPal', 'Strava'],
          description: 'Apps to encourage regular physical activity'
        }
      ]
    }
  };

  res.json({
    status: 'success',
    data: {
      resources: resources,
      disclaimer: 'This information is for educational purposes only and should not replace professional medical advice, diagnosis, or treatment.'
    }
  });
});

// @route   GET /api/chat/faq
// @desc    Get frequently asked questions about depression and mental health
// @access  Public
router.get('/faq', (req, res) => {
  const faqs = [
    {
      question: 'What is depression?',
      answer: 'Depression is a common and serious medical illness that negatively affects how you feel, the way you think, and how you act. It can cause feelings of sadness and/or a loss of interest in activities you once enjoyed.'
    },
    {
      question: 'What are common symptoms of depression?',
      answer: 'Common symptoms include persistent sadness, loss of interest in activities, changes in sleep or appetite, fatigue, difficulty concentrating, feelings of worthlessness, and thoughts of death or suicide.'
    },
    {
      question: 'How is depression treated?',
      answer: 'Depression is treatable with psychotherapy (talk therapy), medication, or a combination of both. Lifestyle changes like regular exercise, good sleep hygiene, and social support can also help.'
    },
    {
      question: 'When should I seek professional help?',
      answer: 'Seek professional help if your symptoms persist for more than two weeks, interfere with your daily life, or if you have thoughts of self-harm. Early intervention leads to better outcomes.'
    },
    {
      question: 'Can exercise help with depression?',
      answer: 'Yes, regular physical activity can help reduce symptoms of depression by releasing endorphins, improving sleep, and boosting self-esteem. Even light activities like walking can be beneficial.'
    },
    {
      question: 'What lifestyle changes can help with depression?',
      answer: 'Maintaining a regular sleep schedule, eating a balanced diet, staying socially connected, practicing mindfulness or meditation, and avoiding alcohol and drugs can all support mental health.'
    },
    {
      question: 'Is depression the same as feeling sad?',
      answer: 'No, depression is different from normal sadness. Depression is persistent, affects multiple areas of life, and includes other symptoms like changes in sleep, appetite, and energy levels.'
    },
    {
      question: 'Can depression be prevented?',
      answer: 'While depression cannot always be prevented, maintaining good mental health habits like regular exercise, social connections, stress management, and seeking help early can reduce risk.'
    }
  ];

  res.json({
    status: 'success',
    data: {
      faqs: faqs,
      note: 'These are general answers. Always consult with a healthcare professional for personalized advice.'
    }
  });
});

// @route   POST /api/chat/feedback
// @desc    Submit feedback about the chat experience
// @access  Public
router.post('/feedback', optionalAuth, async (req, res) => {
  try {
    const { rating, feedback, message } = req.body;
    const user = req.user;

    // Basic validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 1 and 5'
      });
    }

    // Log feedback (in a real application, you'd store this in a database)
    console.log(`Chat Feedback - Rating: ${rating}, User: ${user?._id || 'anonymous'}, Feedback: ${feedback}, Message: ${message?.substring(0, 100)}`);

    res.json({
      status: 'success',
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('Chat feedback error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
