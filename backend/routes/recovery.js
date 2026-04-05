/**
 * Recovery API Routes
 *
 * Exposes the recovery agent system through REST endpoints.
 * Handles agent activation, check-ins, interventions, and progress tracking.
 *
 * Enhanced with:
 * - Speech Emotion Recognition (SER) integration
 * - Supervisor Agent coordination
 * - Crisis detection and escalation
 * - Cross-agent interventions
 */

const express = require('express');
const multer = require('multer');
const Recovery = require('../models/Recovery');
const Assessment = require('../models/Assessment');
const { authenticateToken } = require('../middleware/auth');
const { RecoveryOrchestrator } = require('../services/recoveryAgents');
const SupervisorAgent = require('../services/recoveryAgents/supervisorAgent');
const speechEmotionService = require('../services/speechEmotionService');

const router = express.Router();
const orchestrator = new RecoveryOrchestrator();
const supervisor = new SupervisorAgent(orchestrator);

// Multer setup for audio file uploads (SER)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// ============================================
// RECOVERY PLAN MANAGEMENT
// ============================================

/**
 * GET /api/recovery/status
 * Get current recovery status for user
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.json({
        status: 'success',
        hasActiveRecovery: false,
        message: 'No active recovery plan. Complete an assessment to start.'
      });
    }

    res.json({
      status: 'success',
      hasActiveRecovery: true,
      recovery: {
        id: recovery._id,
        status: recovery.status,
        planStartDate: recovery.planStartDate,
        plannedDurationDays: recovery.plannedDurationDays,
        activeAgents: recovery.activeAgents.map(a => ({
          name: a.agentName,
          isActive: a.isActive,
          priority: a.priority,
          checkInStreak: a.checkInStreak,
          totalCheckIns: a.totalCheckIns,
          lastCheckIn: a.lastCheckIn
        })),
        initialSeverity: recovery.initialSeverity,
        totalCheckIns: recovery.checkIns.length,
        daysActive: Math.floor((Date.now() - recovery.planStartDate) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    console.error('Recovery status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get recovery status'
    });
  }
});

/**
 * POST /api/recovery/activate
 * Activate recovery agents based on an assessment
 */
router.post('/activate', authenticateToken, async (req, res) => {
  try {
    const { assessmentId, forceReactivate } = req.body;

    // Check for existing active recovery
    let recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (recovery && !forceReactivate) {
      return res.status(400).json({
        status: 'error',
        message: 'Active recovery plan exists. Use forceReactivate to start new.',
        existingRecoveryId: recovery._id
      });
    }

    // If force reactivating, mark old one as abandoned
    if (recovery && forceReactivate) {
      recovery.status = 'abandoned';
      await recovery.save();
    }

    // Get the assessment
    const assessment = await Assessment.findOne({
      _id: assessmentId,
      userId: req.user._id,
      status: 'completed'
    });

    if (!assessment) {
      return res.status(404).json({
        status: 'error',
        message: 'Completed assessment not found'
      });
    }

    // Activate agents through orchestrator
    const activation = await orchestrator.activateAgents({
      ...assessment.toObject(),
      userId: req.user._id
    });

    // Create recovery record
    recovery = new Recovery({
      userId: req.user._id,
      assessmentId: assessment._id,
      initialSeverity: {
        level: assessment.snamScores?.severityLevel,
        totalScore: assessment.snamScores?.totalScore,
        criteriaScores: assessment.snamScores?.criteriaScores
      },
      activeAgents: activation.activatedAgents.map(agentName => ({
        agentName,
        isActive: true,
        activatedAt: new Date(),
        priority: getPriorityForAgent(agentName, assessment.snamScores?.criteriaScores)
      }))
    });

    await recovery.save();

    res.json({
      status: 'success',
      message: activation.message,
      recoveryId: recovery._id,
      activeAgents: activation.activatedAgents,
      initialTasks: activation.initialTasks
    });
  } catch (error) {
    console.error('Recovery activation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to activate recovery agents'
    });
  }
});

/**
 * POST /api/recovery/pause
 * Pause the recovery plan
 */
router.post('/pause', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOneAndUpdate(
      { userId: req.user._id, status: 'active' },
      { status: 'paused', updatedAt: new Date() },
      { new: true }
    );

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery plan found'
      });
    }

    res.json({
      status: 'success',
      message: 'Recovery plan paused. You can resume anytime.',
      recoveryId: recovery._id
    });
  } catch (error) {
    console.error('Pause recovery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to pause recovery plan'
    });
  }
});

/**
 * POST /api/recovery/resume
 * Resume a paused recovery plan
 */
router.post('/resume', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOneAndUpdate(
      { userId: req.user._id, status: 'paused' },
      { status: 'active', updatedAt: new Date() },
      { new: true }
    );

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No paused recovery plan found'
      });
    }

    res.json({
      status: 'success',
      message: 'Welcome back! Your recovery plan is active again.',
      recoveryId: recovery._id,
      activeAgents: recovery.activeAgents.filter(a => a.isActive).map(a => a.agentName)
    });
  } catch (error) {
    console.error('Resume recovery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to resume recovery plan'
    });
  }
});

// ============================================
// CHECK-INS
// ============================================

/**
 * GET /api/recovery/check-in
 * Get daily check-in questions from active agents
 */
router.get('/check-in', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery plan'
      });
    }

    const activeAgents = recovery.activeAgents
      .filter(a => a.isActive)
      .map(a => a.agentName);

    const checkIns = await orchestrator.getDailyCheckIns(req.user._id, activeAgents);

    res.json({
      status: 'success',
      recoveryId: recovery._id,
      checkIns,
      activeAgentCount: activeAgents.length
    });
  } catch (error) {
    console.error('Get check-in error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get check-in questions'
    });
  }
});

/**
 * POST /api/recovery/check-in
 * Submit a check-in response (text only)
 */
router.post('/check-in', authenticateToken, async (req, res) => {
  try {
    const { agentName, response, quickResponse, score } = req.body;

    if (!agentName || (!response && !quickResponse)) {
      return res.status(400).json({
        status: 'error',
        message: 'Agent name and response are required'
      });
    }

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery plan'
      });
    }

    // Process response through agent
    const agentResponse = await orchestrator.processAgentResponse(
      agentName,
      req.user._id,
      response || quickResponse
    );

    // Save check-in to recovery record
    const checkInData = {
      agentName,
      response: response || quickResponse,
      quickResponse: quickResponse || null,
      sentiment: agentResponse.sentiment,
      score: score || null,
      agentRecommendation: agentResponse.recommendation
    };

    await recovery.addCheckIn(checkInData);

    // Run supervisor check after significant check-ins
    let supervisorInsights = null;
    if (agentResponse.shouldEscalate || agentResponse.sentiment === 'negative') {
      try {
        supervisorInsights = await supervisor.supervise(req.user._id, recovery);
      } catch (supError) {
        console.error('Supervisor check failed:', supError);
      }
    }

    res.json({
      status: 'success',
      agentName,
      followUp: agentResponse.followUp,
      recommendation: agentResponse.recommendation,
      sentiment: agentResponse.sentiment,
      shouldEscalate: agentResponse.shouldEscalate,
      encouragement: agentResponse.shouldEscalate
        ? 'It sounds like you might be going through a tough time. Consider reaching out to someone you trust.'
        : null,
      supervisorInsights: supervisorInsights ? {
        crossAgentInsights: supervisorInsights.analysis?.crossAgentInsights,
        actions: supervisorInsights.actions?.filter(a => a.result?.success)
      } : null
    });
  } catch (error) {
    console.error('Submit check-in error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit check-in'
    });
  }
});

