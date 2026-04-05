/**
 * Speech Emotion Recognition (SER) Service
 *
 * This service handles voice emotion detection using a Python microservice
 * that runs SpeechBrain's pre-trained emotion recognition model (FREE).
 *
 * Architecture:
 * Browser → Audio Blob → Node Backend → Python SER Service → Emotion Results
 *
 * The Python service uses:
 * - SpeechBrain with Wav2Vec2 (HuggingFace, free)
 * - librosa for audio processing
 * - Flask for API
 */

const axios = require('axios');
const FormData = require('form-data');

class SpeechEmotionService {
  constructor() {
    // Python microservice URL (runs locally or can be deployed)
    this.serServiceUrl = process.env.SER_SERVICE_URL || 'http://localhost:5001';
    this.enabled = process.env.ENABLE_SER === 'true';

    // Emotion to depression indicator mapping
    this.emotionDepessionMapping = {
      'sad': { weight: 0.8, indicator: 'depressive' },
      'angry': { weight: 0.3, indicator: 'irritability' },
      'fearful': { weight: 0.5, indicator: 'anxiety' },
      'disgust': { weight: 0.4, indicator: 'negative_affect' },
      'neutral': { weight: 0.0, indicator: 'baseline' },
      'happy': { weight: -0.5, indicator: 'positive_affect' },
      'surprised': { weight: 0.0, indicator: 'baseline' }
    };
  }

  /**
   * Check if SER service is available
   */
  async isAvailable() {
    if (!this.enabled) return false;

    try {
      const response = await axios.get(`${this.serServiceUrl}/health`, {
        timeout: 2000
      });
      return response.data.status === 'ok';
    } catch (error) {
      console.warn('SER service not available:', error.message);
      return false;
    }
  }

  /**
   * Analyze audio for emotions
   * @param {Buffer} audioBuffer - Audio data buffer (WAV format preferred)
   * @returns {Object} Emotion analysis results
   */
  async analyzeAudio(audioBuffer) {
    if (!this.enabled) {
      return this.getDisabledResponse();
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });

      const response = await axios.post(
        `${this.serServiceUrl}/analyze`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000  // 30 second timeout for processing
        }
      );

      return this.processEmotionResults(response.data);
    } catch (error) {
      console.error('SER analysis failed:', error.message);
      return this.getErrorResponse(error);
    }
  }

  /**
   * Process raw emotion results into depression-relevant insights
   */
  processEmotionResults(rawResults) {
    const emotions = rawResults.emotions || {};
    const prosody = rawResults.prosody || {};

    // Calculate depression indicator score
    let depressionScore = 0;
    let totalWeight = 0;

    Object.entries(emotions).forEach(([emotion, confidence]) => {
      const mapping = this.emotionDepessionMapping[emotion];
      if (mapping) {
        depressionScore += mapping.weight * confidence;
        totalWeight += Math.abs(mapping.weight);
      }
    });

    const normalizedDepressionScore = totalWeight > 0
      ? Math.max(0, Math.min(1, (depressionScore / totalWeight + 1) / 2))
      : 0.5;

    // Analyze prosody for depression markers
    const prosodyIndicators = this.analyzeProsody(prosody);

    return {
      success: true,
      emotions: emotions,
      dominantEmotion: rawResults.dominant_emotion || this.getDominantEmotion(emotions),
      prosody: prosody,
      prosodyIndicators: prosodyIndicators,
      depressionRelevance: {
        score: normalizedDepressionScore,
        level: this.getDepressionLevel(normalizedDepressionScore),
        factors: this.getDepressionFactors(emotions, prosodyIndicators)
      },
      confidence: rawResults.confidence || 0.7,
      shouldAdjustTextScore: normalizedDepressionScore > 0.6 || prosodyIndicators.flatAffect
    };
  }

  /**
   * Analyze prosody features for depression markers
   */
  analyzeProsody(prosody) {
    return {
      flatAffect: prosody.pitch_variation === 'low' || prosody.energy === 'flat',
      slowSpeech: prosody.speech_rate === 'slow',
      lowEnergy: prosody.energy === 'low' || prosody.energy === 'flat',
      monotone: prosody.pitch_variation === 'very_low'
    };
  }

  /**
   * Get dominant emotion from emotion scores
   */
  getDominantEmotion(emotions) {
    let maxEmotion = 'neutral';
    let maxScore = 0;

    Object.entries(emotions).forEach(([emotion, score]) => {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion;
      }
    });

    return maxEmotion;
  }

  /**
   * Convert depression score to level
   */
  getDepressionLevel(score) {
    if (score < 0.3) return 'low';
    if (score < 0.5) return 'moderate';
    if (score < 0.7) return 'elevated';
    return 'high';
  }

  /**
   * Get specific depression factors from analysis
   */
  getDepressionFactors(emotions, prosodyIndicators) {
    const factors = [];

    if (emotions.sad > 0.5) factors.push('sadness_detected');
    if (emotions.angry > 0.4) factors.push('irritability_detected');
    if (emotions.fearful > 0.4) factors.push('anxiety_detected');
    if (prosodyIndicators.flatAffect) factors.push('flat_affect');
    if (prosodyIndicators.slowSpeech) factors.push('psychomotor_slowing');
    if (prosodyIndicators.lowEnergy) factors.push('low_vocal_energy');

    return factors;
  }

  /**
   * Adjust text-based SNAM score using voice emotion data
   */
  adjustScoreWithEmotion(textScore, emotionResults) {
    if (!emotionResults.success || !emotionResults.shouldAdjustTextScore) {
      return textScore;
    }

    const adjustmentFactor = emotionResults.depressionRelevance.score;

    // If voice indicates more distress than text, adjust score upward
    // Max adjustment: +1 point on SNAM scale
    if (adjustmentFactor > 0.6 && textScore < 3) {
      const adjustment = Math.min(1, (adjustmentFactor - 0.5) * 2);
      return Math.min(3, Math.round(textScore + adjustment));
    }

    return textScore;
  }

  /**
   * Response when SER is disabled
   */
  getDisabledResponse() {
    return {
      success: false,
      enabled: false,
      message: 'Speech emotion recognition is not enabled'
    };
  }

  /**
   * Response on error
   */
  getErrorResponse(error) {
    return {
      success: false,
      error: true,
      message: error.message || 'Failed to analyze audio'
    };
  }
}

module.exports = new SpeechEmotionService();
