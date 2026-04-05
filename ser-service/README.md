# Speech Emotion Recognition (SER) Microservice

A Python microservice for detecting emotions from voice audio, designed to enhance depression assessment accuracy.

## Features

- **Emotion Detection**: Detects emotions (sad, angry, happy, neutral, fearful) from speech
- **Prosody Analysis**: Analyzes pitch variation, energy levels, and speech rate
- **Depression Markers**: Identifies vocal markers associated with depression (flat affect, slow speech, low energy)
- **100% Free**: Uses open-source models (SpeechBrain + librosa)

## Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Service

```bash
# Development
python app.py

# Production
gunicorn -w 2 -b 0.0.0.0:5001 app:app
```

## API Endpoints

### Health Check
```
GET /health
```
Response:
```json
{
  "status": "ok",
  "speechbrain_available": true,
  "version": "1.0.0"
}
```

### Analyze Audio
```
POST /analyze
Content-Type: multipart/form-data
Body: audio (file) - WAV audio file
```
Response:
```json
{
  "success": true,
  "emotions": {
    "sad": 0.65,
    "neutral": 0.20,
    "angry": 0.10,
    "happy": 0.05
  },
  "dominant_emotion": "sad",
  "prosody": {
    "pitch_variation": "low",
    "energy": "flat",
    "speech_rate": "slow"
  },
  "confidence": 0.85,
  "method": "speechbrain"
}
```

## Integration with MindScope

1. Set environment variables in your Node backend:
```env
ENABLE_SER=true
SER_SERVICE_URL=http://localhost:5001
```

2. The `speechEmotionService.js` in the backend will automatically:
   - Send audio to this service
   - Process emotion results
   - Adjust SNAM scores based on voice indicators

## Models Used

### SpeechBrain (Primary)
- Model: `speechbrain/emotion-recognition-wav2vec2-IEMOCAP`
- Training data: IEMOCAP dataset
- Emotions: angry, happy, sad, neutral
- License: Apache 2.0 (FREE)

### Librosa (Prosody Analysis)
- Extracts: pitch, energy, speech rate
- Used for: flat affect detection, psychomotor indicators
- License: ISC (FREE)

## Depression-Relevant Voice Markers

| Marker | Voice Feature | SNAM Relevance |
|--------|---------------|----------------|
| Flat affect | Low pitch variation, flat energy | C1 (mood), C9 (psychomotor) |
| Slow speech | Low speech rate | C9 (psychomotor), C10 (energy) |
| Sadness | Sad emotion detected | C1 (mood) |
| Low energy | Low vocal energy | C10 (tiredness) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5001 | Service port |
| USE_SPEECHBRAIN | true | Use SpeechBrain model (set false for lightweight mode) |

## Lightweight Mode

If SpeechBrain is too heavy for your deployment, set `USE_SPEECHBRAIN=false`. The service will use prosody-based emotion estimation which is less accurate but much lighter.