/**
 * POST /api/recovery/check-in/voice
 * Submit a voice check-in with SER analysis
 */
router.post('/check-in/voice', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { agentName, transcription } = req.body;
    const audioFile = req.file;

    if (!agentName) {
      return res.status(400).json({
        status: 'error',
        message: 'Agent name is required'
      });
    }

    if (!audioFile && !transcription) {
      return res.status(400).json({
        status: 'error',
        message: 'Audio file or transcription is required'
      });
    }

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery plan'
      });
    }

    // Analyze voice emotion if audio provided
    let emotionAnalysis = null;
    if (audioFile) {
      emotionAnalysis = await speechEmotionService.analyzeAudio(audioFile.buffer);
    }

    // Process transcription through agent
    const textResponse = transcription || '[Voice response - transcription pending]';
    const agentResponse = await orchestrator.processAgentResponse(
      agentName,
      req.user._id,
      textResponse
    );

    // Adjust sentiment based on voice emotion
    let adjustedSentiment = agentResponse.sentiment;
    let emotionInsights = null;

    if (emotionAnalysis?.success) {
      emotionInsights = {
        dominantEmotion: emotionAnalysis.dominantEmotion,
        depressionRelevance: emotionAnalysis.depressionRelevance,
        prosodyIndicators: emotionAnalysis.prosodyIndicators
      };

      // If voice indicates more distress than text
      if (emotionAnalysis.shouldAdjustTextScore) {
        if (emotionAnalysis.dominantEmotion === 'sad' && adjustedSentiment !== 'negative') {
          adjustedSentiment = 'negative';
        }
        // Increase escalation likelihood
        if (emotionAnalysis.depressionRelevance.level === 'high') {
          agentResponse.shouldEscalate = true;
        }
      }

      // Add specific insights based on prosody
      if (emotionAnalysis.prosodyIndicators?.flatAffect) {
        emotionInsights.warning = 'Flat affect detected in voice - may indicate emotional numbness';
      }
      if (emotionAnalysis.prosodyIndicators?.slowSpeech) {
        emotionInsights.observation = 'Speech rate slower than typical - may indicate fatigue or low energy';
      }
    }

    // Save enhanced check-in
    const checkInData = {
      agentName,
      response: textResponse,
      sentiment: adjustedSentiment,
      score: req.body.score || null,
      agentRecommendation: agentResponse.recommendation,
      voiceAnalysis: emotionAnalysis?.success ? {
        dominantEmotion: emotionAnalysis.dominantEmotion,
        emotions: emotionAnalysis.emotions,
        depressionScore: emotionAnalysis.depressionRelevance?.score,
        prosody: emotionAnalysis.prosody,
        confidence: emotionAnalysis.confidence
      } : null
    };

    await recovery.addCheckIn(checkInData);

    // Run supervisor for voice check-ins (richer data)
    let supervisorInsights = null;
    try {
      supervisorInsights = await supervisor.supervise(req.user._id, recovery);
    } catch (supError) {
      console.error('Supervisor check failed:', supError);
    }

    res.json({
      status: 'success',
      agentName,
      followUp: agentResponse.followUp,
      recommendation: agentResponse.recommendation,
      sentiment: adjustedSentiment,
      originalSentiment: agentResponse.sentiment,
      shouldEscalate: agentResponse.shouldEscalate,
      emotionAnalysis: emotionInsights,
      encouragement: agentResponse.shouldEscalate
        ? 'I can hear that things might be difficult right now. Please know that support is available.'
        : null,
      supervisorInsights: supervisorInsights ? {
        crossAgentInsights: supervisorInsights.analysis?.crossAgentInsights,
        overallHealth: supervisorInsights.analysis?.overallHealth,
        actions: supervisorInsights.actions?.filter(a => a.result?.success)
      } : null
    });
  } catch (error) {
    console.error('Voice check-in error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process voice check-in'
    });
  }
});

// ============================================
// AGENT-SPECIFIC ENDPOINTS
// ============================================

/**
 * GET /api/recovery/agents/:agentName/intervention
 * Get current intervention from specific agent
 */
router.get('/agents/:agentName/intervention', authenticateToken, async (req, res) => {
  try {
    const { agentName } = req.params;
    const { severity } = req.query;

    const agent = orchestrator.agents[agentName];
    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent not found'
      });
    }

    // Get intervention based on severity
    const severityScore = severity ? parseInt(severity) : 2;
    const intervention = agent.selectIntervention(severityScore);

    res.json({
      status: 'success',
      agent: agentName,
      intervention
    });
  } catch (error) {
    console.error('Get intervention error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get intervention'
    });
  }
});

/**
 * GET /api/recovery/agents/:agentName/exercises
 * Get available exercises from an agent
 */
router.get('/agents/:agentName/exercises', authenticateToken, async (req, res) => {
  try {
    const { agentName } = req.params;
    const { type } = req.query;

    const agent = orchestrator.agents[agentName];
    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent not found'
      });
    }

    let exercises = {};

    // Agent-specific exercises
    switch (agentName) {
      case 'sleep':
        exercises = {
          relaxation: agent.relaxationExercises || {},
          interventions: agent.interventions
        };
        break;
      case 'activity':
        exercises = {
          activities: type ? agent.activityBank?.[type] : agent.activityBank,
          challenges: agent.microChallenges || []
        };
        break;
      case 'mood':
        exercises = {
          selfCompassion: agent.selfCompassionExercises || [],
          affirmations: type ? agent.affirmations?.[type] : agent.affirmations
        };
        break;
      case 'worry':
        exercises = {
          grounding: agent.groundingExercises || {},
          breathing: agent.breathingExercises || {},
          acceptanceStatements: agent.acceptanceStatements || []
        };
        break;
      default:
        exercises = { interventions: agent.interventions };
    }

    res.json({
      status: 'success',
      agent: agentName,
      exercises
    });
  } catch (error) {
    console.error('Get exercises error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get exercises'
    });
  }
});

// ============================================
// SLEEP AGENT SPECIFIC
// ============================================

/**
 * POST /api/recovery/agents/sleep/diary
 * Log sleep diary entry
 */
