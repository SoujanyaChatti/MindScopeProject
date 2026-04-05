# MindScope Architecture Documentation

## System Overview

MindScope is an AI-assisted depression assessment and recovery application that uses the SNAM Depression Scale combined with intelligent recovery agents that can autonomously use external tools.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Assessment  │  │  Recovery   │  │    Chat     │  │  Tool Integrations  │ │
│  │    Flow     │  │  Dashboard  │  │  Interface  │  │  (Calendar, Vision) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (Node.js/Express)                         │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         RECOVERY AGENT SYSTEM                          │  │
│  │                                                                         │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                     SUPERVISOR AGENT                             │  │  │
│  │  │  • Cross-agent coordination    • Crisis detection               │  │  │
│  │  │  • Gemini function calling     • Weekly reflections             │  │  │
│  │  │  • Priority adjustment         • Escalation decisions           │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                  │                                     │  │
│  │          ┌───────────────────────┼───────────────────────┐            │  │
│  │          ▼                       ▼                       ▼            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Sleep     │  │  Activity   │  │    Mood     │  │   Worry     │  │  │
│  │  │   Agent     │  │   Agent     │  │   Agent     │  │   Agent     │  │  │
│  │  │             │  │  +Calendar  │  │ +Mindfulness│  │ +Mindfulness│  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  │                                                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐                                      │  │
│  │  │ Nutrition   │  │   Energy    │                                      │  │
│  │  │   Agent     │  │   Agent     │                                      │  │
│  │  │  +Vision    │  │  +Weather   │                                      │  │
│  │  └─────────────┘  └─────────────┘                                      │  │
│  │                                                                         │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    PROACTIVE ENGINE                              │  │  │
│  │  │  • Trigger-based actions      • Missed check-in detection       │  │  │
│  │  │  • SER emotion response       • Weather-adaptive suggestions    │  │  │
│  │  │  • Trend monitoring           • Automated scheduling            │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         TOOL REGISTRY                                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │  Calendar   │  │   Vision    │  │   Weather   │  │ Mindfulness │  │  │
│  │  │    Tool     │  │    Tool     │  │    Tool     │  │    Tool     │  │  │
│  │  │ (Google)    │  │ (Gemini)    │  │(OpenWeather)│  │  (Built-in) │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       SUPPORTING SERVICES                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Gemini    │  │    SER      │  │    Auth     │  │  Assessment │  │  │
│  │  │   Service   │  │   Service   │  │   Service   │  │   Service   │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │   MongoDB   │ │ SER Service │ │External APIs│
            │  (Database) │ │  (Python)   │ │  (Google,   │
            │             │ │             │ │ OpenWeather)│
            └─────────────┘ └─────────────┘ └─────────────┘
```

## Component Details

### 1. Assessment System

**SNAM Depression Scale (11 Criteria)**:
| # | Criterion | Score Range |
|---|-----------|-------------|
| 1 | Mood | 0-3 |
| 2 | Interest/Enjoyment | 0-3 |
| 3 | Self-worth | 0-3 |
| 4 | Concentration | 0-3 |
| 5 | Worry | 0-3 |
| 6 | Scary thoughts | 0-3 |
| 7 | Sleep | 0-3 |
| 8 | Eating | 0-3 |
| 9 | Psychomotor | 0-3 |
| 10 | Tiredness | 0-3 |
| 11 | Functioning | 0-3 |

**Severity Levels**:
- None: 0-13
- Mild: 14-16
- Moderate: 17-20
- Severe: 21-33

**Confidence-Weighted Scoring**:
```
weightedScore = ceil(totalWeightedScore / averageConfidence)
where:
  totalWeightedScore = Σ(criterionScore × confidence)
  averageConfidence = Σ(confidence) / 11
