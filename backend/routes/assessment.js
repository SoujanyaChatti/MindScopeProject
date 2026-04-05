const express = require('express');
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { validateAssessmentResponse } = require('../middleware/validation');
const {
  getInitialQuestions,
  getSNAMQuestions,
  getAllQuestions,
  shouldContinueAssessment,
  getQuestionById,
  isInCrisis,
  hasSevereSymptoms
} = require('../data/questionBank');
const geminiService = require('../services/geminiService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Helper function to get previous assessment context for chaining
async function getPreviousAssessmentContext(userId, limit = 3) {
  try {
    const previousAssessments = await Assessment.find({
      userId,
      status: 'completed'
    })
    .sort({ completedAt: -1 })
    .limit(limit)
    .select('snamScores completedAt llmAnalysis recommendations');

    if (!previousAssessments.length) {
      return null;
    }

    return {
      assessmentCount: previousAssessments.length,
      history: previousAssessments.map(a => ({
        date: a.completedAt,
        totalScore: a.snamScores?.totalScore,
        severityLevel: a.snamScores?.severityLevel,
        criteriaScores: a.snamScores?.criteriaScores,
        keyObservations: a.llmAnalysis?.keyObservations?.slice(0, 2)
      })),
      trend: calculateTrend(previousAssessments),
      areasOfConcern: identifyPersistentConcerns(previousAssessments)
    };
  } catch (error) {
    console.error('Error fetching previous assessments:', error);
    return null;
  }
}

// Calculate trend from previous assessments
function calculateTrend(assessments) {
  if (assessments.length < 2) return 'insufficient_data';

  const scores = assessments.map(a => a.snamScores?.totalScore || 0);
  const recent = scores[0];
  const older = scores[scores.length - 1];

  if (recent < older - 2) return 'improving';
  if (recent > older + 2) return 'worsening';
  return 'stable';
}

// Identify areas that consistently score high
function identifyPersistentConcerns(assessments) {
  const concernCounts = {};

  assessments.forEach(a => {
    const criteria = a.snamScores?.criteriaScores || {};
    Object.entries(criteria).forEach(([key, value]) => {
      if (value >= 2) {
        concernCounts[key] = (concernCounts[key] || 0) + 1;
      }
    });
  });

  // Return criteria that appear as concerns in majority of assessments
  const threshold = Math.ceil(assessments.length / 2);
  return Object.entries(concernCounts)
    .filter(([_, count]) => count >= threshold)
    .map(([key, _]) => key);
}

// @route   GET /api/assessment/test-gemini
// @desc    Test Gemini API connection
// @access  Public
router.get('/test-gemini', async (req, res) => {
  try {
    const testResponse = await geminiService.generateContent('Hello, this is a test. Please respond with "API working"');

    res.json({
      status: 'success',
      message: 'Gemini API is working',
      response: testResponse
    });
  } catch (error) {
    console.error('Gemini API test failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Gemini API test failed',
      error: error.message
    });
  }
});