router.post('/agents/sleep/diary', authenticateToken, async (req, res) => {
  try {
    const { bedTime, wakeTime, sleepQuality, nightWakings, notes } = req.body;

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({ status: 'error', message: 'No active recovery' });
    }

    const agent = orchestrator.agents.sleep;
    const analysis = await agent.analyzeSleepPattern({
      bedTime,
      wakeTime,
      quality: sleepQuality,
      nightWakings
    });

    // Store in check-ins with sleep data
    await recovery.addCheckIn({
      agentName: 'sleep',
      response: `Sleep: ${bedTime} - ${wakeTime}, Quality: ${sleepQuality}/5`,
      score: sleepQuality,
      customData: { bedTime, wakeTime, nightWakings, notes }
    });

    res.json({
      status: 'success',
      analysis,
      recommendations: agent.selectIntervention(5 - sleepQuality)
    });
  } catch (error) {
    console.error('Sleep diary error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to log sleep' });
  }
});

/**
 * GET /api/recovery/agents/sleep/relaxation/:type
 * Get a specific relaxation exercise
 */
router.get('/agents/sleep/relaxation/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const agent = orchestrator.agents.sleep;

    const exercise = agent.relaxationExercises?.[type];
    if (!exercise) {
      return res.status(404).json({
        status: 'error',
        message: 'Exercise not found',
        available: Object.keys(agent.relaxationExercises || {})
      });
    }

    res.json({
      status: 'success',
      exercise
    });
  } catch (error) {
    console.error('Get relaxation error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get exercise' });
  }
});

// ============================================
// ACTIVITY AGENT SPECIFIC
// ============================================

/**
 * GET /api/recovery/agents/activity/suggestion
 * Get activity suggestion based on energy level
 */
router.get('/agents/activity/suggestion', authenticateToken, async (req, res) => {
  try {
    const { energy } = req.query;
    const agent = orchestrator.agents.activity;

    const suggestion = agent.getActivitySuggestion(energy || 'low');

    res.json({
      status: 'success',
      energyLevel: energy || 'low',
      suggestion
    });
  } catch (error) {
    console.error('Activity suggestion error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get suggestion' });
  }
});

/**
 * GET /api/recovery/agents/activity/challenge
 * Get a micro-challenge for motivation
 */
router.get('/agents/activity/challenge', authenticateToken, async (req, res) => {
  try {
    const agent = orchestrator.agents.activity;
    const challenge = agent.getMicroChallenge?.() || {
      challenge: 'Take 10 slow breaths',
      duration: '1 min'
    };

    res.json({
      status: 'success',
      challenge
    });
  } catch (error) {
    console.error('Get challenge error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get challenge' });
  }
});

/**
 * POST /api/recovery/agents/activity/plan
 * Generate a weekly activity plan
 */
router.post('/agents/activity/plan', authenticateToken, async (req, res) => {
  try {
    const { preferences, currentEnergy } = req.body;
    const agent = orchestrator.agents.activity;

    const plan = await agent.generateWeeklyPlan?.(
      preferences || {},
      currentEnergy || 'low'
    );

    res.json({
      status: 'success',
      plan: plan || { message: 'Weekly planning coming soon' }
    });
  } catch (error) {
    console.error('Generate plan error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate plan' });
  }
});

// ============================================
// MOOD AGENT SPECIFIC
// ============================================

/**
 * POST /api/recovery/agents/mood/log
 * Log a mood entry
 */
router.post('/agents/mood/log', authenticateToken, async (req, res) => {
  try {
    const { mood, intensity, context, thoughts } = req.body;

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({ status: 'error', message: 'No active recovery' });
    }

    const agent = orchestrator.agents.mood;

    // Save mood log
    await recovery.addCheckIn({
      agentName: 'mood',
      response: `Mood: ${mood}, Intensity: ${intensity}/10`,
      score: intensity ? Math.ceil(intensity / 2) : null,
      customData: { mood, intensity, context, thoughts }
    });

    // Get appropriate response
    let response = {};
    if (intensity && intensity <= 3) {
      response = {
        type: 'support',
        affirmation: agent.getAffirmation?.('resilience') || 'You are stronger than you know.',
        exercise: agent.selfCompassionExercises?.[0]
      };
    } else {
      response = {
        type: 'acknowledgment',
        message: 'Thank you for checking in with your mood.'
      };
    }

    res.json({
      status: 'success',
      moodLogged: { mood, intensity },
      response
    });
  } catch (error) {
    console.error('Mood log error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to log mood' });
  }
});

/**
 * POST /api/recovery/agents/mood/reframe
 * Reframe a negative thought using CBT
 */
router.post('/agents/mood/reframe', authenticateToken, async (req, res) => {
  try {
    const { thought } = req.body;

    if (!thought) {
      return res.status(400).json({
        status: 'error',
        message: 'Thought is required'
      });
    }

    const agent = orchestrator.agents.mood;
    const reframe = await agent.reframeThought?.(thought);

    res.json({
      status: 'success',
      originalThought: thought,
      reframe: reframe || {
        distortion: 'unknown',
        challengeQuestions: ['What evidence supports this thought?'],
        balancedThought: 'Consider alternative perspectives.'
      }
    });
  } catch (error) {
    console.error('Reframe error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to reframe thought' });
  }
});

/**
 * GET /api/recovery/agents/mood/affirmation
 * Get an affirmation for a specific need
 */
router.get('/agents/mood/affirmation', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const agent = orchestrator.agents.mood;

    const affirmation = agent.getAffirmation?.(type) ||
      'You are doing your best, and that is enough.';

    res.json({
      status: 'success',
      type: type || 'general',
      affirmation
    });
  } catch (error) {
    console.error('Affirmation error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get affirmation' });
  }
});

// ============================================
// WORRY AGENT SPECIFIC
// ============================================

/**
 * POST /api/recovery/agents/worry/process
 * Process a worry through the decision tree
 */
router.post('/agents/worry/process', authenticateToken, async (req, res) => {
  try {
    const { worry } = req.body;

    if (!worry) {
      return res.status(400).json({
        status: 'error',
        message: 'Worry is required'
      });
    }

    const agent = orchestrator.agents.worry;
    const result = await agent.processWorryDecisionTree?.(worry);

    res.json({
      status: 'success',
      result: result || {
        guidance: [{ step: 'general', message: 'Take a breath. This will pass.' }]
      }
    });
  } catch (error) {
    console.error('Process worry error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process worry' });
  }
});

/**
 * POST /api/recovery/agents/worry/reframe
 * Reframe an anxious thought
 */
router.post('/agents/worry/reframe', authenticateToken, async (req, res) => {
  try {
    const { worry, previousWorries } = req.body;

    if (!worry) {
      return res.status(400).json({
        status: 'error',
        message: 'Worry is required'
      });
    }

    const agent = orchestrator.agents.worry;
    const reframe = await agent.reframeWorry?.(worry, { previousWorries });

    res.json({
      status: 'success',
      reframe: reframe || {
        validation: 'Your feeling is valid.',
        reframe: 'Consider that worry rarely changes outcomes.',
        reminder: 'You are safe in this moment.'
      }
    });
  } catch (error) {
    console.error('Worry reframe error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to reframe worry' });
  }
});