```

### 2. Recovery Agent System

#### Agent-Criteria Mapping:
| Agent | SNAM Criteria | External Tools |
|-------|---------------|----------------|
| Sleep | 7 (Sleep) | Calendar, Mindfulness |
| Activity | 2, 4, 9, 11 | Calendar, Weather |
| Mood | 1, 3 (Mood, Self-worth) | Mindfulness, Weather |
| Worry | 5 (Worry/Anxiety) | Mindfulness |
| Nutrition | 8 (Eating) | Vision |
| Energy | 10 (Tiredness) | Weather |

#### Supervisor Agent Capabilities:
- **Cross-agent coordination**: Influences between agents (e.g., sleep affects energy)
- **Gemini function calling** with 5 internal tools:
  - `adjustAgentPriority`: Change agent priority based on progress
  - `triggerCrossIntervention`: Joint interventions across agents
  - `escalateToHuman`: Crisis escalation
  - `scheduleReflection`: Weekly/daily reflections
  - `adjustInterventionLevel`: Move user between intensity levels

#### Proactive Engine Triggers:
| Trigger Type | Description | Example Action |
|--------------|-------------|----------------|
| MISSED_CHECKIN | No check-in for 24+ hours | Send gentle reminder |
| NEGATIVE_TREND | Declining scores over 5+ check-ins | Offer extra support |
| WEATHER_CHANGE | Significant weather shift | Adjust activity suggestions |
| SER_ALERT | Voice emotion detection | Trigger mindfulness exercise |
| SCHEDULED | Time-based triggers | Daily check-in reminders |
| STREAK_MILESTONE | Consistency achievements | Celebration message |

### 3. External Tool Integration

#### Tool Registry Pattern
Instead of MCP (Model Context Protocol), we use a custom registry:

```javascript
toolRegistry.registerTool('calendar', calendarTool, CalendarTool.getSchema());
toolRegistry.executeTool('calendar', 'createEvent', params, context);
```

**Why Custom Over MCP**:
1. MCP adds complexity (JSON-RPC, separate servers) not needed for our scope
2. Tight Gemini integration required
3. Limited, domain-specific tool set
4. Better control over error handling and retries

#### Calendar Tool (ActivityAgent)
```
Functions:
- createEvent: Schedule wellness activities
- checkAvailability: Find free time slots
- getUpcomingEvents: List scheduled events
- suggestTimeSlot: AI-suggested scheduling
- deleteEvent: Remove events

OAuth: Google Calendar API
```

#### Vision Tool (NutritionAgent)
```
Functions:
- analyzeMeal: Identify foods, estimate nutrition
- assessMealBalance: Check nutritional balance
- estimatePortionSize: Calorie estimation
- getMoodFoodAnalysis: Mood-food relationship
- suggestImprovements: Healthier alternatives

API: Gemini Vision (gemini-1.5-flash)
```

#### Weather Tool (EnergyAgent)
```
Functions:
- getCurrentWeather: Current conditions
- getForecast: Multi-day forecast
- getActivityRecommendation: Weather-appropriate activities
- getLightExposureAdvice: Natural light guidance
- getWeatherMoodImpact: Weather-mood correlation

API: OpenWeatherMap (free tier)
```

#### Mindfulness Tool (WorryAgent)
```
Functions:
- startSession: Begin meditation/breathing
- getGuidedSession: Pre-built guided sessions
- getBreathingExercise: Timed breathing patterns
- getQuickCalm: Acute anxiety techniques
- trackSession: Log completed sessions
- scheduleReminder: Set mindfulness reminders

API: Self-contained (no external dependency)
```

### 4. Speech Emotion Recognition (SER)

```
Flow:
Browser Audio → Node Backend → Python SER Service → Emotion Results

Python Service Components:
- SpeechBrain wav2vec2-IEMOCAP (emotion classification)
- librosa (prosody analysis)
- Flask API

Detected Emotions: angry, happy, sad, neutral
Prosody Features: pitch variation, energy, speech rate

