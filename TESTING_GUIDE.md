# 🧪 MindScope Testing Guide

## ✅ **System Status**
- **Backend**: ✅ Running on http://localhost:5001
- **Frontend**: ✅ Running on http://localhost:3000
- **MongoDB**: ✅ Connected successfully

## 🚀 **How to Access the Application**

### **1. Open the Application**
- **Frontend**: Open your browser and go to http://localhost:3000
- **Backend API**: Available at http://localhost:5001/api

### **2. Test the Dynamic Question Selection**

#### **Scenario 1: Normal Assessment Flow**
1. Go to http://localhost:3000
2. Register a new account or login
3. Click "Start Assessment"
4. Answer questions naturally - the system will dynamically select next questions based on your responses

#### **Scenario 2: Crisis Detection Test**
1. Start an assessment
2. In your first response, include crisis keywords like:
   - "I feel like ending it all"
   - "I want to die"
   - "Better off dead"
   - "jeena nahi chahta" (Hindi: I don't want to live)
3. **Expected Behavior**: System should immediately switch to crisis assessment questions

#### **Scenario 3: Cultural Expression Test**
1. Start an assessment
2. Use cultural expressions in your responses:
   - "Dil bhaari hai" (Hindi: Heart feels heavy)
   - "Mann nahi lagta" (Hindi: Mind doesn't engage)
   - "Udaas rehta hun" (Hindi: I remain sad)
3. **Expected Behavior**: System should recognize these as depression symptoms and map to appropriate PHQ-9 categories

#### **Scenario 4: Severity-Based Question Flow**
1. Start an assessment
2. Give responses indicating high severity (score 2-3) in specific areas:
   - "I constantly feel hopeless"
   - "I can't sleep at all"
   - "I have no energy for anything"
3. **Expected Behavior**: System should prioritize follow-up questions for those specific areas

## 🔍 **Testing the Improvements**

### **1. PHQ-9 Integration Testing**
- **Test**: Answer questions from different categories (initial, cultural, adaptive)
- **Expected**: All responses should be properly mapped to PHQ-9 categories and counted in the final score
- **Check**: Look at the assessment results to see if all categories are scored

### **2. Dynamic Question Selection Testing**
- **Test**: Give responses with different severity levels
- **Expected**: Question flow should adapt based on your responses
- **Check**: Notice how the system selects different types of questions based on your answers

### **3. Crisis Detection Testing**
- **Test**: Use crisis keywords in responses
- **Expected**: Immediate crisis intervention and priority questions
- **Check**: System should show crisis alert and provide support resources

### **4. Cultural Adaptation Testing**
- **Test**: Use Hindi expressions for depression symptoms
- **Expected**: System should recognize cultural expressions
- **Check**: PHQ-9 mapping should work with cultural expressions

## 📊 **API Testing**

### **Test Backend API Directly**

#### **1. Health Check**
```bash
curl http://localhost:5001/api/health
```

#### **2. Start Assessment**
```bash
curl -X POST http://localhost:5001/api/assessment/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### **3. Submit Response**
```bash
curl -X POST http://localhost:5001/api/assessment/SESSION_ID/respond \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionId": "initial_1", "userResponse": "I feel really sad and hopeless"}'
```

#### **4. Chat API Test**
```bash
curl -X POST http://localhost:5001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "I feel depressed"}'
```

## 🧪 **Automated Testing**

### **Run Backend Tests**
```bash
cd backend
npm test
```

### **Run Specific Test Suites**
```bash
# Test dynamic question selection
npm run test:chat

# Test assessment flow
npm run test:integration

# Test all units
npm run test:unit
```

## 🎯 **Key Features to Test**

### **1. Dynamic Question Selection**
- ✅ Questions adapt based on user responses
- ✅ Crisis detection overrides normal flow
- ✅ Severity-based question prioritization
- ✅ Cultural expression recognition

### **2. PHQ-9 Integration**
- ✅ All responses mapped to PHQ-9 categories
- ✅ Real-time score calculation
- ✅ Comprehensive category coverage
- ✅ Confidence-weighted scoring

### **3. Crisis Detection**
- ✅ Multi-language crisis keywords
- ✅ Immediate intervention
- ✅ Priority crisis questions
- ✅ Support resource provision

### **4. Cultural Adaptation**
- ✅ Hindi expression recognition
- ✅ Cultural context consideration
- ✅ Spiritual/religious question inclusion
- ✅ Community/family context

## 🐛 **Troubleshooting**

### **If Frontend Won't Start**
```bash
cd frontend
# Remove quarantine attributes
xattr -d com.apple.quarantine node_modules/.bin/*
# Reinstall dependencies
npm install
# Try again
npm run dev
```

### **If Backend Won't Connect to MongoDB**
- Make sure MongoDB is running: `brew services start mongodb-community`
- Check if MongoDB is accessible: `mongosh`
- Update .env file with correct MongoDB URI

### **If API Calls Fail**
- Check if both servers are running
- Verify CORS settings
- Check authentication tokens
- Look at browser console for errors

## 📝 **Test Scenarios Summary**

1. **Normal Flow**: Standard assessment with adaptive questions
2. **Crisis Detection**: Immediate crisis intervention
3. **Cultural Adaptation**: Hindi expression recognition
4. **Severity-Based Flow**: Questions adapt to response severity
5. **PHQ-9 Integration**: Comprehensive scoring across all question types

## 🎉 **Success Criteria**

The system is working correctly if:
- ✅ Questions change dynamically based on responses
- ✅ Crisis situations are detected immediately
- ✅ Cultural expressions are recognized
- ✅ PHQ-9 scores include all response categories
- ✅ Assessment flow adapts to user severity patterns

## 🚀 **Next Steps**

1. Test all scenarios above
2. Try different user personas (minimal, mild, moderate, severe depression)
3. Test with different cultural expressions
4. Verify crisis detection works reliably
5. Check PHQ-9 scoring accuracy

Your MindScope system is now ready for comprehensive testing! 🎯