/**
 * GET /api/recovery/agents/worry/grounding
 * Get grounding exercise for acute anxiety
 */
router.get('/agents/worry/grounding', authenticateToken, async (req, res) => {
  try {
    const { intensity } = req.query;
    const agent = orchestrator.agents.worry;

    const grounding = agent.getImmediateGrounding?.(intensity || 'moderate');

    res.json({
      status: 'success',
      intensity: intensity || 'moderate',
      grounding: grounding || {
        message: 'Feel your feet on the ground. Take a slow breath.',
        exercise: { name: '5-4-3-2-1', duration: '3 minutes' }
      }
    });
  } catch (error) {
    console.error('Grounding error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get grounding' });
  }
});

/**
 * GET /api/recovery/agents/worry/panic-support
 * Get panic attack support
 */
router.get('/agents/worry/panic-support', authenticateToken, async (req, res) => {
  try {
    const { phase } = req.query;
    const agent = orchestrator.agents.worry;

    const support = agent.getPanicSupport?.(phase || 'during');

    res.json({
      status: 'success',
      phase: phase || 'during',
      support: support || {
        title: 'You will get through this',
        immediateMessage: 'This is a panic attack. It will pass.',
        steps: ['Breathe slowly', 'Feel your feet', 'This will end']
      }
    });
  } catch (error) {
    console.error('Panic support error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get support' });
  }
});

/**
 * GET /api/recovery/agents/worry/worry-time
 * Get worry time technique guidance
 */
router.get('/agents/worry/worry-time', authenticateToken, async (req, res) => {
  try {
    const { phase } = req.query;
    const agent = orchestrator.agents.worry;

    const guidance = agent.getWorryTimeGuidance?.(phase || 'setup');

    res.json({
      status: 'success',
      phase: phase || 'setup',
      guidance
    });
  } catch (error) {
    console.error('Worry time error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get guidance' });
  }
});

/**
 * POST /api/recovery/agents/worry/anxiety-ladder
 * Generate exposure hierarchy for a fear
 */
router.post('/agents/worry/anxiety-ladder', authenticateToken, async (req, res) => {
  try {
    const { fearTopic } = req.body;

    if (!fearTopic) {
      return res.status(400).json({
        status: 'error',
        message: 'Fear topic is required'
      });
    }

    const agent = orchestrator.agents.worry;
    const ladder = await agent.generateAnxietyLadder?.(fearTopic);

    res.json({
      status: 'success',
      ladder: ladder || { message: 'Work with a therapist for exposure therapy.' }
    });
  } catch (error) {
    console.error('Anxiety ladder error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate ladder' });
  }
});

// ============================================
// PROGRESS & REPORTS
// ============================================

/**
 * GET /api/recovery/progress
 * Get overall progress report
 */
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery plan'
      });
    }

    const activeAgents = recovery.activeAgents
      .filter(a => a.isActive)
      .map(a => a.agentName);

    const progressReport = await orchestrator.getProgressReport(
      req.user._id,
      activeAgents
    );

    // Add recovery-specific data
    progressReport.daysActive = Math.floor(
      (Date.now() - recovery.planStartDate) / (1000 * 60 * 60 * 24)
    );
    progressReport.totalCheckIns = recovery.checkIns.length;
    progressReport.streaks = recovery.activeAgents.reduce((acc, a) => {
      acc[a.agentName] = a.checkInStreak;
      return acc;
    }, {});

    res.json({
      status: 'success',
      progress: progressReport
    });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get progress' });
  }
});

/**
 * GET /api/recovery/history
 * Get check-in history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { agent, limit = 20, offset = 0 } = req.query;

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: { $in: ['active', 'paused', 'completed'] }
    }).sort({ createdAt: -1 });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No recovery history found'
      });
    }

    let checkIns = recovery.checkIns;
    if (agent) {
      checkIns = checkIns.filter(c => c.agentName === agent);
    }

    // Sort by timestamp descending, apply pagination
    checkIns = checkIns
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      status: 'success',
      total: recovery.checkIns.length,
      returned: checkIns.length,
      checkIns
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get history' });
  }
});

/**
 * GET /api/recovery/daily-summary
 * Generate or get today's summary
 */
router.get('/daily-summary', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    // Check if we have today's summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todaySummary = recovery.dailySummaries.find(s => {
      const summaryDate = new Date(s.date);
      summaryDate.setHours(0, 0, 0, 0);
      return summaryDate.getTime() === today.getTime();
    });

    if (!todaySummary) {
      // Generate new summary
      await recovery.generateDailySummary();
      await recovery.save();
      todaySummary = recovery.dailySummaries[recovery.dailySummaries.length - 1];
    }

    res.json({
      status: 'success',
      summary: todaySummary
    });
  } catch (error) {
    console.error('Daily summary error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get summary' });
  }
});

// ============================================
// GOALS & REMINDERS
// ============================================

/**
 * GET /api/recovery/goals
 * Get user's recovery goals
 */
router.get('/goals', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    res.json({
      status: 'success',
      goals: recovery.goals
    });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get goals' });
  }
});

/**
 * POST /api/recovery/goals
 * Add a new goal
 */
router.post('/goals', authenticateToken, async (req, res) => {
  try {
    const { agentName, title, description, targetDate } = req.body;

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    recovery.goals.push({
      agentName,
      title,
      description,
      targetDate: targetDate ? new Date(targetDate) : null,
      status: 'active',
      progress: 0
    });

    await recovery.save();

    res.json({
      status: 'success',
      message: 'Goal added',
      goal: recovery.goals[recovery.goals.length - 1]
    });
  } catch (error) {
    console.error('Add goal error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to add goal' });
  }
});

/**
 * PUT /api/recovery/goals/:goalId
 * Update a goal (progress, status)
 */
router.put('/goals/:goalId', authenticateToken, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { progress, status } = req.body;

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    const goal = recovery.goals.id(goalId);
    if (!goal) {
      return res.status(404).json({
        status: 'error',
        message: 'Goal not found'
      });
    }

    if (progress !== undefined) goal.progress = progress;
    if (status) {
      goal.status = status;
      if (status === 'completed') goal.completedAt = new Date();
    }

    await recovery.save();

    res.json({
      status: 'success',
      goal
    });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update goal' });
  }
});

/**
 * GET /api/recovery/preferences
 * Get user's recovery preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    res.json({
      status: 'success',
      preferences: recovery.preferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get preferences' });
  }
});

/**
 * PUT /api/recovery/preferences
 * Update recovery preferences
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    // Update allowed preferences
    const allowed = ['checkInTime', 'checkInFrequency', 'enableVoice', 'enableReminders'];
    allowed.forEach(key => {
      if (updates[key] !== undefined) {
        recovery.preferences[key] = updates[key];
      }
    });

    await recovery.save();

    res.json({
      status: 'success',
      preferences: recovery.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update preferences' });
  }
});

// ============================================
// SUPERVISOR & ADVANCED AGENTIC FEATURES
// ============================================

/**
 * POST /api/recovery/supervisor/analyze
 * Trigger supervisor analysis of recovery state
 */
