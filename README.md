# MindScope - AI-Assisted Depression Detection System

An innovative AI-powered mental health assessment platform that uses conversational AI to screen for depression through natural language interactions, mapped to the clinically validated **SNAM Depression Scale** (11 criteria, 0-33 scoring) with confidence-weighted scoring, multimodal analysis, and personalized recovery recommendations.

## 🚀 Features

### Core Features
- **Conversational Assessment**: Natural, AI-powered conversations instead of rigid questionnaires
- **SNAM Depression Scale**: 11-criteria clinical assessment (0-33 scoring) mapped from ICD-11 and DSM-5
- **Confidence-Weighted Scoring**: LLM assigns confidence scores; low-confidence responses trigger clarification questions
- **Dynamic Question Selection**: AI selects next question based on covered criteria and conversation context
- **Multimodal Integration**: Speech Emotion Recognition (SER) detects underreporting through voice analysis
- **Recovery Agent System**: Specialized agents (Sleep, Mood, Activity, Worry, Energy, Nutrition) provide personalized interventions
- **Crisis Detection**: LLM-based context-aware detection (not keyword matching) with immediate support resources
- **Telugu Language Support**: Full bilingual support with culturally sensitive translations

### Technical Features
- **Real-time Chat Interface**: Intuitive conversation flow with controlled progression
- **Criterion Tracking**: Strict tracking ensures all 11 SNAM criteria are covered without repetition
- **External Tool Integrations**: Calendar, Vision, Weather, and Mindfulness tools for proactive support
- **Personalized Recommendations**: AI-generated lifestyle suggestions based on assessment results
- **Secure Authentication**: JWT-based authentication with encrypted data storage
- **User Dashboard**: Track assessment history, trends, and recovery progress

## 🧠 SNAM Depression Scale

The system uses the **SNAM Depression Scale** with 11 clinical criteria:

| Criterion | Category | Description |
|-----------|----------|-------------|
| C1 | Mood | Feeling sad or empty |
| C2 | Interest/Enjoyment | Loss of interest in activities |
| C3 | Self-worth | Feelings of worthlessness or guilt |
| C4 | Concentration | Difficulty focusing or making decisions |
| C5 | Worry/Anxiety | Excessive worry or nervousness |
| C6 | Scary Thoughts | Thoughts of self-harm (CRITICAL) |
| C7 | Sleep | Sleep disturbances |
| C8 | Appetite | Changes in eating patterns |
| C9 | Psychomotor | Slowed movement or restlessness |
| C10 | Energy | Fatigue or low energy |
| C11 | Functioning | Difficulty with daily tasks |

### Scoring Interpretation
- **0-13**: No Depression (healthy range)
- **14-16**: Mild Depression
- **17-20**: Moderate Depression
- **21-33**: Severe Depression

**Note**: Higher score = More depression symptoms = Worse condition

## 🛠 Tech Stack

### Backend
- **Node.js + Express**: RESTful API server
- **MongoDB**: Document database with Mongoose ODM
- **JWT**: Secure authentication and authorization
- **Gemini AI**: Google's LLM for natural language processing (gemini-2.5-flash)
- **Recovery Agents**: Specialized intervention agents with supervisor coordination

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Bilingual Support**: English and Telugu (తెలుగు)

### Speech Emotion Recognition (SER)
- **Python Flask**: SER microservice
- **Librosa**: Audio feature extraction
- **Emotion Detection**: Sad, fearful, angry, neutral classification

## 📋 Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- Google Gemini API key
- Python 3.8+ (for SER service)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/SoujanyaChatti/MindScope.git
cd MindScope
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mindscope?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key-here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# SER Service (optional)
SER_SERVICE_URL=http://localhost:5002
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the frontend directory:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5001/api

# Application Configuration
NEXT_PUBLIC_APP_NAME=MindScope
NEXT_PUBLIC_APP_DESCRIPTION=AI-Assisted Depression Detection System

# Feature Flags
NEXT_PUBLIC_ENABLE_SPEECH=true
NEXT_PUBLIC_ENABLE_MULTILINGUAL=true
```

Start the frontend development server:
```bash
npm run dev
```

### 4. SER Service Setup (Optional)

```bash
cd ser-service
pip install -r requirements.txt
python app.py
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001/api
- SER Service: http://localhost:5002

## 📁 Project Structure