// @route   GET /api/assessment/history
// @desc    Get user's assessment history
// @access  Private
// NOTE: This route MUST be before /:sessionId to avoid route conflicts
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 3 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const assessments = await Assessment.find({
      userId: req.user._id,
      status: 'completed'
    })
    .select('sessionId status snamScores llmAnalysis recommendations metadata createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Assessment.countDocuments({
      userId: req.user._id,
      status: 'completed'
    });

    res.json({
      status: 'success',
      data: {
        assessments: assessments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalAssessments: total,
          hasNext: skip + assessments.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get assessment history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get assessment history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/assessment/start
// @desc    Start a new assessment
// @access  Private
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { language = 'en', forceNew = false } = req.body;

    // Check if user has a recent incomplete assessment
    const existingAssessment = await Assessment.findOne({
      userId: req.user._id,
      status: 'in-progress'
    });

    // If forceNew is true, mark any existing incomplete assessments as abandoned
    if (forceNew && existingAssessment) {
      existingAssessment.status = 'abandoned';
      await existingAssessment.save();
    }

    if (existingAssessment && !forceNew) {
      // Get the next question for existing assessment
      const allQuestions = getAllQuestions();
      const askedQuestions = existingAssessment.responses.map(r => getQuestionById(r.questionId)).filter(Boolean);
      const nextQuestionSelection = await geminiService.selectNextQuestion(
        allQuestions,
        askedQuestions,
        existingAssessment.responses,
        language
      );

      let nextQuestion = null;
      let questionText = null;
      if (nextQuestionSelection.nextQuestionId !== 'ASSESSMENT_COMPLETE') {
        nextQuestion = getQuestionById(nextQuestionSelection.nextQuestionId);
        // Use rephrased question if available
        questionText = nextQuestionSelection.rephrasedQuestion || nextQuestion?.text;
      }

      return res.json({
        status: 'success',
        message: 'Resuming existing assessment',
        data: {
          assessment: existingAssessment,
          nextQuestion: nextQuestion ? {
            ...nextQuestion,
            displayText: questionText,
            isRephrased: nextQuestionSelection.isRephrased
          } : null
        }
      });
    }

    // Get previous assessment context for chaining
    const previousContext = await getPreviousAssessmentContext(req.user._id);

    // Create new assessment with reference to history
    const sessionId = uuidv4();
    const assessment = new Assessment({
      userId: req.user._id,
      sessionId,
      totalQuestions: getAllQuestions().length,
      previousAssessmentContext: previousContext ? {
        trend: previousContext.trend,
        areasOfConcern: previousContext.areasOfConcern,
        lastAssessmentDate: previousContext.history[0]?.date,
        lastScore: previousContext.history[0]?.totalScore
      } : null
    });

    await assessment.save();

    // Get first question and rephrase it in the selected language
    const firstQuestion = getInitialQuestions()[0];
    let displayText = firstQuestion.text;

    // If Telugu is selected, translate the first question
    if (language === 'te') {
      try {
        const rephrasedResponse = await geminiService.rephraseQuestion(firstQuestion.text, language);
        displayText = rephrasedResponse || firstQuestion.text;
      } catch (err) {
        console.error('Failed to translate first question:', err);
        // Fall back to English if translation fails
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Assessment started successfully',
      data: {
        assessment: {
          id: assessment._id,
          sessionId: assessment.sessionId,
          status: assessment.status,
          currentQuestionIndex: assessment.currentQuestionIndex,
          totalQuestions: assessment.totalQuestions,
          hasPreviousAssessments: !!previousContext
        },
        previousContext: previousContext ? {
          trend: previousContext.trend,
          areasOfConcern: previousContext.areasOfConcern,
          lastScore: previousContext.history[0]?.totalScore,
          assessmentCount: previousContext.assessmentCount
        } : null,
        nextQuestion: {
          ...firstQuestion,
          displayText: displayText,
          isRephrased: language !== 'en'
        }
      }
    });
  } catch (error) {
    console.error('Start assessment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start assessment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/assessment/:sessionId/respond
// @desc    Submit a response to a question
// @access  Private
router.post('/:sessionId/respond', authenticateToken, validateAssessmentResponse, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, userResponse, language = 'en' } = req.body;

    // Find the assessment
    const assessment = await Assessment.findOne({
      sessionId,
      userId: req.user._id,
      status: 'in-progress'
    });

    if (!assessment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assessment not found or already completed'
      });
    }

    // Check if this is a clarification response
    let originalQuestionId = questionId;
    let isClarificationQuestion = questionId.startsWith('clarify_');

    if (isClarificationQuestion) {
      // Extract original question ID from clarification ID
      originalQuestionId = questionId.replace('clarify_', '');
    }

    // Get question details
    const question = getQuestionById(originalQuestionId);
    if (!question) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid question ID'
      });
    }

    // Map response to SNAM score using LLM with confidence tracking
    let snamMapping = null;
    let clarificationNeeded = false;
    let clarificationQuestion = null;

    if (question.snamCategory) {
      snamMapping = await geminiService.mapResponseToSNAM(
        question.text,
        userResponse,
        question.snamCategory,
        question.snamCriteria || 1,
        language
      );

      // Check if clarification is needed (low confidence response)
      // Skip clarification if this is already a clarification response
      if (snamMapping && snamMapping.needsClarification && !req.body.isClarificationResponse && !isClarificationQuestion) {
        clarificationNeeded = true;
        const clarification = await geminiService.generateClarificationQuestion(
          question.text,
          userResponse,
          question.snamCategory,
          snamMapping.ambiguityFactors || [],
          language
        );
        if (clarification) {
          clarificationQuestion = {
            id: `clarify_${questionId}`,
            text: clarification.question,
            displayText: clarification.question,
            category: 'clarification',
            snamCategory: question.snamCategory,
            snamCriteria: question.snamCriteria,
            originalQuestionId: questionId,
            clarificationType: clarification.type,
            isRephrased: false
          };
        }
      }

      // If this is a clarification response, recalculate the score
      if ((req.body.isClarificationResponse || isClarificationQuestion) && req.body.originalMapping) {
        const refinedMapping = await geminiService.recalculateWithClarification(
          req.body.originalMapping,
          userResponse,
          question.snamCategory,
          question.snamCriteria || 1,
          language
        );
        if (refinedMapping) {
          snamMapping = refinedMapping;
          snamMapping.clarificationResponse = userResponse;
        }
      }
    }

    // Add response to assessment with SNAM mapping
    await assessment.addResponse(questionId, question.text, question.category, userResponse, snamMapping);

    // If clarification is needed, return the clarification question instead of proceeding
    if (clarificationNeeded && clarificationQuestion) {
      return res.json({
        status: 'success',
        message: 'Clarification needed for accurate assessment',
        data: {
          assessment: assessment,
          nextQuestion: clarificationQuestion,
          progress: assessment.progress,
          requiresClarification: true,
          originalMapping: snamMapping,
          clarificationReason: snamMapping.ambiguityFactors?.join(', ') || 'Response needs more detail'
        }
      });
    }

    // Recalculate SNAM scores after adding response
    assessment.calculateSNAMScore();
    await assessment.save();

    // Check for crisis situation using LLM-based detection (not keyword matching)
    // First do a quick score-based check, then confirm with LLM if needed
    const scoreBasedCrisis = isInCrisis(assessment.responses);

    // Use LLM to detect crisis indicators with full context understanding
    const llmCrisisResult = await geminiService.detectCrisisIndicatorsWithLLM(assessment.responses);

    // Only trigger crisis if LLM confirms it's a real crisis (not a denial)
    const isRealCrisis = llmCrisisResult.isCrisis && llmCrisisResult.confidence >= 0.7;

    if (isRealCrisis) {
      console.log('Crisis detected by LLM:', {
        confidence: llmCrisisResult.confidence,
        reasoning: llmCrisisResult.reasoning,
        severity: llmCrisisResult.severity
      });

      // Complete assessment due to crisis
      await assessment.completeAssessment();

      // Generate analysis and recommendations even for crisis
      const analysis = await geminiService.generateAnalysis(
        assessment.snamScores.totalScore,
        assessment.snamScores.severityLevel,
        assessment.responses,
        assessment.snamScores.meetsCoreCriteria,
        language,
        assessment.previousAssessmentContext  // Include history for trend analysis
      );
      assessment.llmAnalysis = analysis;

      const recommendations = await geminiService.generateRecommendations(
        assessment.snamScores.totalScore,
        assessment.snamScores.severityLevel,
        assessment.responses,
        language
      );
      assessment.recommendations = recommendations;
      await assessment.save();

      return res.status(200).json({
        status: 'success',
        message: 'Assessment completed due to high-risk response',
        data: {
          assessment: assessment,
          nextQuestion: null,
          crisisAlert: true,
          crisisDetails: {
            severity: llmCrisisResult.severity,
            concern: llmCrisisResult.specificConcern,
            reasoning: llmCrisisResult.reasoning
          },
          immediateSupport: {
            message: 'We\'re concerned about your safety. Please reach out for immediate help.',
            resources: [
              'National Suicide Prevention Lifeline: 988',
              'Crisis Text Line: Text HOME to 741741',
              'Emergency Services: 911'
            ]
          }
        }
      });
    }

    // Check if assessment should continue
    if (!shouldContinueAssessment(assessment.responses)) {
      // Complete the assessment
      await assessment.completeAssessment();

      // Generate comprehensive LLM analysis with history context
      const analysis = await geminiService.generateAnalysis(
        assessment.snamScores.totalScore,
        assessment.snamScores.severityLevel,
        assessment.responses,
        assessment.snamScores.meetsCoreCriteria,
        language,
        assessment.previousAssessmentContext  // Include history for trend analysis
      );
      assessment.llmAnalysis = analysis;

      // Generate recommendations
      const recommendations = await geminiService.generateRecommendations(
        assessment.snamScores.totalScore,
        assessment.snamScores.severityLevel,
        assessment.responses,
        language
      );

      assessment.recommendations = recommendations;
      await assessment.save();

      // Update user statistics
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { totalAssessments: 1 },
        lastAssessmentDate: new Date()
      });

      return res.json({
        status: 'success',
        message: 'Assessment completed successfully',
        data: {
          assessment: assessment,
          nextQuestion: null,
          results: {
            totalScore: assessment.snamScores.totalScore,
            severityLevel: assessment.snamScores.severityLevel,
            criteriaScores: assessment.snamScores.criteriaScores,
            meetsCoreCriteria: assessment.snamScores.meetsCoreCriteria,
            llmAnalysis: assessment.llmAnalysis,
            recommendations: assessment.recommendations
          }
        }
      });
    }

    // Use intelligent LLM-based question selection with dynamic rephrasing
    const allQuestions = getAllQuestions();
    const askedQuestions = assessment.responses.map(r => getQuestionById(r.questionId)).filter(Boolean);
    const userResponses = assessment.responses;

    // Pass previous assessment context for chaining
    const nextQuestionSelection = await geminiService.selectNextQuestion(
      allQuestions,
      askedQuestions,
      userResponses,
      language,
      assessment.previousAssessmentContext  // Include history context
    );

    let nextQuestion = null;
    let questionText = null;

    // Check if LLM determined assessment should be complete
    if (nextQuestionSelection.nextQuestionId === 'ASSESSMENT_COMPLETE') {
      // Complete the assessment
      await assessment.completeAssessment();

      // Generate comprehensive LLM analysis with history context
      const analysis = await geminiService.generateAnalysis(
        assessment.snamScores.totalScore,
        assessment.snamScores.severityLevel,
        assessment.responses,
        assessment.snamScores.meetsCoreCriteria,
        language,
        assessment.previousAssessmentContext  // Include history for trend analysis
      );
      assessment.llmAnalysis = analysis;

      // Generate recommendations
      const recommendations = await geminiService.generateRecommendations(
        assessment.snamScores.totalScore,
        assessment.snamScores.severityLevel,
        assessment.responses,
        language
      );

      assessment.recommendations = recommendations;
      await assessment.save();

      // Update user statistics
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { totalAssessments: 1 },
        lastAssessmentDate: new Date()
      });

      return res.json({
        status: 'success',
        message: 'Assessment completed successfully',
        data: {
          assessment: assessment,
          nextQuestion: null,
          results: {
            totalScore: assessment.snamScores.totalScore,
            severityLevel: assessment.snamScores.severityLevel,
            criteriaScores: assessment.snamScores.criteriaScores,
            meetsCoreCriteria: assessment.snamScores.meetsCoreCriteria,
            llmAnalysis: assessment.llmAnalysis,
            recommendations: assessment.recommendations
          }
        }
      });
    }

    if (nextQuestionSelection.nextQuestionId !== 'ASSESSMENT_COMPLETE') {
      nextQuestion = getQuestionById(nextQuestionSelection.nextQuestionId);
      // Use rephrased question if available, otherwise use original
      questionText = nextQuestionSelection.rephrasedQuestion || nextQuestion?.text;
    }

    res.json({
      status: 'success',
      message: 'Response recorded successfully',
      data: {
        assessment: assessment,
        nextQuestion: nextQuestion ? {
          ...nextQuestion,
          displayText: questionText,
          isRephrased: nextQuestionSelection.isRephrased
        } : null,
        progress: assessment.progress,
        selectionReasoning: nextQuestionSelection.reasoning,
        snamMapping: snamMapping
      }
    });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit response',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/assessment/:sessionId
// @desc    Get assessment details
// @access  Private
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const assessment = await Assessment.findOne({
      sessionId,
      userId: req.user._id
    });

    if (!assessment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assessment not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        assessment: assessment
      }
    });
  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get assessment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/assessment/:sessionId
// @desc    Cancel/abandon an assessment
// @access  Private
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const assessment = await Assessment.findOne({
      sessionId,
      userId: req.user._id,
      status: 'in-progress'
    });

    if (!assessment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assessment not found or already completed'
      });
    }

    assessment.status = 'abandoned';
    assessment.metadata.endTime = new Date();
    assessment.metadata.duration = Math.round((assessment.metadata.endTime - assessment.metadata.startTime) / 1000);
    assessment.metadata.completionRate = Math.round((assessment.currentQuestionIndex / assessment.totalQuestions) * 100);

    await assessment.save();

    res.json({
      status: 'success',
      message: 'Assessment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel assessment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel assessment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