router.post('/supervisor/analyze', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    const result = await supervisor.supervise(req.user._id, recovery);

    // Save any actions taken
    await recovery.save();

    res.json({
      status: 'success',
      analysis: result.analysis,
      decisions: result.decisions,
      actionsExecuted: result.actions,
      nextSupervisionIn: result.nextSupervisionIn
    });
  } catch (error) {
    console.error('Supervisor analysis error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to run supervisor analysis' });
  }
});

/**
 * GET /api/recovery/supervisor/insights
 * Get latest supervisor insights and cross-agent patterns
 */
router.get('/supervisor/insights', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    // Get recent supervisor actions
    const recentActions = (recovery.supervisorActions || []).slice(-10);
    const crossInterventions = (recovery.crossInterventions || []).filter(ci => ci.status === 'active');
    const escalations = (recovery.escalations || []).slice(-5);

    res.json({
      status: 'success',
      insights: {
        recentActions,
        activeCrossInterventions: crossInterventions,
        recentEscalations: escalations,
        interventionAdjustments: (recovery.interventionAdjustments || []).slice(-5)
      }
    });
  } catch (error) {
    console.error('Get supervisor insights error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get insights' });
  }
});

/**
 * POST /api/recovery/reflection/weekly
 * Generate or get weekly reflection
 */
router.post('/reflection/weekly', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    const reflection = await supervisor.conductWeeklyReflection(req.user._id, recovery);
    await recovery.save();

    res.json({
      status: 'success',
      reflection
    });
  } catch (error) {
    console.error('Weekly reflection error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate reflection' });
  }
});

/**
 * GET /api/recovery/reflections
 * Get past reflections
 */
router.get('/reflections', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    res.json({
      status: 'success',
      reflections: recovery.weeklyReflections || [],
      scheduledReflections: recovery.scheduledReflections || []
    });
  } catch (error) {
    console.error('Get reflections error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get reflections' });
  }
});

// ============================================
// MICRO-ASSESSMENTS FOR OUTCOME TRACKING
// ============================================

/**
 * POST /api/recovery/micro-assessment
 * Submit a quick agent-specific micro-assessment
 */
router.post('/micro-assessment', authenticateToken, async (req, res) => {
  try {
    const { agentName, assessmentType, rating, notes } = req.body;

    if (!agentName || !assessmentType || rating === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Agent name, assessment type, and rating are required'
      });
    }

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    // Initialize micro-assessments array if not exists
    if (!recovery.microAssessments) {
      recovery.microAssessments = [];
    }

    const microAssessment = {
      agentName,
      assessmentType,
      rating: Math.min(5, Math.max(1, rating)), // 1-5 scale
      notes: notes || null,
      timestamp: new Date()
    };

    recovery.microAssessments.push(microAssessment);

    // Update criterion progress based on micro-assessment
    const criterionMap = {
      sleep: { criterion: 7, name: 'Sleep Problems' },
      activity: { criterion: 2, name: 'Interest/Enjoyment' },
      mood: { criterion: 1, name: 'Mood' },
      worry: { criterion: 5, name: 'Worry/Anxiety' },
      nutrition: { criterion: 8, name: 'Eating Changes' },
      energy: { criterion: 10, name: 'Tiredness/Low Energy' }
    };

    const criterionInfo = criterionMap[agentName];
    if (criterionInfo) {
      // Convert 1-5 rating to 0-3 SNAM scale (inverted - higher is better)
      const snamScore = Math.max(0, 3 - Math.floor((rating - 1) * 0.75));
      await recovery.updateCriterionProgress(criterionInfo.criterion, snamScore);
    }

    await recovery.save();

    // Calculate trends for this agent
    const agentAssessments = recovery.microAssessments
      .filter(m => m.agentName === agentName)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let trend = 'stable';
    if (agentAssessments.length >= 3) {
      const recent = agentAssessments.slice(-3).map(a => a.rating);
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      const older = agentAssessments.slice(-6, -3).map(a => a.rating);
      if (older.length >= 2) {
        const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
        if (avgRecent > avgOlder + 0.5) trend = 'improving';
        else if (avgRecent < avgOlder - 0.5) trend = 'worsening';
      }
    }

    res.json({
      status: 'success',
      message: 'Micro-assessment recorded',
      assessment: microAssessment,
      trend,
      totalAssessments: agentAssessments.length
    });
  } catch (error) {
    console.error('Micro-assessment error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to record micro-assessment' });
  }
});

/**
 * GET /api/recovery/micro-assessments/:agentName
 * Get micro-assessment history for an agent
 */
router.get('/micro-assessments/:agentName', authenticateToken, async (req, res) => {
  try {
    const { agentName } = req.params;
    const { limit = 30 } = req.query;

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    const assessments = (recovery.microAssessments || [])
      .filter(m => m.agentName === agentName)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    // Calculate statistics
    const ratings = assessments.map(a => a.rating);
    const stats = ratings.length > 0 ? {
      average: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2),
      min: Math.min(...ratings),
      max: Math.max(...ratings),
      count: ratings.length,
      trend: calculateTrend(assessments.reverse().map(a => a.rating))
    } : null;

    res.json({
      status: 'success',
      agentName,
      assessments,
      statistics: stats
    });
  } catch (error) {
    console.error('Get micro-assessments error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get micro-assessments' });
  }
});

/**
 * GET /api/recovery/micro-assessment/prompts/:agentName
 * Get micro-assessment prompts for an agent
 */