```
MindScope/
├── backend/
│   ├── models/                    # MongoDB schemas
│   ├── routes/                    # API route handlers
│   ├── middleware/                # Authentication & validation
│   ├── services/
│   │   ├── geminiService.js       # LLM integration with SNAM prompts
│   │   ├── speechEmotionService.js # SER integration
│   │   ├── recoveryAgents/        # Specialized intervention agents
│   │   └── externalTools/         # Calendar, Vision, Weather, Mindfulness
│   ├── data/                      # Question bank & SNAM criteria
│   ├── tests/                     # Test suites
│   └── server.js                  # Express server setup
├── frontend/
│   ├── app/                       # Next.js App Router pages
│   ├── components/                # Reusable React components
│   ├── contexts/                  # Auth & Language contexts
│   ├── lib/                       # API client
│   └── types/                     # TypeScript definitions
├── ser-service/                   # Speech Emotion Recognition
│   ├── app.py                     # Flask SER server
│   └── requirements.txt           # Python dependencies
└── docs/                          # Architecture documentation
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Assessment
- `POST /api/assessment/start` - Start new assessment
- `POST /api/assessment/:sessionId/respond` - Submit response
- `GET /api/assessment/:sessionId` - Get assessment details
- `GET /api/assessment/history` - Get assessment history

### Recovery
- `GET /api/recovery/status` - Get recovery status
- `POST /api/recovery/start` - Start recovery program
- `POST /api/recovery/log` - Log recovery activity
- `GET /api/recovery/insights` - Get recovery insights

### External Tools
- `GET /api/tools/status` - Get available tools status
- `POST /api/tools/mindfulness/quick-calm` - Get quick calming technique
- `POST /api/tools/mindfulness/breathing` - Get breathing exercise

## 🧠 AI Integration

### Gemini AI Usage
The system uses Google's Gemini AI for:
- **Response Scoring**: Mapping free-text to SNAM scores (0-3) with confidence
- **Clarification Generation**: Creating follow-up questions for ambiguous responses
- **Dynamic Question Selection**: Choosing next question based on covered criteria
- **Crisis Detection**: Context-aware detection (understands denials vs. affirmations)
- **Clinical Analysis**: Generating comprehensive assessment summaries
- **Recommendations**: Creating personalized recovery plans

### Confidence-Weighted Scoring
- **0.9-1.0**: High confidence (specific frequency mentioned)
- **0.7-0.89**: Good confidence (clear emotional indicators)
- **0.5-0.69**: Low confidence (triggers clarification)
- **<0.5**: Very low (requires follow-up)

### Multimodal Integration (SER)
When voice input is detected:
1. Audio processed through SER service
2. Emotion classified (sad, fearful, angry, neutral)
3. If text score is low but voice shows distress → score adjusted upward
4. Detects underreporting in ~50% of cases

## 🤖 Recovery Agent System

Six specialized agents provide targeted interventions:

| Agent | Focus | Interventions |
|-------|-------|---------------|
| SleepAgent | C7 | Sleep diary, PMR exercises, sleep hygiene |
| MoodAgent | C1 | Mood tracking, gratitude practices, CBT techniques |
| ActivityAgent | C11 | Micro-tasks, activity scheduling, behavioral activation |
| WorryAgent | C5 | Worry time, grounding techniques, cognitive restructuring |
| EnergyAgent | C10 | Energy mapping, pacing strategies, fatigue management |
| NutritionAgent | C8 | Meal planning, hydration reminders, nutritional guidance |

**SupervisorAgent** coordinates all agents and manages inter-agent communication.

## 🔒 Security & Privacy

- **Data Encryption**: All sensitive data encrypted
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Comprehensive sanitization
- **Rate Limiting**: API rate limiting
- **CORS Protection**: Configured for frontend-backend communication
- **No Raw Logs**: Personal data not stored in logs

## 🚨 Crisis Support

The system includes LLM-based crisis detection:
- **Context-Aware**: Understands "I don't have thoughts like that" as a denial
- **High Confidence Threshold**: Only triggers at ≥0.7 confidence
- **Immediate Resources**: Provides crisis hotlines and support

### Crisis Resources
- National Suicide Prevention Lifeline: **988**
- Crisis Text Line: Text **HOME** to **741741**
- Emergency Services: **911**

## 🧪 Testing

### Run Paper Validation Tests
```bash
cd backend
node tests/paperValidation.js
```

Generates metrics for:
- Assessment performance & confidence estimation
- Multimodal (SER) integration effectiveness
- Agent activation patterns
- Crisis detection precision/recall
- Text-only vs multimodal comparison

### Run Live System Tests
```bash
node tests/liveSystemTest.js --full
```

## 📊 Assessment Flow

1. **Start Assessment**: User begins conversational assessment
2. **Dynamic Questions**: AI selects questions targeting uncovered SNAM criteria
3. **Confidence Scoring**: Each response scored with confidence level
4. **Clarification**: Low-confidence responses trigger follow-up questions
5. **Crisis Check**: LLM monitors for crisis indicators
6. **Multimodal Analysis**: Voice emotion integrated if available
7. **Completion**: All 11 criteria covered
8. **Results**: Score, severity, analysis, and recommendations
9. **Recovery**: Personalized agent-based intervention plan

## 🌐 Language Support

- **English**: Full support
- **Telugu (తెలుగు)**: Full support with cultural sensitivity
  - Questions translated naturally (not literally)
  - Cultural expressions recognized (e.g., "మనసు బాగోలేదు")

## 🚀 Deployment

### Backend (Render/Railway)
1. Connect repository
2. Set environment variables
3. Deploy

### Frontend (Vercel)
1. Connect repository
2. Set `NEXT_PUBLIC_API_URL`
3. Deploy

### SER Service (Optional)
Deploy as separate Python service if multimodal features needed.

## 📝 Research Validation

The system includes a comprehensive test suite for academic validation:

- **15 simulated user profiles** (5 mild, 5 moderate, 5 severe)
- **Multimodal adjustment analysis** (50% underreporting detection)
- **Agent activation patterns** by severity level
- **LaTeX-ready output** for paper inclusion

## ⚠️ Medical Disclaimer

**Important**: This tool is for screening purposes only and does not provide medical diagnosis, treatment, or replace professional medical advice. Users experiencing mental health concerns should consult with qualified healthcare professionals.

## 🆘 Support

For technical support:
- Create an issue in the repository
- Check the documentation in `/docs`

For mental health support:
- National Suicide Prevention Lifeline: **988**
- Crisis Text Line: Text **HOME** to **741741**
- Emergency Services: **911**

---

**MindScope** - Empowering mental health through AI-assisted assessment and personalized care.
