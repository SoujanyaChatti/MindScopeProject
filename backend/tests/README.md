# MindScope Backend Test Suite

This directory contains comprehensive automated tests for the MindScope chat backend using Jest and Supertest.

## Test Structure

```
tests/
├── setup.js                    # Test configuration and setup
├── helpers/
│   └── testHelpers.js          # Test utilities and helper functions
├── routes/
│   └── chat.test.js           # Chat route tests
├── services/
│   └── geminiService.test.js  # Gemini AI service tests
├── middleware/
│   ├── auth.test.js           # Authentication middleware tests
│   └── validation.test.js     # Input validation tests
├── models/
│   └── User.test.js           # User model tests
├── integration/
│   └── chat.integration.test.js # End-to-end integration tests
└── README.md                   # This file
```

## Test Categories

### 1. Unit Tests
- **Routes**: Test individual API endpoints with mocked dependencies
- **Services**: Test business logic with mocked external APIs
- **Middleware**: Test authentication and validation logic
- **Models**: Test database operations and data validation

### 2. Integration Tests
- **Chat Flow**: Test complete user interactions with the chat system
- **Authentication**: Test token-based authentication flows
- **Error Handling**: Test system behavior under various error conditions

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Chat-related tests only
npm run test:chat

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode (no watch, with coverage)
npm run test:ci
```

## Test Configuration

### Environment Variables
Tests use a separate test environment with the following variables:
- `NODE_ENV=test`
- `MONGODB_URI=mongodb://localhost:27017/mindscope-test`
- `JWT_SECRET=test-jwt-secret-key`
- `GEMINI_API_KEY=test-gemini-api-key`

### Database
- Tests use a separate MongoDB database (`mindscope-test`)
- Database is cleaned up between test runs
- No production data is affected

## Test Coverage

The test suite covers:

### Chat Routes (100%)
- ✅ POST /api/chat/message - Send messages to AI
- ✅ GET /api/chat/resources - Get mental health resources
- ✅ GET /api/chat/faq - Get frequently asked questions
- ✅ POST /api/chat/feedback - Submit user feedback

### Gemini Service (100%)
- ✅ Content generation with various prompts
- ✅ PHQ-9 response mapping and scoring
- ✅ Next question selection logic
- ✅ Recommendation generation
- ✅ Mental health Q&A responses
- ✅ Error handling and fallback mechanisms

### Authentication Middleware (100%)
- ✅ Token validation and verification
- ✅ User authentication and authorization
- ✅ Optional authentication for public routes
- ✅ Token expiration handling
- ✅ Invalid token scenarios

### Validation Middleware (100%)
- ✅ User registration validation
- ✅ User login validation
- ✅ Profile update validation
- ✅ Assessment response validation
- ✅ Chat message validation
- ✅ Error message formatting

### User Model (100%)
- ✅ User creation and validation
- ✅ Password hashing and comparison
- ✅ Database queries and updates
- ✅ User statistics and analytics

## Test Data Management

### Test Helpers
The `testHelpers.js` file provides utilities for:
- Creating test users with valid data
- Generating JWT tokens for authentication
- Cleaning up test data between runs
- Mocking external API responses
- Creating mock request/response objects

### Database Cleanup
Tests automatically clean up data between runs to ensure:
- No test data pollution
- Consistent test results
- Isolation between test cases

## Mocking Strategy

### External APIs
- **Gemini AI**: Mocked to return predictable responses
- **Database**: Uses test database, no external dependencies
- **JWT**: Uses test secrets, no external token validation

### Benefits
- Fast test execution
- Predictable test results
- No external API costs
- Offline testing capability

## Error Testing

The test suite includes comprehensive error testing:

### API Errors
- Invalid request formats
- Missing required fields
- Authentication failures
- Service unavailability

### Database Errors
- Connection failures
- Invalid data operations
- Constraint violations

### Business Logic Errors
- Invalid user inputs
- Edge cases and boundary conditions
- Fallback mechanisms

## Performance Testing

### Load Testing
- Concurrent request handling
- Memory usage monitoring
- Response time validation

### Stress Testing
- High-volume message processing
- Database connection limits
- API rate limiting

## Continuous Integration

### GitHub Actions
Tests are configured to run on:
- Pull request creation
- Code pushes to main branch
- Scheduled nightly runs

### Test Reports
- Coverage reports generated automatically
- Test results published to CI dashboard
- Failure notifications sent to team

## Best Practices

### Test Writing
1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names explain what is being tested
3. **Single Responsibility**: Each test focuses on one behavior
4. **Independent Tests**: Tests don't depend on each other
5. **Clean Setup**: Fresh state for each test

### Test Maintenance
1. **Regular Updates**: Keep tests current with code changes
2. **Refactoring**: Improve test code quality over time
3. **Documentation**: Update test documentation with changes
4. **Performance**: Monitor and optimize test execution time

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Ensure MongoDB is running
mongod --dbpath /path/to/data

# Check connection string
echo $MONGODB_URI
```

#### Test Failures
```bash
# Run with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/routes/chat.test.js

# Debug mode
npm test -- --detectOpenHandles
```

#### Coverage Issues
```bash
# Generate detailed coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### Debug Mode
```bash
# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Contributing

### Adding New Tests
1. Follow existing test structure
2. Use descriptive test names
3. Include both positive and negative test cases
4. Add appropriate error handling tests
5. Update this documentation

### Test Standards
- All new features must include tests
- Test coverage should remain above 90%
- Tests should be fast and reliable
- Use meaningful assertions and error messages

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Testing](https://docs.mongodb.com/manual/core/testing/)
- [Express Testing](https://expressjs.com/en/advanced/best-practice-performance.html#testing)