router.get('/micro-assessment/prompts/:agentName', authenticateToken, async (req, res) => {
  try {
    const { agentName } = req.params;

    // Agent-specific micro-assessment prompts
    const prompts = {
      sleep: [
        { type: 'sleep_quality', question: 'How would you rate your sleep quality last night?', scale: '1 (Very Poor) - 5 (Excellent)' },
        { type: 'sleep_refreshed', question: 'How refreshed did you feel when you woke up?', scale: '1 (Not at all) - 5 (Very refreshed)' },
        { type: 'sleep_onset', question: 'How easily did you fall asleep?', scale: '1 (Very difficult) - 5 (Very easy)' }
      ],
      activity: [
        { type: 'activity_motivation', question: 'How motivated did you feel to do activities today?', scale: '1 (Not at all) - 5 (Very motivated)' },
        { type: 'activity_enjoyment', question: 'How much did you enjoy your activities today?', scale: '1 (Not at all) - 5 (Very much)' },
        { type: 'activity_accomplishment', question: 'How accomplished do you feel right now?', scale: '1 (Not at all) - 5 (Very accomplished)' }
      ],
      mood: [
        { type: 'mood_overall', question: 'How would you rate your overall mood right now?', scale: '1 (Very low) - 5 (Very good)' },
        { type: 'mood_stability', question: 'How stable has your mood been today?', scale: '1 (Very unstable) - 5 (Very stable)' },
        { type: 'mood_hopefulness', question: 'How hopeful do you feel about tomorrow?', scale: '1 (Not hopeful) - 5 (Very hopeful)' }
      ],
      worry: [
        { type: 'worry_intensity', question: 'How intense have your worries been today?', scale: '1 (Very intense) - 5 (Minimal/none)' },
        { type: 'worry_control', question: 'How well could you manage your anxiety today?', scale: '1 (Not at all) - 5 (Very well)' },
        { type: 'worry_physical', question: 'How much did anxiety affect you physically?', scale: '1 (Severely) - 5 (Not at all)' }
      ],
      nutrition: [
        { type: 'nutrition_regular', question: 'How regular were your meals today?', scale: '1 (Skipped most) - 5 (All meals on time)' },
        { type: 'nutrition_quality', question: 'How would you rate the quality of what you ate?', scale: '1 (Very poor) - 5 (Very nutritious)' },
        { type: 'nutrition_appetite', question: 'How would you describe your appetite today?', scale: '1 (No appetite) - 5 (Healthy appetite)' }
      ],
      energy: [
        { type: 'energy_level', question: 'What was your average energy level today?', scale: '1 (Exhausted) - 5 (Energetic)' },
        { type: 'energy_consistency', question: 'How consistent was your energy throughout the day?', scale: '1 (Crashed often) - 5 (Very consistent)' },
        { type: 'energy_tasks', question: 'How well could you complete daily tasks?', scale: '1 (Couldn\'t do much) - 5 (Did everything needed)' }
      ]
    };

    const agentPrompts = prompts[agentName];
    if (!agentPrompts) {
      return res.status(400).json({
        status: 'error',
        message: 'Unknown agent name'
      });
    }

    res.json({
      status: 'success',
      agentName,
      prompts: agentPrompts
    });
  } catch (error) {
    console.error('Get prompts error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get prompts' });
  }
});

// ============================================
// STRUCTURED PROGRESSION & MASTERY
// ============================================

/**
 * GET /api/recovery/progression/:agentName
 * Get structured progression status for an agent
 */
router.get('/progression/:agentName', authenticateToken, async (req, res) => {
  try {
    const { agentName } = req.params;

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    const agent = recovery.activeAgents.find(a => a.agentName === agentName);
    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: 'Agent not active'
      });
    }

    // Calculate mastery metrics
    const agentCheckIns = recovery.checkIns.filter(c => c.agentName === agentName);
    const positiveCheckIns = agentCheckIns.filter(c => c.sentiment === 'positive').length;
    const totalCheckIns = agentCheckIns.length;

    const agentAssessments = (recovery.microAssessments || [])
      .filter(m => m.agentName === agentName);
    const recentAssessments = agentAssessments.slice(-5);
    const avgRating = recentAssessments.length > 0
      ? recentAssessments.reduce((sum, a) => sum + a.rating, 0) / recentAssessments.length
      : null;

    // Determine if ready for level progression
    const progressionCriteria = {
      light: {
        minCheckIns: 7,
        minPositiveRate: 0.5,
        minAvgRating: 3.0,
        nextLevel: 'moderate'
      },
      moderate: {
        minCheckIns: 14,
        minPositiveRate: 0.6,
        minAvgRating: 3.5,
        nextLevel: 'intensive'
      },
      intensive: {
        minCheckIns: 21,
        minPositiveRate: 0.7,
        minAvgRating: 4.0,
        nextLevel: 'maintenance'
      }
    };

    const currentLevel = agent.currentIntervention?.level || 'light';
    const criteria = progressionCriteria[currentLevel];
    const positiveRate = totalCheckIns > 0 ? positiveCheckIns / totalCheckIns : 0;

    const readyForProgression = criteria && totalCheckIns >= criteria.minCheckIns &&
      positiveRate >= criteria.minPositiveRate &&
      (avgRating === null || avgRating >= criteria.minAvgRating);

    res.json({
      status: 'success',
      agentName,
      progression: {
        currentLevel,
        currentIntervention: agent.currentIntervention,
        metrics: {
          totalCheckIns,
          positiveCheckIns,
          positiveRate: (positiveRate * 100).toFixed(1) + '%',
          streak: agent.checkInStreak,
          averageRating: avgRating?.toFixed(2) || 'N/A',
          assessmentCount: agentAssessments.length
        },
        mastery: {
          criteria: criteria || null,
          meetsCheckInRequirement: totalCheckIns >= (criteria?.minCheckIns || 0),
          meetsPositiveRateRequirement: positiveRate >= (criteria?.minPositiveRate || 0),
          meetsRatingRequirement: avgRating === null || avgRating >= (criteria?.minAvgRating || 0),
          readyForProgression
        },
        nextLevel: readyForProgression ? criteria?.nextLevel : null
      }
    });
  } catch (error) {
    console.error('Get progression error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get progression' });
  }
});

/**
 * POST /api/recovery/progression/:agentName/advance
 * Advance to next intervention level if mastery criteria met
 */
router.post('/progression/:agentName/advance', authenticateToken, async (req, res) => {
  try {
    const { agentName } = req.params;
    const { force } = req.body;

    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    // Use supervisor to advance level
    const result = await supervisor.executeDecisions(req.user._id, recovery, [{
      action: 'adjustInterventionLevel',
      parameters: {
        agentName,
        direction: 'increase',
        reason: force ? 'User requested advancement' : 'Mastery criteria met'
      },
      priority: 'medium'
    }]);

    await recovery.save();

    const actionResult = result[0];
    if (actionResult?.result?.success) {
      res.json({
        status: 'success',
        message: `Advanced ${agentName} from ${actionResult.result.previousLevel} to ${actionResult.result.newLevel}`,
        result: actionResult.result
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: actionResult?.result?.error || 'Failed to advance level'
      });
    }
  } catch (error) {
    console.error('Advance progression error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to advance progression' });
  }
});

// ============================================
// EXTERNAL TOOL INTEGRATIONS
// ============================================

const {
  toolRegistry,
  getToolAvailability,
  executeAgentToolCall,
  getAgentTools
} = require('../services/externalTools');
const ProactiveEngine = require('../services/recoveryAgents/proactiveEngine');

const proactiveEngine = new ProactiveEngine(orchestrator);

// Image upload for meal photos (Gemini Vision)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * GET /api/recovery/tools/status
 * Get status of all external tools
 */
router.get('/tools/status', authenticateToken, async (req, res) => {
  try {
    const availability = await getToolAvailability();
    const stats = toolRegistry.getExecutionStats();

    res.json({
      status: 'success',
      tools: availability,
      stats
    });
  } catch (error) {
    console.error('Tools status error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get tools status' });
  }
});

