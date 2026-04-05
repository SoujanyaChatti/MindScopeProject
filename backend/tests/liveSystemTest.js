/**
 * Live System Integration Tests
 *
 * This script tests the actual MindScope system by making API calls
 * to verify all components are working correctly.
 *
 * Run with: node tests/liveSystemTest.js
 *
 * Prerequisites:
 * - MongoDB running
 * - Backend server running on port 5001
 * - Environment variables configured
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

// Test user credentials (will be created if not exists)
const testUser = {
  email: `testuser${Date.now()}@gmail.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  dateOfBirth: '1990-01-15',
  gender: 'other'
};

let authToken = null;
let userId = null;

// Timing utilities
const timing = {
  start: null,
  measurements: []
};

function startTimer() {
  timing.start = Date.now();
}

function endTimer(operationName) {
  const duration = Date.now() - timing.start;
  timing.measurements.push({ operation: operationName, duration });
  return duration;
}

// ============================================
// API HELPER FUNCTIONS
// ============================================

async function apiCall(method, endpoint, data = null, includeAuth = true) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {}
  };

  if (includeAuth && authToken) {
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
    config.headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

// ============================================
// TEST FUNCTIONS
// ============================================

async function testHealthEndpoint() {
  console.log('\n📍 Testing Health Endpoint...');
  startTimer();

  const result = await apiCall('GET', '/health', null, false);
  const duration = endTimer('Health Endpoint');

  if (result.success && result.data.status === 'success') {
    console.log(`   ✅ Health check passed (${duration}ms)`);
    return true;
  } else {
    console.log(`   ❌ Health check failed: ${result.error}`);
    return false;
  }
}

async function testUserRegistration() {
  console.log('\n📍 Testing User Registration...');
  startTimer();

  const result = await apiCall('POST', '/auth/register', testUser, false);
  const duration = endTimer('User Registration');

  if (result.success) {
    console.log(`   ✅ User registered (${duration}ms)`);
    // Handle nested response structure: result.data.data.token or result.data.token
    authToken = result.data.data?.token || result.data.token;
    userId = result.data.data?.user?.id || result.data.data?.user?._id || result.data.user?._id || result.data.user?.id;
    return true;
  } else if (result.status === 400 && result.error.includes('exists')) {
    console.log(`   ℹ️ User already exists, trying login...`);
    return testUserLogin();
  } else {
    console.log(`   ❌ Registration failed: ${result.error}`);
    return false;
  }
}

async function testUserLogin() {
  console.log('\n📍 Testing User Login...');
  startTimer();

  const result = await apiCall('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  }, false);
  const duration = endTimer('User Login');

  if (result.success) {
    console.log(`   ✅ Login successful (${duration}ms)`);
    // Handle nested response structure
    authToken = result.data.data?.token || result.data.token;
    userId = result.data.data?.user?.id || result.data.data?.user?._id || result.data.user?._id || result.data.user?.id;
    return true;
  } else {
    console.log(`   ❌ Login failed: ${result.error}`);
    return false;
  }
}

async function testAssessmentStart() {
  console.log('\n📍 Testing Assessment Start...');
  startTimer();

  const result = await apiCall('POST', '/assessment/start', { forceNew: true });
  const duration = endTimer('Assessment Start');

  if (result.success) {
    // Handle nested response structure
    const data = result.data.data || result.data;
    console.log(`   ✅ Assessment started (${duration}ms)`);
    console.log(`   📋 Session ID: ${data.assessment?.sessionId}`);
    console.log(`   📋 First Question: ${data.nextQuestion?.displayText?.substring(0, 50)}...`);
    return result.data;
  } else {
    console.log(`   ❌ Assessment start failed: ${result.error}`);
    return null;
  }
}

async function testAssessmentResponse(sessionId, questionId, response) {
  startTimer();

  const result = await apiCall('POST', `/assessment/${sessionId}/respond`, {
    questionId,
    userResponse: response
  });
  const duration = endTimer(`Assessment Response (${questionId})`);

  if (result.success) {
    const snamMapping = result.data.data?.snamMapping || result.data.snamMapping;
    const confidence = snamMapping?.confidence;
    const score = snamMapping?.score;
    console.log(`   ✅ ${questionId}: Score=${score || 'N/A'}, Confidence=${confidence?.toFixed(2) || 'N/A'} (${duration}ms)`);
    return result.data.data || result.data;
  } else {
    console.log(`   ❌ Response failed: ${result.error}`);
    return null;
  }
}

async function testRecoveryStatus() {
  console.log('\n📍 Testing Recovery Status...');
  startTimer();

  const result = await apiCall('GET', '/recovery/status');
  const duration = endTimer('Recovery Status');

  if (result.success) {
    console.log(`   ✅ Recovery status retrieved (${duration}ms)`);
    console.log(`   📋 Has Active Recovery: ${result.data.hasActiveRecovery}`);
    if (result.data.recovery) {
      console.log(`   📋 Active Agents: ${result.data.recovery.activeAgents?.map(a => a.name).join(', ')}`);
    }
    return result.data;
  } else {
    console.log(`   ❌ Recovery status failed: ${result.error}`);
    return null;
  }
}

async function testToolsStatus() {
  console.log('\n📍 Testing External Tools Status...');
  startTimer();

  const result = await apiCall('GET', '/recovery/tools/status');
  const duration = endTimer('Tools Status');

  if (result.success) {
    console.log(`   ✅ Tools status retrieved (${duration}ms)`);
    console.log(`   📋 Available Tools:`);
    for (const [tool, available] of Object.entries(result.data.tools || {})) {
      console.log(`      - ${tool}: ${available ? '✓' : '✗'}`);
    }
    return result.data;
  } else {
    console.log(`   ❌ Tools status failed: ${result.error}`);
    return null;
  }
}

async function testMindfulnessQuickCalm() {
  console.log('\n📍 Testing Mindfulness Quick Calm...');
  startTimer();

  const result = await apiCall('GET', '/recovery/tools/mindfulness/quick-calm?intensity=moderate&context=at_home');
  const duration = endTimer('Mindfulness Quick Calm');

  if (result.success && result.data.success) {
    console.log(`   ✅ Quick calm retrieved (${duration}ms)`);
    console.log(`   📋 Primary Technique: ${result.data.data?.primary?.name}`);
    return result.data;
  } else {
    console.log(`   ❌ Quick calm failed: ${result.error || result.data?.error}`);
    return null;
  }
}

async function testBreathingExercise() {
  console.log('\n📍 Testing Breathing Exercise (Box Breathing)...');
  startTimer();

  const result = await apiCall('GET', '/recovery/tools/mindfulness/breathing/box?rounds=4');
  const duration = endTimer('Breathing Exercise');

  if (result.success && result.data.success) {
    console.log(`   ✅ Breathing exercise retrieved (${duration}ms)`);
    console.log(`   📋 Pattern: ${result.data.data?.pattern}`);
    console.log(`   📋 Total Duration: ${result.data.data?.totalDuration}s`);
    return result.data;
  } else {
    console.log(`   ❌ Breathing exercise failed: ${result.error || result.data?.error}`);
    return null;
  }
}

async function testGuidedSession() {
  console.log('\n📍 Testing Guided Session (Anxiety Relief 3min)...');
  startTimer();

  const result = await apiCall('GET', '/recovery/tools/mindfulness/guided/anxiety_relief_3min');
  const duration = endTimer('Guided Session');

  if (result.success && result.data.success) {
    console.log(`   ✅ Guided session retrieved (${duration}ms)`);
    console.log(`   📋 Session: ${result.data.data?.name}`);
    console.log(`   📋 Steps: ${result.data.data?.totalSteps}`);
    return result.data;
  } else {
    console.log(`   ❌ Guided session failed: ${result.error || result.data?.error}`);
    return null;
  }
}

async function runFullAssessment() {
  console.log('\n📍 Running Full Assessment Simulation...');

  const assessmentData = await testAssessmentStart();
  if (!assessmentData) return null;

  // Get sessionId and first question from the response
  const data = assessmentData.data || assessmentData;
  const sessionId = data.assessment?.sessionId;
  let nextQuestion = data.nextQuestion;

  if (!sessionId) {
    console.log('   ❌ No session ID returned from assessment start');
    return null;
  }

  console.log(`   📋 Session ID: ${sessionId}`);
  console.log('   Submitting responses based on dynamic questions...');

  // Prepare sample responses for different question types
  const sampleResponses = {
    mood: "I've been feeling quite low and sad most of the day",
    sleep: "Sleep has been terrible, waking up multiple times at night",
    energy: "Completely exhausted even after a full night's rest",
    appetite: "Not eating as much as usual, lost my appetite",
    concentration: "Having trouble concentrating on tasks at work",
    interest: "I don't enjoy things like I used to, activities feel pointless",
    self_esteem: "I feel okay about myself, could be better",
    guilt: "Sometimes feel like I'm letting people down",
    anxiety: "I worry constantly about everything",
    thoughts: "No thoughts of harming myself",
    activity: "Struggling to complete daily tasks at work",
    default: "I've been having a difficult time lately"
  };

  const results = [];
  let questionCount = 0;
  const maxQuestions = 15; // Safety limit

  while (nextQuestion && questionCount < maxQuestions) {
    questionCount++;
    const questionId = nextQuestion.id;
    const category = nextQuestion.category?.toLowerCase() || nextQuestion.snamCategory?.toLowerCase() || 'default';

    // Check if this is a clarification question
    const isClarification = questionId.startsWith('clarify_') || nextQuestion.category === 'clarification';

    // Pick appropriate response based on category
    let responseText;
    if (isClarification) {
      // For clarification questions, provide more detailed response
      responseText = "Yes, I've been experiencing this frequently over the past two weeks. It happens almost every day and significantly affects my daily life.";
    } else {
      responseText = sampleResponses[category] || sampleResponses.default;
    }

    // Build request body
    const requestBody = {
      questionId,
      userResponse: responseText
    };

    // If this is a clarification response, include the flag
    if (isClarification && results.length > 0) {
      requestBody.isClarificationResponse = true;
      const prevResult = results[results.length - 1];
      if (prevResult.originalMapping || prevResult.snamMapping) {
        requestBody.originalMapping = prevResult.originalMapping || prevResult.snamMapping;
      }
    }

    startTimer();
    const apiResult = await apiCall('POST', `/assessment/${sessionId}/respond`, requestBody);
    const duration = endTimer(`Assessment Response (${questionId})`);

    if (apiResult.success) {
      const resultData = apiResult.data.data || apiResult.data;
      const snamMapping = resultData.snamMapping;
      const confidence = snamMapping?.confidence;
      const score = snamMapping?.score;
      console.log(`   ✅ ${questionId}: Score=${score ?? 'N/A'}, Confidence=${confidence?.toFixed(2) || 'N/A'} (${duration}ms)`);

      results.push(resultData);
      nextQuestion = resultData.nextQuestion;

      // Check if assessment is complete
      if (!nextQuestion) {
        console.log('\n   Assessment completed by system');

        const finalResult = resultData.results || resultData.assessment?.snamScores;
        if (finalResult) {
          console.log(`   📊 Total Score: ${finalResult.totalScore}/33`);
          console.log(`   📊 Severity: ${finalResult.severityLevel}`);
        }
        return resultData;
      }
    } else {
      console.log(`   ❌ Response failed: ${apiResult.error}`);
      break;
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 200));
  }

  // If we exhausted questions but didn't get completion
  if (results.length > 0) {
    const lastResult = results[results.length - 1];
    return lastResult;
  }

  return null;
}

async function testProactiveSetup() {
  console.log('\n📍 Testing Proactive Trigger Setup...');
  startTimer();

  const result = await apiCall('POST', '/recovery/proactive/setup');
  const duration = endTimer('Proactive Setup');

  if (result.success) {
    console.log(`   ✅ Proactive triggers configured (${duration}ms)`);
    console.log(`   📋 Triggers Count: ${result.data.triggersCount}`);
    return result.data;
  } else {
    console.log(`   ❌ Proactive setup failed: ${result.error}`);
    return null;
  }
}

// ============================================
// PERFORMANCE SUMMARY
// ============================================

function printPerformanceSummary() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║              PERFORMANCE SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n${'Operation'.padEnd(35)} ${'Duration (ms)'.padEnd(15)}`);
  console.log('─'.repeat(50));

  timing.measurements.forEach(m => {
    console.log(`${m.operation.padEnd(35)} ${m.duration}`);
  });

  const totalTime = timing.measurements.reduce((sum, m) => sum + m.duration, 0);
  const avgTime = (totalTime / timing.measurements.length).toFixed(0);

  console.log('─'.repeat(50));
  console.log(`${'Total'.padEnd(35)} ${totalTime}ms`);
  console.log(`${'Average'.padEnd(35)} ${avgTime}ms`);
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         MINDSCOPE LIVE SYSTEM INTEGRATION TESTS          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nAPI Base: ${API_BASE}`);
  console.log(`Started: ${new Date().toISOString()}`);

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Health Check
  totalTests++;
  if (await testHealthEndpoint()) passedTests++;

  // Test 2: User Registration/Login
  totalTests++;
  if (await testUserRegistration()) passedTests++;

  if (!authToken) {
    console.log('\n❌ Cannot continue without authentication');
    return;
  }

  // Test 3: Tools Status
  totalTests++;
  if (await testToolsStatus()) passedTests++;

  // Test 4: Mindfulness Tools
  totalTests++;
  if (await testMindfulnessQuickCalm()) passedTests++;

  totalTests++;
  if (await testBreathingExercise()) passedTests++;

  totalTests++;
  if (await testGuidedSession()) passedTests++;

  // Test 5: Recovery Status (before assessment)
  totalTests++;
  if (await testRecoveryStatus()) passedTests++;

  // Test 6: Full Assessment Flow (optional - takes longer)
  const runFullTest = process.argv.includes('--full');
  if (runFullTest) {
    console.log('\n📋 Running full assessment flow (this may take a minute)...');
    totalTests++;
    const assessmentResult = await runFullAssessment();
    if (assessmentResult) {
      passedTests++;

      // Test 7: Recovery Status (after assessment)
      totalTests++;
      const recoveryStatus = await testRecoveryStatus();
      if (recoveryStatus) passedTests++;

      // Test 8: Proactive Setup
      totalTests++;
      if (await testProactiveSetup()) passedTests++;
    }
  } else {
    console.log('\n   ℹ️ Skipping full assessment test. Run with --full to include.');
  }

  // Print summary
  printPerformanceSummary();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                      TEST RESULTS                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n   Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${(passedTests/totalTests*100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n   ✅ All tests passed! System is functioning correctly.');
  } else {
    console.log(`\n   ⚠️ ${totalTests - passedTests} test(s) failed. Check the output above for details.`);
  }

  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

// Run tests
runAllTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
