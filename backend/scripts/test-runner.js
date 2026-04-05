#!/usr/bin/env node

/**
 * Test Runner Script for MindScope Backend
 * 
 * This script provides additional test utilities and can be used to:
 * - Run tests with specific configurations
 * - Generate test reports
 * - Set up test environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${colors.cyan}Running: ${description}${colors.reset}`);
  log(`${colors.yellow}Command: ${command}${colors.reset}\n`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed successfully`, 'green');
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    process.exit(1);
  }
}

function checkEnvironment() {
  log('🔍 Checking test environment...', 'blue');
  
  // Check if .env.test exists
  const envTestPath = path.join(__dirname, '..', '.env.test');
  if (!fs.existsSync(envTestPath)) {
    log('⚠️  .env.test file not found. Creating default test environment...', 'yellow');
    
    const defaultEnvTest = `NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only
JWT_EXPIRE=1h
GEMINI_API_KEY=test-gemini-api-key
GEMINI_API_URL=https://test-gemini-api.com
MONGODB_URI=mongodb://localhost:27017/mindscope-test
PORT=3001`;
    
    fs.writeFileSync(envTestPath, defaultEnvTest);
    log('✅ Created .env.test file', 'green');
  }
  
  // Check if MongoDB is running (basic check)
  try {
    execSync('mongod --version', { stdio: 'pipe' });
    log('✅ MongoDB is available', 'green');
  } catch (error) {
    log('⚠️  MongoDB not found. Make sure MongoDB is installed and running.', 'yellow');
  }
}

function generateTestReport() {
  log('📊 Generating test report...', 'blue');
  
  const reportPath = path.join(__dirname, '..', 'test-report.json');
  const command = `npm run test:coverage -- --json --outputFile=${reportPath}`;
  
  try {
    execSync(command, { stdio: 'pipe' });
    log(`✅ Test report generated: ${reportPath}`, 'green');
  } catch (error) {
    log('⚠️  Could not generate JSON report, but tests may have passed', 'yellow');
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  log('🚀 MindScope Backend Test Runner', 'bright');
  log('================================', 'bright');
  
  checkEnvironment();
  
  switch (command) {
    case 'all':
      runCommand('npm test', 'All Tests');
      break;
      
    case 'unit':
      runCommand('npm run test:unit', 'Unit Tests');
      break;
      
    case 'integration':
      runCommand('npm run test:integration', 'Integration Tests');
      break;
      
    case 'chat':
      runCommand('npm run test:chat', 'Chat Tests');
      break;
      
    case 'coverage':
      runCommand('npm run test:coverage', 'Test Coverage');
      break;
      
    case 'watch':
      runCommand('npm run test:watch', 'Watch Mode');
      break;
      
    case 'ci':
      runCommand('npm run test:ci', 'CI Tests');
      break;
      
    case 'report':
      generateTestReport();
      break;
      
    case 'setup':
      log('🔧 Setting up test environment...', 'blue');
      runCommand('npm install', 'Install Dependencies');
      log('✅ Test environment setup complete', 'green');
      break;
      
    default:
      log('Available commands:', 'yellow');
      log('  all         - Run all tests', 'cyan');
      log('  unit        - Run unit tests only', 'cyan');
      log('  integration - Run integration tests only', 'cyan');
      log('  chat        - Run chat-related tests only', 'cyan');
      log('  coverage    - Run tests with coverage report', 'cyan');
      log('  watch       - Run tests in watch mode', 'cyan');
      log('  ci          - Run tests in CI mode', 'cyan');
      log('  report      - Generate test report', 'cyan');
      log('  setup       - Set up test environment', 'cyan');
      break;
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n🛑 Test runner interrupted', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n\n🛑 Test runner terminated', 'yellow');
  process.exit(0);
});

main();