/**
 * GET /api/recovery/tools/agent/:agentName
 * Get available tools for a specific agent
 */
router.get('/tools/agent/:agentName', authenticateToken, async (req, res) => {
  try {
    const { agentName } = req.params;
    const tools = getAgentTools(agentName);

    res.json({
      status: 'success',
      agent: agentName,
      tools
    });
  } catch (error) {
    console.error('Agent tools error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get agent tools' });
  }
});

// ============================================
// CALENDAR INTEGRATION (ActivityAgent)
// ============================================

/**
 * GET /api/recovery/tools/calendar/auth-url
 * Get Google Calendar OAuth URL for connecting user's calendar
 */
router.get('/tools/calendar/auth-url', authenticateToken, async (req, res) => {
  try {
    const { calendarTool } = require('../services/externalTools');

    const state = Buffer.from(JSON.stringify({
      userId: req.user._id,
      returnUrl: req.query.returnUrl || '/dashboard/recovery'
    })).toString('base64');

    const authUrl = calendarTool.getAuthUrl(state);

    res.json({
      status: 'success',
      authUrl,
      message: 'Redirect user to this URL to connect their Google Calendar'
    });
  } catch (error) {
    console.error('Calendar auth URL error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate auth URL' });
  }
});

/**
 * POST /api/recovery/tools/calendar/schedule-activity
 * Schedule a wellness activity in the user's calendar
 */
