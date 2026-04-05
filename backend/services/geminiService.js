const axios = require('axios');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    // Using gemini-1.5-flash as primary - it's free, fast, and has good token limits
    // Updated fallback models to currently available ones
    this.candidateApiUrls = [
      // Recommended and most cost-effective for high volume on the free tier:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      
      // Recommended all-around model (great balance of speed and intelligence):
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      
      // Most capable model (for complex tasks, also available on the free tier):
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
  
      // Older, but still functional models you originally listed:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
      
      // You can also use the aliases for the latest 1.5 versions:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent'
  ];
    // Confidence threshold for triggering clarification questions
    this.CONFIDENCE_THRESHOLD = 0.65;
    // Minimum confidence to accept a score without clarification
    this.MIN_ACCEPTABLE_CONFIDENCE = 0.5;
  }

  cleanJsonResponse(response) {
    let cleanResponse = response.trim();

    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanResponse = jsonMatch[0];
    }

    return cleanResponse;
  }

  async generateContent(prompt, maxTokens = 2000) {
    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not configured');
      }
      let lastErr;
      for (const baseUrl of this.candidateApiUrls) {
        try {
          const fullUrl = baseUrl.includes('?')
            ? `${baseUrl}&key=${this.apiKey}`
            : `${baseUrl}?key=${this.apiKey}`;

          if (!fullUrl.startsWith('http')) {
            continue;
          }

          const response = await axios.post(
            fullUrl,
            {
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                maxOutputTokens: Math.max(maxTokens, 4096),
                temperature: 0.2,
                topP: 0.9,
                topK: 40
              },
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
              ]
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 60000
            }
          );

          if (response.data && response.data.candidates && response.data.candidates[0]) {
            const candidate = response.data.candidates[0];

            if (candidate.finishReason === 'SAFETY') {
              throw new Error('Response blocked by safety filters');
            }

            // For MAX_TOKENS, still try to use partial response if it contains valid JSON
            const part = candidate.content?.parts?.[0];
            if (typeof part?.text === 'string' && part.text.trim().length > 0) {
              if (candidate.finishReason === 'MAX_TOKENS') {
                console.warn('Response was truncated, attempting to use partial response');
              }
              return part.text.trim();
            }
          }

          throw new Error('Invalid response format from Gemini API');
        } catch (err) {
          lastErr = err;
          const status = err.response?.status;
          const code = err.response?.data?.error?.code;
          if (status === 404 || code === 404 || status === 400) {
            continue;
          }
          break;
        }
      }
      throw lastErr || new Error('Gemini API call failed');
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);

      if (error.response?.data?.error?.code === 404) {
        throw new Error('AI service temporarily unavailable. Please try again later.');
      }

      throw new Error('Failed to generate content with Gemini API');
    }
  }

  // Map user response to SNAM score using LLM with confidence-weighted scoring
  async mapResponseToSNAM(questionText, userResponse, snamCategory, snamCriteria, language = 'en') {
    try {
      const prompt = `You are a clinical psychologist analyzing depression assessment responses using the SNAM Scale.
You MUST understand responses in English, Telugu (తెలుగు), Hindi, and transliterated versions.

Question: "${questionText}"
Category: ${snamCategory} (Criterion ${snamCriteria})
User Response: "${userResponse}"

SNAM SCORING GUIDELINES (be consistent):
Score 0 - NEVER/ABSENT: Clear denial, "no", "not at all", symptom explicitly absent
Score 1 - OCCASIONALLY/MILD: "sometimes", "a bit", "a little", "occasionally", mild symptoms, situational/reactive
Score 2 - FREQUENTLY/MODERATE: "often", "frequently", "most days", "usually", significant distress, persistent symptoms
Score 3 - VERY FREQUENTLY/SEVERE: "always", "constantly", "every day", "all the time", severe/pervasive symptoms

CONFIDENCE SCORING (be accurate about your certainty):
- 0.9-1.0: Response clearly indicates specific frequency/severity (e.g., "every day", "never", "not at all")
- 0.7-0.89: Response has clear emotional indicators but lacks specific frequency
- 0.5-0.69: Response is ambiguous, vague, or could be interpreted multiple ways
- 0.3-0.49: Response is unclear, off-topic, or requires clarification
- 0.0-0.29: Cannot determine meaning from response

IMPORTANT SCORING RULES:
1. If someone says "yes" with context explaining WHY (e.g., "yes because of job stress"), score based on SEVERITY not just acknowledgment
2. "a bit" or "a little" = Score 1
3. "definitely", "yes absolutely", "very much" = Score 2-3 depending on frequency mentioned
4. Cultural expressions indicating distress:
   - "dil bhari hai" (heavy heart) = Score 2
   - "mann nahi lagta" (mind not engaged) = Score 2
   - "bahut pareshaan" (very troubled) = Score 2-3
   - "మనసు బాగోలేదు" (mind not well) = Score 2
   - "చాలా బాధగా ఉంది" (feeling very sad) = Score 2-3
5. Job stress/situational stressors WITH emotional impact = at least Score 1-2
6. Sleep disturbances with anxiety symptoms = Score 2
7. Self-blame and inadequacy feelings = Score 2-3 if strong/persistent

AMBIGUITY INDICATORS (lower confidence if present):
- Short responses like "yes", "no", "okay" without context
- Responses that don't directly address the question
- Mixed signals (e.g., "sometimes good, sometimes bad")
- Unclear timeframes

${this.getSNAMCategoryCriteria(snamCategory)}

Respond with JSON only:
{
  "score": <0-3>,
  "confidence": <0.0-1.0>,
  "reasoning": "Brief explanation",
  "category": "${snamCategory}",
  "criteria": ${snamCriteria},
  "ambiguityFactors": ["list any factors that reduced confidence"],
  "needsClarification": <true/false>
}`;

      const response = await this.generateContent(prompt, 800);

      try {
        const cleanResponse = this.cleanJsonResponse(response);
        const parsed = JSON.parse(cleanResponse);

        if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 3) {
          throw new Error('Invalid score range');
        }

        if (typeof parsed.confidence !== 'number') {
          throw new Error('Invalid confidence type');
        }

        parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

        // Determine if clarification is needed based on confidence threshold
        const needsClarification = parsed.confidence < this.CONFIDENCE_THRESHOLD || parsed.needsClarification;

        return {
          score: Math.round(parsed.score),
          confidence: Math.round(parsed.confidence * 100) / 100,
          category: parsed.category || snamCategory,
          criteria: parsed.criteria || snamCriteria,
          reasoning: parsed.reasoning || 'No reasoning provided',
          ambiguityFactors: parsed.ambiguityFactors || [],
          needsClarification: needsClarification,
          isLowConfidence: parsed.confidence < this.MIN_ACCEPTABLE_CONFIDENCE
        };
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', response);
        return this.fallbackScoring(userResponse, snamCategory, snamCriteria);
      }
    } catch (error) {
      console.error('Error mapping response to SNAM:', error);
      return this.fallbackScoring(userResponse, snamCategory, snamCriteria);
    }
  }

  // Generate a clarification question when confidence is low
  async generateClarificationQuestion(originalQuestion, userResponse, snamCategory, ambiguityFactors, language = 'en') {
    try {
      const outputLanguage = language === 'te' ? 'Telugu' : 'English';

      const prompt = `You are a compassionate mental health counselor. The user's response was unclear and needs gentle clarification.

Original Question: "${originalQuestion}"
User's Response: "${userResponse}"
Category Being Assessed: ${snamCategory}
Ambiguity Factors: ${ambiguityFactors.join(', ') || 'Response lacks specificity'}

Generate a warm, non-judgmental follow-up question in ${outputLanguage} that:
1. Acknowledges what the user shared
2. Gently asks for more specific information about FREQUENCY or SEVERITY
3. Gives examples to help them understand what you're asking
4. Maintains conversational, caring tone

DO NOT:
- Sound clinical or interrogative
- Make the user feel they answered "wrong"
- Use medical jargon

Respond with JSON only:
{
  "clarificationQuestion": "Your warm follow-up question in ${outputLanguage}",
  "clarificationType": "frequency" or "severity" or "context",
  "examplesProvided": true/false
}`;

      const response = await this.generateContent(prompt, 500);

      try {
        const cleanResponse = this.cleanJsonResponse(response);
        const parsed = JSON.parse(cleanResponse);
        return {
          question: parsed.clarificationQuestion,
          type: parsed.clarificationType || 'context',
          hasExamples: parsed.examplesProvided || false
        };
      } catch (parseError) {
        // Fallback clarification questions
        const fallbacks = {
          en: `I'd like to understand better. When you say "${userResponse.substring(0, 30)}...", how often does this happen - would you say rarely, sometimes, often, or almost always?`,
          te: `నేను బాగా అర్థం చేసుకోవాలనుకుంటున్నాను. మీరు చెప్పినది ఎంత తరచుగా జరుగుతుంది - అరుదుగా, కొన్నిసార్లు, తరచుగా, లేదా దాదాపు ఎల్లప్పుడూ?`
        };
        return {
          question: fallbacks[language] || fallbacks.en,
          type: 'frequency',
          hasExamples: true
        };
      }
    } catch (error) {
      console.error('Error generating clarification question:', error);
      return null;
    }
  }

  // Recalculate score with clarification response (weighted average)
  async recalculateWithClarification(originalMapping, clarificationResponse, snamCategory, snamCriteria, language = 'en') {
    try {
      const prompt = `You are refining a depression assessment score based on a clarification response.

ORIGINAL ASSESSMENT:
- Score: ${originalMapping.score}/3
- Confidence: ${originalMapping.confidence}
- Reasoning: ${originalMapping.reasoning}

CLARIFICATION RESPONSE: "${clarificationResponse}"

Category: ${snamCategory} (Criterion ${snamCriteria})

Based on this NEW information, provide an UPDATED score. The clarification should help resolve ambiguity.

SCORING GUIDELINES:
Score 0 - NEVER/ABSENT: Clear denial, symptom absent
Score 1 - OCCASIONALLY/MILD: Sometimes, a bit, occasionally
Score 2 - FREQUENTLY/MODERATE: Often, most days, usually
Score 3 - VERY FREQUENTLY/SEVERE: Always, constantly, every day

Respond with JSON only:
{
  "refinedScore": <0-3>,
  "refinedConfidence": <0.0-1.0>,
  "refinedReasoning": "How clarification changed understanding",
  "scoreChanged": <true/false>,
  "confidenceImprovement": <how much confidence increased>
}`;

      const response = await this.generateContent(prompt, 500);

      try {
        const cleanResponse = this.cleanJsonResponse(response);
        const parsed = JSON.parse(cleanResponse);

        // Calculate weighted score if confidence improved significantly
        const confidenceWeight = Math.min(1, parsed.refinedConfidence / originalMapping.confidence);

        return {
          score: Math.round(parsed.refinedScore),
          confidence: Math.round(parsed.refinedConfidence * 100) / 100,
          category: snamCategory,
          criteria: snamCriteria,
          reasoning: parsed.refinedReasoning,
          wasRefined: true,
          originalScore: originalMapping.score,
          scoreChanged: parsed.scoreChanged,
          confidenceImprovement: parsed.confidenceImprovement || (parsed.refinedConfidence - originalMapping.confidence),
          needsClarification: false,
          isLowConfidence: false
        };
      } catch (parseError) {
        // If refinement fails, boost confidence slightly and keep original
        return {
          ...originalMapping,
          confidence: Math.min(0.75, originalMapping.confidence + 0.1),
          wasRefined: true,
          refinementFailed: true
        };
      }
    } catch (error) {
      console.error('Error recalculating with clarification:', error);
      return originalMapping;
    }
  }

  // Calculate confidence-weighted total score
  calculateConfidenceWeightedScore(responses) {
    if (!responses || responses.length === 0) return { weightedScore: 0, averageConfidence: 0 };

    const criteriaScores = new Map();
    const criteriaConfidences = new Map();

    responses.forEach(response => {
      if (response.snamMapping?.criteria) {
        const criteria = response.snamMapping.criteria;
        const score = response.snamMapping.score || 0;
        const confidence = response.snamMapping.confidence || 0.5;

        // Keep highest score per criteria, weighted by confidence
        const existingScore = criteriaScores.get(criteria) || 0;
        const existingConfidence = criteriaConfidences.get(criteria) || 0;

        // Prefer higher confidence scores, or higher scores at equal confidence
        if (confidence > existingConfidence || (confidence === existingConfidence && score > existingScore)) {
          criteriaScores.set(criteria, score);
          criteriaConfidences.set(criteria, confidence);
        }
      }
    });

    let totalWeightedScore = 0;
    let totalConfidence = 0;
    let count = 0;

    criteriaScores.forEach((score, criteria) => {
      const confidence = criteriaConfidences.get(criteria) || 0.5;
      // Weight the score by confidence
      totalWeightedScore += score * confidence;
      totalConfidence += confidence;
      count++;
    });

    // Normalize: divide by average confidence to get comparable score
    const averageConfidence = count > 0 ? totalConfidence / count : 0;
    const normalizedScore = averageConfidence > 0 ? Math.round(totalWeightedScore / averageConfidence) : 0;

    return {
      weightedScore: normalizedScore,
      rawWeightedScore: totalWeightedScore,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      criteriaCount: count,
      lowConfidenceCriteria: Array.from(criteriaConfidences.entries())
        .filter(([_, conf]) => conf < this.CONFIDENCE_THRESHOLD)
        .map(([criteria, conf]) => ({ criteria, confidence: conf }))
    };
  }

  // Dynamic question selection with LLM - rephrases and chooses contextually
  // previousContext: { trend, areasOfConcern, lastScore } from previous assessments
  async selectNextQuestion(allQuestions, askedQuestions, userResponses, language = 'en', previousContext = null) {
    try {
      // Check for crisis indicators first
      const crisisIndicators = this.detectCrisisIndicators(userResponses);
      if (crisisIndicators.isCrisis) {
        const crisisQuestion = this.selectCrisisQuestion(allQuestions, askedQuestions);
        if (crisisQuestion) {
          return {
            nextQuestionId: crisisQuestion.id,
            rephrasedQuestion: crisisQuestion.text,
            reasoning: `Crisis detected: ${crisisIndicators.reason}. Prioritizing safety assessment.`,
            isRephrased: false
          };
        }
      }

      // Build conversation context
      const conversationContext = askedQuestions.map((q, index) => {
        const response = userResponses[index];
        return {
          questionId: q.id,
          questionText: q.text,
          category: q.snamCategory || q.category,
          criteria: q.snamCriteria,
          userResponse: response.userResponse,
          score: response.snamMapping?.score || 0
        };
      });

      // Determine covered and uncovered criteria
      const coveredCriteria = new Set();
      const criteriaScores = new Map();

      userResponses.forEach(response => {
        if (response.snamMapping?.criteria) {
          coveredCriteria.add(response.snamMapping.criteria);
          const current = criteriaScores.get(response.snamMapping.criteria) || 0;
          criteriaScores.set(response.snamMapping.criteria, Math.max(current, response.snamMapping.score || 0));
        }
      });

      const allSNAMCriteria = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const uncoveredCriteria = allSNAMCriteria.filter(c => !coveredCriteria.has(c));

      // Get available questions
      const askedIds = askedQuestions.map(q => q.id);
      const availableQuestions = allQuestions.filter(q => !askedIds.includes(q.id));

      if (availableQuestions.length === 0 || (uncoveredCriteria.length === 0 && userResponses.length >= 11)) {
        return { nextQuestionId: 'ASSESSMENT_COMPLETE', reasoning: 'All criteria covered' };
      }

      const outputLanguage = language === 'te' ? 'Telugu' : 'English'

      // Include more context for better conversational flow
      const recentContext = conversationContext.slice(-4).map(item =>
        `Q: ${item.questionText}\nA: "${item.userResponse}" (Score: ${item.score}/3, Category: ${item.category})`
      ).join('\n');

      // Build previous assessment context string if available
      const previousContextStr = previousContext ? `
PREVIOUS ASSESSMENT HISTORY:
- Overall trend: ${previousContext.trend}
- Last score: ${previousContext.lastScore || 'N/A'}/33
- Persistent areas of concern: ${previousContext.areasOfConcern?.join(', ') || 'none identified'}
Note: Prioritize asking about persistent concern areas to track progress.` : '';

      // Build detailed criteria status tracking with scores and confidence
      const criteriaStatus = {};
      allSNAMCriteria.forEach(c => {
        criteriaStatus[c] = { covered: false, score: null, confidence: null, complete: false };
      });

      userResponses.forEach(response => {
        if (response.snamMapping?.criteria) {
          const c = response.snamMapping.criteria;
          const score = response.snamMapping.score ?? 0;
          const conf = response.snamMapping.confidence ?? 0.5;

          // Update if this is a better (higher confidence) response for this criterion
          if (!criteriaStatus[c].covered || conf > (criteriaStatus[c].confidence || 0)) {
            criteriaStatus[c] = {
              covered: true,
              score: score,
              confidence: conf,
              // Mark complete if we have a valid score with decent confidence
              complete: conf >= 0.65 || (score >= 2 && conf >= 0.5)
            };
          }
        }
      });

      const completeCriteria = Object.entries(criteriaStatus)
        .filter(([_, v]) => v.complete)
        .map(([k, v]) => `C${k}(score=${v.score})`);

      const incompleteCriteria = Object.entries(criteriaStatus)
        .filter(([_, v]) => !v.complete)
        .map(([k, _]) => parseInt(k));

      // Filter available questions to ONLY target incomplete criteria
      const questionsForIncompleteCriteria = availableQuestions.filter(q =>
        incompleteCriteria.includes(q.snamCriteria)
      );

      const filteredQuestions = questionsForIncompleteCriteria.length > 0
        ? questionsForIncompleteCriteria
        : availableQuestions;

      const limitedQuestionsFiltered = filteredQuestions.slice(0, 10).map(q =>
        `${q.id}: "${q.text}" [${q.snamCategory}, C${q.snamCriteria || '?'}]`
      ).join('\n');

      const prompt = `You are conducting a depression assessment using the SNAM scale through conversational dialogue.

Language: ${outputLanguage}
${previousContextStr}

CURRENT CONVERSATION (last 4 exchanges):
${recentContext}

═══════════════════════════════════════════════════════════════════
                    CRITERION TRACKING STATUS
═══════════════════════════════════════════════════════════════════

✅ COMPLETED CRITERIA (NEVER ASK ABOUT THESE AGAIN):
${completeCriteria.join(', ') || 'None yet'}

❌ INCOMPLETE CRITERIA (MUST COVER THESE):
${incompleteCriteria.map(c => `C${c}`).join(', ') || 'All complete!'}

CRITERIA REFERENCE:
C1=Mood/Sadness, C2=Interest/Enjoyment, C3=Self-worth/Guilt,
C4=Concentration, C5=Worry/Anxiety, C6=Scary thoughts/Self-harm,
C7=Sleep, C8=Appetite/Eating, C9=Psychomotor changes,
C10=Energy/Tiredness, C11=Daily functioning

═══════════════════════════════════════════════════════════════════
                         STRICT RULES
═══════════════════════════════════════════════════════════════════

1. ⛔ NEVER re-ask about a COMPLETED criterion - they are DONE
2. ✅ ONLY select questions for INCOMPLETE criteria listed above
3. 📋 PRIORITY ORDER for incomplete criteria:
   - C6 (safety) if incomplete → ask FIRST
   - C1, C2 (core) if incomplete
   - C10 (energy), C8 (appetite), C11 (functioning), C9 (psychomotor)
   - C3, C4, C5, C7
4. 🎯 ALL 11 criteria must be complete before assessment ends
5. 📝 If user mentions something new (e.g., "I'm exhausted"), credit C10

AVAILABLE QUESTIONS (ONLY for incomplete criteria):
${limitedQuestionsFiltered}

YOUR TASK:
1. IDENTIFY which criterion from the INCOMPLETE list to target
2. SELECT the most appropriate next question based on:
   - Priority: Crisis indicators (C6) > Core criteria (C1 mood, C2 interest) > Persistent concern areas from history > High-scoring areas > Remaining uncovered criteria
   - Context: If the user mentioned a specific topic (e.g., sleep problems, job stress), choose a question that relates to it when possible
3. FRAME the question conversationally:
   - Consider what the user just said and use it to naturally lead into the next question
   - Keep the question clear and focused on one SNAM criterion
   - Use empathetic, natural language appropriate for a mental health conversation

Return "ASSESSMENT_COMPLETE" ONLY when incomplete criteria list is empty.

JSON response:
{
  "nextQuestionId": "question id",
  "targetCriterion": <number 1-11>,
  "rephrasedQuestion": "conversational question in ${outputLanguage}",
  "isRephrased": true,
  "reasoning": "Which incomplete criterion this targets"
}`;

      const response = await this.generateContent(prompt, 1500);

      try {
        const cleanResponse = this.cleanJsonResponse(response);
        const parsed = JSON.parse(cleanResponse);

        if (!parsed.nextQuestionId) {
          throw new Error('No next question ID provided');
        }

        return {
          nextQuestionId: parsed.nextQuestionId,
          rephrasedQuestion: parsed.rephrasedQuestion || null,
          isRephrased: parsed.isRephrased || false,
          reasoning: parsed.reasoning || 'No reasoning provided',
          focusArea: parsed.focusArea || 'coverage'
        };
      } catch (parseError) {
        console.error('Failed to parse question selection:', response);
        return this.intelligentFallbackSelection(allQuestions, askedQuestions, userResponses);
      }
    } catch (error) {
      console.error('Error selecting next question:', error);
      return this.intelligentFallbackSelection(allQuestions, askedQuestions, userResponses);
    }
  }

  // Generate comprehensive analysis combining score + LLM opinion
  // previousContext: { trend, areasOfConcern, lastScore } from previous assessments
  async generateAnalysis(totalScore, severityLevel, userResponses, meetsCoreCriteria, language = 'en', previousContext = null) {
    try {
      const responsesText = userResponses.map(r =>
        `Q: ${r.questionText}\nA: "${r.userResponse}"\nScore: ${r.snamMapping?.score || 0}/3`
      ).join('\n\n');

      // Build historical context string with correct trend interpretation
      let historyStr = '';
      if (previousContext) {
        const prevScore = previousContext.lastScore;
        // CRITICAL: Higher score = MORE depression = WORSE
        // Lower score = LESS depression = BETTER
        let trendDescription = '';
        if (prevScore !== null && prevScore !== undefined) {
          if (totalScore < prevScore) {
            trendDescription = `Score decreased from ${prevScore} to ${totalScore} — this is IMPROVEMENT (less depression)`;
          } else if (totalScore > prevScore) {
            trendDescription = `Score increased from ${prevScore} to ${totalScore} — this is WORSENING (more depression symptoms)`;
          } else {
            trendDescription = `Score unchanged at ${totalScore} — STABLE`;
          }
        }

        historyStr = `
ASSESSMENT HISTORY (for trend analysis):
- Previous score: ${prevScore || 'N/A'}/33
- Current score: ${totalScore}/33
- Trend: ${trendDescription}
- Persistent concerns: ${previousContext.areasOfConcern?.join(', ') || 'none'}

⚠️ CRITICAL SCORING INTERPRETATION:
- HIGHER score = MORE depression symptoms = WORSE condition
- LOWER score = FEWER depression symptoms = BETTER/IMPROVING
- A score going from 12 → 16 is WORSENING, not improvement!`;
      }

      const outputLanguage = language === 'te' ? 'Telugu (తెలుగు)' : 'English'
      const prompt = `You are a clinical psychologist analyzing a depression assessment using the SNAM Depression Scale.
OUTPUT LANGUAGE: Provide all analysis text in ${outputLanguage}. Use culturally appropriate and sensitive language.
${historyStr}

SNAM SCORING RESULTS:
- Total Score: ${totalScore}/33
- Severity Level: ${severityLevel}
- Meets Core Criteria (mood or interest affected): ${meetsCoreCriteria ? 'Yes' : 'No'}

═══════════════════════════════════════════════════════════════════
CRITICAL - SCORE INTERPRETATION (DO NOT GET THIS WRONG):
═══════════════════════════════════════════════════════════════════
- 0-13: No Depression (GOOD - healthy range)
- 14-16: Mild Depression (concerning)
- 17-20: Moderate Depression (significant concern)
- 21-33: Severe Depression (serious concern)

⚠️ REMEMBER: HIGHER SCORE = WORSE CONDITION
- Score going UP = symptoms WORSENING
- Score going DOWN = symptoms IMPROVING
═══════════════════════════════════════════════════════════════════

Note: For a depressive disorder diagnosis, either criterion 1 (mood) or criterion 2 (interest) must be present and score > 0.

CONVERSATION HISTORY:
${responsesText}

Provide a comprehensive clinical analysis considering:
1. The numerical scores from each criterion
2. The qualitative information from responses
3. Risk factors and warning signs
4. Protective factors observed
5. Overall clinical impression

Respond with JSON only:
{
  "overallAssessment": "Comprehensive 2-3 sentence clinical summary combining score interpretation with qualitative observations",
  "keyObservations": ["Observation 1", "Observation 2", "Observation 3"],
  "riskFactors": ["Risk factor if any"],
  "protectiveFactors": ["Protective factor if any"],
  "confidenceLevel": 0.85,
  "clinicalNotes": "Additional notes for consideration"
}`;

      const response = await this.generateContent(prompt, 1200);

      try {
        const cleanResponse = this.cleanJsonResponse(response);
        return JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('Failed to parse analysis:', response);
        return this.getFallbackAnalysis(totalScore, severityLevel);
      }
    } catch (error) {
      console.error('Error generating analysis:', error);
      return this.getFallbackAnalysis(totalScore, severityLevel);
    }
  }

  // Generate recommendations based on score and analysis
  async generateRecommendations(snamScore, severityLevel, userResponses, language = 'en') {
    try {
      const responsesText = userResponses.map(r => `${r.questionText}: ${r.userResponse}`).join('\n');

      const outputLanguage = language === 'te' ? 'Telugu (తెలుగు)' : 'English'
      const prompt = `You are a mental health counselor providing recommendations based on SNAM Depression Scale results.
OUTPUT LANGUAGE: Provide all recommendation text (titles, descriptions, reasoning) in ${outputLanguage}. Use culturally appropriate language.

SNAM Total Score: ${snamScore}/33
Severity Level: ${severityLevel}

SCORING INTERPRETATION:
- 0-13: No Depression
- 14-16: Mild Depression
- 17-20: Moderate Depression
- 21-33: Severe Depression

User Responses:
${responsesText}

Provide personalized recommendations:

1. Lifestyle Changes (prioritize based on responses)
2. Professional Help (based on severity)
3. Follow-up schedule

For each recommendation:
- Category (sleep/exercise/diet/social/mindfulness/professional)
- Title (brief, actionable)
- Description (specific, helpful)
- Priority (high/medium/low)
- Estimated Impact (high/medium/low)

IMPORTANT: Respond ONLY with valid JSON.

{
  "lifestyleChanges": [
    {
      "category": "sleep",
      "title": "Brief title",
      "description": "Detailed description",
      "priority": "high",
      "estimatedImpact": "high"
    }
  ],
  "professionalHelp": {
    "recommended": true,
    "urgency": "consider",
    "reasoning": "Why this recommendation",
    "resources": ["Resource 1", "Resource 2"]
  },
  "followUpSchedule": {
    "suggestedInterval": 7,
    "reasoning": "Why this interval"
  }
}`;

      const response = await this.generateContent(prompt, 1500);

      try {
        const cleanResponse = this.cleanJsonResponse(response);
        return JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('Failed to parse recommendations:', response);
        return this.getFallbackRecommendations(severityLevel);
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return this.getFallbackRecommendations(severityLevel);
    }
  }

  // LLM-based crisis detection - much more accurate than keyword matching
  async detectCrisisIndicatorsWithLLM(userResponses) {
    try {
      // Only check recent responses to reduce token usage
      const recentResponses = userResponses.slice(-5);

      if (recentResponses.length === 0) {
        return { isCrisis: false, reason: 'No responses to analyze', severity: 'low' };
      }

      const responsesText = recentResponses.map(r =>
        `Q: ${r.questionText}\nA: "${r.userResponse}"`
      ).join('\n\n');

      const prompt = `You are a clinical psychologist assessing crisis risk in a mental health screening.

CONVERSATION:
${responsesText}

TASK: Determine if this person is in CRISIS (immediate risk of self-harm or suicide).

IMPORTANT DISTINCTIONS:
- Someone DENYING self-harm thoughts ("no", "why would I", "I'm happy") is NOT a crisis
- Someone expressing frustration or stress is NOT automatically a crisis
- A crisis requires ACTIVE suicidal ideation or intent to self-harm

CRISIS INDICATORS (must be AFFIRMED, not denied):
- Expressing desire to die or end life
- Describing plans for self-harm
- Feeling like a burden to others (when stated sincerely, not denied)
- Expressing hopelessness about the future (sincere, not denied)

Respond with JSON only:
{
  "isCrisis": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this is or isn't a crisis",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "specificConcern": "What specific statement raised concern, if any"
}`;

      const response = await this.generateContent(prompt, 500);

      try {
        const cleanResponse = this.cleanJsonResponse(response);
        const parsed = JSON.parse(cleanResponse);

        return {
          isCrisis: parsed.isCrisis === true && parsed.confidence >= 0.7,
          reason: parsed.reasoning || 'LLM analysis',
          severity: parsed.severity || 'low',
          confidence: parsed.confidence || 0,
          specificConcern: parsed.specificConcern || null
        };
      } catch (parseError) {
        console.error('Failed to parse crisis detection response:', response);
        // Fall back to score-based detection only
        return this.detectCrisisFromScores(userResponses);
      }
    } catch (error) {
      console.error('Error in LLM crisis detection:', error);
      // Fall back to score-based detection
      return this.detectCrisisFromScores(userResponses);
    }
  }

  // Fallback: Only use SNAM scores for crisis detection (no keyword matching)
  detectCrisisFromScores(userResponses) {
    for (const response of userResponses) {
      // Only flag crisis if scary-thoughts criterion has HIGH score (2-3)
      if (response.snamMapping?.category === 'scary-thoughts' && response.snamMapping?.score >= 2) {
        return {
          isCrisis: true,
          reason: 'High scary thoughts score detected by LLM scoring',
          severity: 'critical'
        };
      }
    }
    return { isCrisis: false, reason: 'No crisis indicators in scores', severity: 'low' };
  }

  // Synchronous version for backward compatibility - uses score-based detection
  detectCrisisIndicators(userResponses) {
    return this.detectCrisisFromScores(userResponses);
  }

  selectCrisisQuestion(allQuestions, askedQuestions) {
    const askedIds = askedQuestions.map(q => q.id);
    const crisisQuestions = allQuestions.filter(q =>
      q.category === 'crisis' && !askedIds.includes(q.id)
    );

    if (crisisQuestions.length > 0) {
      return crisisQuestions.sort((a, b) => {
        const priorityOrder = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
      })[0];
    }

    return null;
  }

  intelligentFallbackSelection(allQuestions, askedQuestions, userResponses) {
    const askedIds = askedQuestions.map(q => q.id);
    const availableQuestions = allQuestions.filter(q => !askedIds.includes(q.id));

    if (availableQuestions.length === 0) {
      return { nextQuestionId: 'ASSESSMENT_COMPLETE', reasoning: 'All questions have been asked' };
    }

    // Check for crisis
    const crisisIndicators = this.detectCrisisIndicators(userResponses);
    if (crisisIndicators.isCrisis) {
      const crisisQuestion = this.selectCrisisQuestion(allQuestions, askedQuestions);
      if (crisisQuestion) {
        return {
          nextQuestionId: crisisQuestion.id,
          rephrasedQuestion: crisisQuestion.text,
          reasoning: `Crisis detected: ${crisisIndicators.reason}`,
          isRephrased: false
        };
      }
    }

    // Get covered criteria with confidence tracking
    const criteriaStatus = {};
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(c => {
      criteriaStatus[c] = { covered: false, complete: false };
    });

    userResponses.forEach(response => {
      if (response.snamMapping?.criteria) {
        const c = response.snamMapping.criteria;
        const conf = response.snamMapping.confidence ?? 0.5;
        criteriaStatus[c].covered = true;
        criteriaStatus[c].complete = conf >= 0.65;
      }
    });

    // Get only INCOMPLETE criteria (not just uncovered)
    const incompleteCriteria = Object.entries(criteriaStatus)
      .filter(([_, v]) => !v.complete)
      .map(([k, _]) => parseInt(k));

    // Prioritize: C6 (safety) > C1, C2 (core) > C10, C8, C11, C9 (often missed) > others
    const priorityOrder = [6, 1, 2, 10, 8, 11, 9, 7, 5, 4, 3];

    for (const criteria of priorityOrder) {
      if (incompleteCriteria.includes(criteria)) {
        const question = availableQuestions.find(q => q.snamCriteria === criteria);
        if (question) {
          return {
            nextQuestionId: question.id,
            rephrasedQuestion: question.text,
            reasoning: `Covering incomplete criterion ${criteria}`,
            isRephrased: false,
            targetCriterion: criteria
          };
        }
      }
    }

    // Fallback to any available
    return {
      nextQuestionId: availableQuestions[0].id,
      rephrasedQuestion: availableQuestions[0].text,
      reasoning: 'Sequential selection',
      isRephrased: false
    };
  }

  getSNAMCategoryCriteria(snamCategory) {
    const criteria = {
      'mood': 'Look for: feeling sad, upset, down, low without reason, empty inside, persistent sadness',
      'interest-enjoyment': 'Look for: not enjoying activities, lost interest in hobbies, avoiding friends, no pleasure',
      'self-worth': 'Look for: feeling not good enough, self-blame, guilt, worthlessness, being a failure',
      'concentration': 'Look for: trouble focusing, memory problems, difficulty making decisions, distracted',
      'worry': 'Look for: nervous, anxious, worried about future, constant worry, feeling scared',
      'scary-thoughts': 'Look for: thoughts of self-harm, life not worth living, wanting to die, hopelessness',
      'sleep-problems': 'Look for: trouble falling asleep, staying asleep, sleeping too much, not feeling rested',
      'eating-changes': 'Look for: no appetite, skipping meals, overeating, weight changes',
      'psychomotor': 'Look for: moving slowly, talking slowly, restlessness, agitation, fidgeting',
      'tiredness-low-energy': 'Look for: no energy, exhaustion, fatigue even for simple tasks, feeling drained',
      'functioning': 'Look for: unable to do daily tasks, work/school affected, relationships suffering'
    };

    return criteria[snamCategory] || 'Analyze the response for symptoms related to this category';
  }

  fallbackScoring(userResponse, snamCategory, snamCriteria) {
    const response = userResponse.toLowerCase();

    const highSeverityKeywords = ['always', 'constantly', 'never', 'cannot', 'unable', 'extreme', 'severe', 'terrible', 'every day', 'all the time'];
    const mediumSeverityKeywords = ['often', 'frequently', 'usually', 'most of the time', 'significant', 'major', 'regularly'];
    const lowSeverityKeywords = ['sometimes', 'occasionally', 'a bit', 'slightly', 'somewhat', 'few times'];
    const noSeverityKeywords = ['never', 'not at all', 'no', 'fine', 'good', 'well', 'normal'];

    let score = 0;
    let confidence = 0.3;

    // Check for explicit negatives first
    if (noSeverityKeywords.some(keyword => response.includes(keyword)) &&
        !response.includes('not good') && !response.includes('not well')) {
      score = 0;
      confidence = 0.4;
    } else if (highSeverityKeywords.some(keyword => response.includes(keyword))) {
      score = 3;
      confidence = 0.5;
    } else if (mediumSeverityKeywords.some(keyword => response.includes(keyword))) {
      score = 2;
      confidence = 0.4;
    } else if (lowSeverityKeywords.some(keyword => response.includes(keyword))) {
      score = 1;
      confidence = 0.4;
    }

    return {
      score,
      confidence,
      category: snamCategory,
      criteria: snamCriteria,
      reasoning: 'Fallback scoring based on keyword analysis'
    };
  }

  getFallbackAnalysis(totalScore, severityLevel) {
    return {
      overallAssessment: `Based on the SNAM Depression Scale score of ${totalScore}/33, the assessment indicates ${severityLevel} depression. Professional evaluation is recommended for a comprehensive diagnosis.`,
      keyObservations: ['Automated analysis based on score'],
      riskFactors: severityLevel === 'severe' ? ['High depression score'] : [],
      protectiveFactors: ['Completed assessment'],
      confidenceLevel: 0.5,
      clinicalNotes: 'Manual review recommended'
    };
  }

  getFallbackRecommendations(severityLevel) {
    const baseRecommendations = {
      lifestyleChanges: [
        {
          category: 'sleep',
          title: 'Improve Sleep Hygiene',
          description: 'Maintain a consistent sleep schedule, avoid screens before bed, and create a relaxing bedtime routine.',
          priority: 'high',
          estimatedImpact: 'high'
        },
        {
          category: 'exercise',
          title: 'Regular Physical Activity',
          description: 'Engage in at least 30 minutes of moderate exercise daily, such as walking, yoga, or swimming.',
          priority: 'high',
          estimatedImpact: 'high'
        },
        {
          category: 'social',
          title: 'Social Connection',
          description: 'Make time for meaningful connections with friends and family members.',
          priority: 'medium',
          estimatedImpact: 'medium'
        }
      ],
      professionalHelp: {
        recommended: severityLevel !== 'none',
        urgency: severityLevel === 'severe' ? 'immediate' : severityLevel === 'moderate' ? 'soon' : 'consider',
        reasoning: `Based on your ${severityLevel} depression score, professional support may be beneficial.`,
        resources: [
          'National Suicide Prevention Lifeline: 988',
          'Crisis Text Line: Text HOME to 741741',
          'Mental Health America: mhanational.org'
        ]
      },
      followUpSchedule: {
        suggestedInterval: severityLevel === 'severe' ? 3 : severityLevel === 'moderate' ? 7 : 14,
        reasoning: `Regular check-ins are recommended for your current level.`
      }
    };

    return baseRecommendations;
  }

  async answerMentalHealthQuestion(question) {
    try {
      const prompt = `You are a supportive mental health assistant. Answer this question about mental health, lifestyle, or depression management in a helpful, empathetic, and evidence-based way.

Question: "${question}"

Guidelines:
- Be supportive and non-judgmental
- Provide practical, actionable advice
- Encourage professional help when appropriate
- Use evidence-based information
- Keep responses concise but helpful
- Avoid providing medical diagnoses

If the question involves crisis situations, suicide, or severe mental health emergencies, strongly encourage immediate professional help and provide crisis resources.

Response should be 2-4 sentences maximum.`;

      const response = await this.generateContent(prompt, 300);
      return response.trim();
    } catch (error) {
      console.error('Error answering mental health question:', error);
      return 'I apologize, but I\'m having trouble processing your question right now. For immediate mental health support, please contact a mental health professional or crisis helpline.';
    }
  }

  // Rephrase/translate a question to the specified language
  async rephraseQuestion(questionText, language = 'en') {
    try {
      if (language === 'en') {
        return questionText;
      }

      const languageName = language === 'te' ? 'Telugu' : 'English';

      const prompt = `You are a compassionate mental health assistant helping translate assessment questions.

Translate the following question to ${languageName}.
Keep the tone warm, empathetic, and conversational.
Maintain the same meaning and clinical intent.
The translation should feel natural, not literal.

Question to translate:
"${questionText}"

${language === 'te' ? `
Use natural Telugu that:
- Sounds conversational and caring
- Uses common Telugu expressions
- Respects cultural context
- Examples: "మీరు ఈ రోజు ఎలా ఫీల్ అవుతున్నారు?" instead of literal translations
` : ''}

Respond with ONLY the translated question text, no explanations or quotes.`;

      const response = await this.generateContent(prompt, 500);
      return response.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
      console.error('Error rephrasing question:', error);
      return questionText; // Return original if translation fails
    }
  }
}

module.exports = new GeminiService();
