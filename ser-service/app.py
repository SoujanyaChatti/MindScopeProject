"""
Speech Emotion Recognition (SER) Microservice

A Flask-based microservice that uses free, open-source models for
emotion recognition from speech audio.

Models used (all FREE):
- SpeechBrain's emotion recognition model (wav2vec2-based)
- librosa for audio feature extraction
- Alternative: pyAudioAnalysis for lightweight emotion detection

Run with: python app.py
Or with gunicorn: gunicorn -w 2 -b 0.0.0.0:5001 app:app
"""

import os
import io
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global model variable (lazy loading)
emotion_classifier = None
USE_SPEECHBRAIN = os.environ.get('USE_SPEECHBRAIN', 'true').lower() == 'true'


def load_speechbrain_model():
    """Load SpeechBrain emotion recognition model (free, HuggingFace)"""
    global emotion_classifier
    if emotion_classifier is None:
        try:
            from speechbrain.inference.classifiers import EncoderClassifier
            logger.info("Loading SpeechBrain emotion model...")
            emotion_classifier = EncoderClassifier.from_hparams(
                source="speechbrain/emotion-recognition-wav2vec2-IEMOCAP",
                savedir="pretrained_models/emotion-recognition"
            )
            logger.info("SpeechBrain model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load SpeechBrain model: {e}")
            emotion_classifier = None
    return emotion_classifier


def analyze_with_speechbrain(audio_path):
    """Analyze emotion using SpeechBrain (primary method)"""
    classifier = load_speechbrain_model()
    if classifier is None:
        return None

    try:
        # Classify the audio file
        out_prob, score, index, text_lab = classifier.classify_file(audio_path)

        # Convert to emotion probabilities
        # IEMOCAP labels: angry, happy, sad, neutral
        labels = ['angry', 'happy', 'sad', 'neutral']
        probs = out_prob.squeeze().numpy()

        emotions = {}
        for i, label in enumerate(labels):
            if i < len(probs):
                emotions[label] = float(probs[i])

        dominant = text_lab[0] if text_lab else 'neutral'

        return {
            'emotions': emotions,
            'dominant_emotion': dominant,
            'confidence': float(score.max()),
            'method': 'speechbrain'
        }
    except Exception as e:
        logger.error(f"SpeechBrain analysis failed: {e}")
        return None


def analyze_with_librosa(audio_path):
    """Analyze audio features using librosa (fallback/prosody analysis)"""
    try:
        import librosa

        # Load audio
        y, sr = librosa.load(audio_path, sr=16000)

        # Extract features
        # Pitch (F0)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_values = pitches[pitches > 0]
        pitch_mean = np.mean(pitch_values) if len(pitch_values) > 0 else 0
        pitch_std = np.std(pitch_values) if len(pitch_values) > 0 else 0

        # Energy/RMS
        rms = librosa.feature.rms(y=y)[0]
        energy_mean = np.mean(rms)
        energy_std = np.std(rms)

        # Speech rate (zero crossing rate as proxy)
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        zcr_mean = np.mean(zcr)

        # Spectral features
        spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))

        # Classify prosody
        prosody = {
            'pitch_variation': classify_variation(pitch_std, pitch_mean),
            'energy': classify_energy(energy_mean, energy_std),
            'speech_rate': classify_speech_rate(zcr_mean),
            'raw': {
                'pitch_mean': float(pitch_mean),
                'pitch_std': float(pitch_std),
                'energy_mean': float(energy_mean),
                'energy_std': float(energy_std),
                'zcr_mean': float(zcr_mean),
                'spectral_centroid': float(spectral_centroid)
            }
        }

        return prosody
    except Exception as e:
        logger.error(f"Librosa analysis failed: {e}")
        return None


def classify_variation(std, mean):
    """Classify pitch variation level"""
    if mean == 0:
        return 'unknown'
    ratio = std / mean if mean > 0 else 0
    if ratio < 0.1:
        return 'very_low'
    elif ratio < 0.2:
        return 'low'
    elif ratio < 0.4:
        return 'normal'
    else:
        return 'high'


def classify_energy(mean, std):
    """Classify vocal energy level"""
    if mean < 0.02:
        return 'flat'
    elif mean < 0.05:
        return 'low'
    elif mean < 0.15:
        return 'normal'
    else:
        return 'high'


def classify_speech_rate(zcr):
    """Classify speech rate based on zero crossing rate"""
    if zcr < 0.03:
        return 'slow'
    elif zcr < 0.08:
        return 'normal'
    else:
        return 'fast'


def simple_emotion_from_prosody(prosody):
    """Estimate emotion from prosody features (lightweight fallback)"""
    emotions = {
        'neutral': 0.4,
        'sad': 0.0,
        'angry': 0.0,
        'happy': 0.0,
        'fearful': 0.0
    }

    # Low energy + low pitch variation = potential sadness
    if prosody.get('energy') in ['flat', 'low']:
        emotions['sad'] += 0.3
        emotions['neutral'] -= 0.2

    if prosody.get('pitch_variation') in ['very_low', 'low']:
        emotions['sad'] += 0.2
        emotions['neutral'] -= 0.1

    if prosody.get('speech_rate') == 'slow':
        emotions['sad'] += 0.1

    # High energy + high variation = potential anger or happiness
    if prosody.get('energy') == 'high':
        emotions['angry'] += 0.2
        emotions['happy'] += 0.2

    if prosody.get('pitch_variation') == 'high':
        emotions['happy'] += 0.1
        emotions['angry'] += 0.1

    # Normalize
    total = sum(emotions.values())
    if total > 0:
        emotions = {k: v/total for k, v in emotions.items()}

    dominant = max(emotions, key=emotions.get)

    return {
        'emotions': emotions,
        'dominant_emotion': dominant,
        'confidence': max(emotions.values()),
        'method': 'prosody_estimation'
    }


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'speechbrain_available': USE_SPEECHBRAIN,
        'version': '1.0.0'
    })


@app.route('/analyze', methods=['POST'])
def analyze_audio():
    """
    Analyze audio for emotion

    Expects: multipart/form-data with 'audio' file
    Returns: JSON with emotion analysis
    """
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']

    # Save temporarily
    temp_path = '/tmp/temp_audio.wav'
    audio_file.save(temp_path)

    try:
        result = {
            'success': True,
            'emotions': {},
            'dominant_emotion': 'neutral',
            'prosody': {},
            'confidence': 0.5
        }

        # Try SpeechBrain first (more accurate)
        if USE_SPEECHBRAIN:
            sb_result = analyze_with_speechbrain(temp_path)
            if sb_result:
                result['emotions'] = sb_result['emotions']
                result['dominant_emotion'] = sb_result['dominant_emotion']
                result['confidence'] = sb_result['confidence']
                result['method'] = sb_result['method']

        # Always run librosa for prosody analysis
        prosody = analyze_with_librosa(temp_path)
        if prosody:
            result['prosody'] = prosody

            # If SpeechBrain failed, use prosody-based estimation
            if not result.get('emotions') or len(result['emotions']) == 0:
                fallback = simple_emotion_from_prosody(prosody)
                result['emotions'] = fallback['emotions']
                result['dominant_emotion'] = fallback['dominant_emotion']
                result['confidence'] = fallback['confidence']
                result['method'] = fallback['method']

        return jsonify(result)

    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500

    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting SER service on port {port}")
    logger.info(f"SpeechBrain mode: {USE_SPEECHBRAIN}")

    # Pre-load model in development
    if USE_SPEECHBRAIN:
        load_speechbrain_model()

    app.run(host='0.0.0.0', port=port, debug=False)