router.post('/tools/calendar/schedule-activity', authenticateToken, async (req, res) => {
  try {
    const { title, description, startTime, duration, activityType, recurring } = req.body;

    if (!title || !startTime || !duration) {
      return res.status(400).json({
        status: 'error',
        message: 'title, startTime, and duration are required'
      });
    }

    const result = await executeAgentToolCall(
      'activity',
      'calendar',
      'createEvent',
      { title, description, startTime, duration, activityType, recurring },
      { userId: req.user._id, timezone: req.body.timezone }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Schedule activity error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/recovery/tools/calendar/suggest-times
 * Get suggested time slots for scheduling an activity
 */
router.get('/tools/calendar/suggest-times', authenticateToken, async (req, res) => {
  try {
    const { duration, preferredTimeOfDay, daysAhead } = req.query;

    const result = await executeAgentToolCall(
      'activity',
      'calendar',
      'suggestTimeSlot',
      {
        duration: parseInt(duration) || 30,
        preferredTimeOfDay: preferredTimeOfDay || 'any',
        daysAhead: parseInt(daysAhead) || 7
      },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Suggest times error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/recovery/tools/calendar/upcoming
 * Get upcoming calendar events
 */
router.get('/tools/calendar/upcoming', authenticateToken, async (req, res) => {
  try {
    const { maxResults, filterWellness } = req.query;

    const result = await executeAgentToolCall(
      'activity',
      'calendar',
      'getUpcomingEvents',
      {
        maxResults: parseInt(maxResults) || 10,
        filterWellness: filterWellness === 'true'
      },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Upcoming events error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// VISION INTEGRATION (NutritionAgent)
// ============================================

/**
 * POST /api/recovery/tools/vision/analyze-meal
 * Analyze a meal photo for nutritional content
 */
router.post('/tools/vision/analyze-meal', authenticateToken, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Image file required'
      });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const mealType = req.body.mealType || 'unknown';

    const result = await executeAgentToolCall(
      'nutrition',
      'vision',
      'analyzeMeal',
      { imageBase64, mimeType, mealType },
      { userId: req.user._id }
    );

    // Store meal analysis in recovery data
    if (result.success) {
      const recovery = await Recovery.findOne({
        userId: req.user._id,
        status: 'active'
      });

      if (recovery) {
        await recovery.addCheckIn({
          agentName: 'nutrition',
          response: `Meal photo: ${result.data?.description || 'Analyzed'}`,
          score: result.data?.foods?.filter(f => f.isHealthy).length > 0 ? 4 : 3,
          customData: {
            type: 'meal_photo',
            mealType,
            analysis: result.data
          }
        });
      }
    }

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Analyze meal error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * POST /api/recovery/tools/vision/meal-balance
 * Assess nutritional balance of a meal
 */
router.post('/tools/vision/meal-balance', authenticateToken, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Image file required' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const result = await executeAgentToolCall(
      'nutrition',
      'vision',
      'assessMealBalance',
      { imageBase64, mimeType },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Meal balance error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * POST /api/recovery/tools/vision/mood-food
 * Analyze mood-food relationship for a meal
 */
router.post('/tools/vision/mood-food', authenticateToken, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Image file required' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const result = await executeAgentToolCall(
      'nutrition',
      'vision',
      'getMoodFoodAnalysis',
      { imageBase64, mimeType },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Mood food analysis error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// WEATHER INTEGRATION (EnergyAgent)
// ============================================

/**
 * GET /api/recovery/tools/weather/current
 * Get current weather for user's location
 */
router.get('/tools/weather/current', authenticateToken, async (req, res) => {
  try {
    const { location, lat, lon } = req.query;

    if (!location && (!lat || !lon)) {
      return res.status(400).json({
        status: 'error',
        message: 'location or lat/lon required'
      });
    }

    const result = await executeAgentToolCall(
      'energy',
      'weather',
      'getCurrentWeather',
      { location, lat: parseFloat(lat), lon: parseFloat(lon) },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Current weather error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/recovery/tools/weather/activity-recommendation
 * Get weather-appropriate activity recommendations
 */
router.get('/tools/weather/activity-recommendation', authenticateToken, async (req, res) => {
  try {
    const { location, activityType, energyLevel } = req.query;

    if (!location) {
      return res.status(400).json({ status: 'error', message: 'location required' });
    }

    const result = await executeAgentToolCall(
      'energy',
      'weather',
      'getActivityRecommendation',
      { location, activityType, energyLevel },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Weather activity recommendation error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/recovery/tools/weather/light-advice
 * Get natural light exposure advice based on weather
 */
router.get('/tools/weather/light-advice', authenticateToken, async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({ status: 'error', message: 'location required' });
    }

    const result = await executeAgentToolCall(
      'energy',
      'weather',
      'getLightExposureAdvice',
      { location },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Light advice error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/recovery/tools/weather/mood-impact
 * Get weather's potential impact on mood and energy
 */
router.get('/tools/weather/mood-impact', authenticateToken, async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({ status: 'error', message: 'location required' });
    }

    const result = await executeAgentToolCall(
      'energy',
      'weather',
      'getWeatherMoodImpact',
      { location },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Weather mood impact error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// MINDFULNESS INTEGRATION (WorryAgent)
// ============================================

/**
 * POST /api/recovery/tools/mindfulness/start-session
 * Start a mindfulness or breathing session
 */
router.post('/tools/mindfulness/start-session', authenticateToken, async (req, res) => {
  try {
    const { sessionType, duration, technique } = req.body;

    if (!sessionType || !duration) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionType and duration required'
      });
    }

    const result = await executeAgentToolCall(
      'worry',
      'mindfulness',
      'startSession',
      { sessionType, duration, technique },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/recovery/tools/mindfulness/guided/:sessionId
 * Get a pre-built guided session
 */
router.get('/tools/mindfulness/guided/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await executeAgentToolCall(
      'worry',
      'mindfulness',
      'getGuidedSession',
      { sessionId },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Get guided session error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/recovery/tools/mindfulness/breathing/:pattern
 * Get a breathing exercise with timing
 */
router.get('/tools/mindfulness/breathing/:pattern', authenticateToken, async (req, res) => {
  try {
    const { pattern } = req.params;
    const { rounds } = req.query;

    const result = await executeAgentToolCall(
      'worry',
      'mindfulness',
      'getBreathingExercise',
      { pattern, rounds: parseInt(rounds) || 4 },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Get breathing exercise error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/recovery/tools/mindfulness/quick-calm
 * Get immediate calming technique for acute anxiety
 */
router.get('/tools/mindfulness/quick-calm', authenticateToken, async (req, res) => {
  try {
    const { intensity, context } = req.query;

    const result = await executeAgentToolCall(
      'worry',
      'mindfulness',
      'getQuickCalm',
      { intensity: intensity || 'moderate', context: context || 'at_home' },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Quick calm error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * POST /api/recovery/tools/mindfulness/track
 * Track a completed mindfulness session
 */
router.post('/tools/mindfulness/track', authenticateToken, async (req, res) => {
  try {
    const { sessionType, duration, anxietyBefore, anxietyAfter, notes } = req.body;

    const result = await executeAgentToolCall(
      'worry',
      'mindfulness',
      'trackSession',
      { sessionType, duration, anxietyBefore, anxietyAfter, notes },
      { userId: req.user._id }
    );

    // Also store in recovery check-ins
    if (result.success) {
      const recovery = await Recovery.findOne({
        userId: req.user._id,
        status: 'active'
      });

      if (recovery) {
        await recovery.addCheckIn({
          agentName: 'worry',
          response: `Mindfulness session: ${sessionType} (${duration} min)`,
          score: anxietyAfter ? (5 - Math.min(anxietyAfter / 2, 4)) : 3,
          customData: {
            type: 'mindfulness_session',
            ...result.data
          }
        });
      }
    }

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Track session error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * POST /api/recovery/tools/mindfulness/schedule-reminder
 * Schedule a mindfulness reminder
 */
router.post('/tools/mindfulness/schedule-reminder', authenticateToken, async (req, res) => {
  try {
    const { time, type, frequency, message } = req.body;

    if (!time || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'time and type required'
      });
    }

    const result = await executeAgentToolCall(
      'worry',
      'mindfulness',
      'scheduleReminder',
      { time, type, frequency, message },
      { userId: req.user._id }
    );

    res.json({
      status: result.success ? 'success' : 'error',
      ...result
    });
  } catch (error) {
    console.error('Schedule reminder error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// PROACTIVE BEHAVIOR
// ============================================

/**
 * POST /api/recovery/proactive/check
 * Check and fire proactive triggers for the user
 */
router.post('/proactive/check', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    const context = {
      userId: req.user._id,
      serAnalysis: req.body.serAnalysis,
      location: req.body.location
    };

    const actions = await proactiveEngine.checkTriggers(
      req.user._id.toString(),
      recovery,
      context
    );

    res.json({
      status: 'success',
      actionsTriggered: actions.length,
      actions
    });
  } catch (error) {
    console.error('Proactive check error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * POST /api/recovery/proactive/setup
 * Set up default proactive triggers for the user
 */
router.post('/proactive/setup', authenticateToken, async (req, res) => {
  try {
    const recovery = await Recovery.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!recovery) {
      return res.status(404).json({
        status: 'error',
        message: 'No active recovery'
      });
    }

    proactiveEngine.setupDefaultTriggers(req.user._id.toString(), recovery);

    const triggers = proactiveEngine.getUserTriggers(req.user._id.toString());

    res.json({
      status: 'success',
      message: 'Proactive triggers configured',
      triggersCount: triggers.length,
      triggers: triggers.map(t => ({
        id: t.id,
        agentName: t.agentName,
        triggerType: t.triggerType,
        enabled: t.enabled
      }))
    });
  } catch (error) {
    console.error('Proactive setup error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/recovery/proactive/triggers
 * Get all proactive triggers for the user
 */
router.get('/proactive/triggers', authenticateToken, async (req, res) => {
  try {
    const triggers = proactiveEngine.getUserTriggers(req.user._id.toString());

    res.json({
      status: 'success',
      triggers
    });
  } catch (error) {
    console.error('Get triggers error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * DELETE /api/recovery/proactive/triggers/:triggerId
 * Disable a specific trigger
 */
router.delete('/proactive/triggers/:triggerId', authenticateToken, async (req, res) => {
  try {
    const { triggerId } = req.params;

    proactiveEngine.disableTrigger(triggerId);

    res.json({
      status: 'success',
      message: 'Trigger disabled'
    });
  } catch (error) {
    console.error('Disable trigger error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * POST /api/recovery/proactive/ser-response
 * Handle proactive response to SER-detected emotions
 */
router.post('/proactive/ser-response', authenticateToken, async (req, res) => {
  try {
    const { serAnalysis } = req.body;

    if (!serAnalysis) {
      return res.status(400).json({
        status: 'error',
        message: 'serAnalysis required'
      });
    }

    const response = await proactiveEngine.proactiveMindfulnessResponse(
      req.user._id.toString(),
      serAnalysis,
      { userId: req.user._id }
    );

    res.json({
      status: 'success',
      ...response
    });
  } catch (error) {
    console.error('SER response error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateTrend(ratings) {
  if (ratings.length < 3) return 'insufficient_data';

  const firstHalf = ratings.slice(0, Math.floor(ratings.length / 2));
  const secondHalf = ratings.slice(Math.floor(ratings.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  if (secondAvg > firstAvg + 0.3) return 'improving';
  if (secondAvg < firstAvg - 0.3) return 'worsening';
  return 'stable';
}

function getPriorityForAgent(agentName, criteriaScores) {
  const agentCriteria = {
    sleep: [7],
    activity: [2, 4, 9, 11],
    mood: [1, 3],
    worry: [5],
    nutrition: [8],
    energy: [10]
  };

  // Convert array format to object if needed
  let scoresMap = {};
  if (Array.isArray(criteriaScores)) {
    criteriaScores.forEach(item => {
      if (item.criteria !== undefined && item.score !== undefined) {
        scoresMap[item.criteria] = item.score;
      }
    });
  } else {
    scoresMap = criteriaScores || {};
  }

  const criteria = agentCriteria[agentName] || [];
  const maxScore = Math.max(...criteria.map(c => scoresMap[c] || 0));

  if (maxScore >= 3) return 'high';
  if (maxScore >= 2) return 'medium';
  return 'low';
}

module.exports = router;