Integration Points:
- Voice check-ins adjust sentiment scores
- High depression relevance triggers escalation
- Proactive mindfulness responses
```

### 5. Data Models

#### Recovery Schema
```javascript
{
  userId: ObjectId,
  assessmentId: ObjectId,
  status: 'active' | 'paused' | 'completed',
  activeAgents: [{
    agentName: String,
    isActive: Boolean,
    priority: 'high' | 'medium' | 'low',
    interventionLevel: 'light' | 'moderate' | 'intensive',
    checkInStreak: Number,
    totalCheckIns: Number,
    progressMetrics: {}
  }],
  checkIns: [{
    agentName: String,
    questionId: String,
    response: String,
    sentiment: String,
    score: Number,
    timestamp: Date,
    customData: {}
  }],
  microAssessments: [{
    agentName: String,
    assessmentType: String,
    rating: 1-5,
    timestamp: Date
  }],
  supervisorActions: [{
    type: String,
    agentName: String,
    reason: String,
    timestamp: Date
  }],
  crossInterventions: [{
    primaryAgent: String,
    supportingAgents: [String],
    status: String
  }],
  escalations: [{
    urgency: String,
    reason: String,
    status: String
  }],
  weeklyReflections: [{
    weekNumber: Number,
    summary: String,
    wins: [String],
    challenges: [{}],
    nextWeekGoals: [String]
  }]
}
```

### 6. API Endpoints

#### Recovery Core
- `GET /api/recovery/status` - Get recovery status
- `POST /api/recovery/activate` - Activate agents from assessment
- `GET /api/recovery/agents` - List active agents
- `POST /api/recovery/check-in` - Submit check-in response
- `POST /api/recovery/check-in/voice` - Voice check-in with SER

#### External Tools
- `GET /api/recovery/tools/status` - Tool availability
- `GET /api/recovery/tools/agent/:name` - Agent's available tools

#### Calendar
- `GET /api/recovery/tools/calendar/auth-url` - OAuth URL
- `POST /api/recovery/tools/calendar/schedule-activity` - Create event
- `GET /api/recovery/tools/calendar/suggest-times` - Find slots
- `GET /api/recovery/tools/calendar/upcoming` - List events

#### Vision
- `POST /api/recovery/tools/vision/analyze-meal` - Analyze photo
- `POST /api/recovery/tools/vision/meal-balance` - Balance check
- `POST /api/recovery/tools/vision/mood-food` - Mood impact

#### Weather
- `GET /api/recovery/tools/weather/current` - Current weather
- `GET /api/recovery/tools/weather/activity-recommendation` - Suggestions
- `GET /api/recovery/tools/weather/light-advice` - Light exposure
- `GET /api/recovery/tools/weather/mood-impact` - Weather mood effect

#### Mindfulness
- `POST /api/recovery/tools/mindfulness/start-session` - Start session
- `GET /api/recovery/tools/mindfulness/guided/:id` - Guided session
- `GET /api/recovery/tools/mindfulness/breathing/:pattern` - Breathing
- `GET /api/recovery/tools/mindfulness/quick-calm` - Acute anxiety help
- `POST /api/recovery/tools/mindfulness/track` - Log session

#### Proactive
- `POST /api/recovery/proactive/setup` - Configure triggers
- `POST /api/recovery/proactive/check` - Check/fire triggers
- `GET /api/recovery/proactive/triggers` - List triggers
- `DELETE /api/recovery/proactive/triggers/:id` - Disable trigger
- `POST /api/recovery/proactive/ser-response` - SER-triggered response

#### Supervisor
- `POST /api/recovery/supervisor/analyze` - Run supervisor analysis
- `GET /api/recovery/supervisor/insights` - Get insights
- `POST /api/recovery/reflection/weekly` - Generate weekly reflection

### 7. Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/mindscope

# Authentication
JWT_SECRET=your-jwt-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Speech Emotion Recognition
ENABLE_SER=true
SER_SERVICE_URL=http://localhost:5001

# Google Calendar
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# OpenWeatherMap
OPENWEATHER_API_KEY=your-api-key
```

### 8. File Structure

```
MindScope/
├── backend/
│   ├── models/
│   │   ├── Assessment.js
│   │   ├── Recovery.js
│   │   └── User.js
│   ├── routes/
│   │   ├── assessment.js
│   │   ├── recovery.js
│   │   └── auth.js
│   ├── services/
│   │   ├── geminiService.js
│   │   ├── speechEmotionService.js
│   │   ├── recoveryAgents/
│   │   │   ├── index.js (Orchestrator)
│   │   │   ├── baseAgent.js
│   │   │   ├── supervisorAgent.js
│   │   │   ├── proactiveEngine.js
│   │   │   ├── sleepAgent.js
│   │   │   ├── activityAgent.js
│   │   │   ├── moodAgent.js
│   │   │   ├── worryAgent.js
│   │   │   ├── nutritionAgent.js
│   │   │   └── energyAgent.js
│   │   └── externalTools/
│   │       ├── index.js
│   │       ├── toolRegistry.js
│   │       ├── calendarTool.js
│   │       ├── visionTool.js
│   │       ├── weatherTool.js
│   │       └── mindfulnessTool.js
│   └── middleware/
│       └── auth.js
├── frontend/
│   └── app/
│       └── dashboard/
│           ├── assessment/
│           └── recovery/
├── ser-service/
│   ├── app.py
│   └── requirements.txt
└── docs/
    └── ARCHITECTURE.md
```

### 9. Progression System

**Intervention Levels**:
- **Light**: Initial engagement, simple exercises
- **Moderate**: Regular practice, structured interventions
- **Intensive**: Deep work, comprehensive therapy techniques

**Mastery Criteria for Advancement**:
| Transition | Check-ins Required | Positive Rate | Avg Rating |
|------------|-------------------|---------------|------------|
| Light → Moderate | 7 | 50% | 3.0 |
| Moderate → Intensive | 14 | 60% | 3.5 |

### 10. Safety Features

- **Crisis Detection**: Keyword scanning + sentiment analysis + SER
- **Escalation Protocol**: Immediate → Urgent → Routine
- **Human Handoff**: Clear pathways to professional resources
- **Data Privacy**: User consent for voice analysis, secure storage
