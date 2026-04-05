// Question Bank for MindScope Depression Detection System
// Based on SNAM Depression Scale with ICD-11 and DSM-5 criteria mapping

const questionBank = {
  // SNAM Depression Scale Categories (11 main criteria)
  // Scoring: 3=Very Frequently, 2=Frequently, 1=Occasionally, 0=Never
  // Total Score Range: 0-33
  // For criteria with sub-questions (a/b), take the higher score

  // Initial questions (asked to everyone)
  initial: [
    {
      id: 'initial_1',
      category: 'initial',
      text: 'How are you feeling today? Can you describe your current emotional state?',
      snamCategory: 'mood',
      snamCriteria: 1,
      priority: 'high'
    },
    {
      id: 'initial_2',
      category: 'initial',
      text: 'Have you noticed any changes in your daily routine or activities recently?',
      snamCategory: 'interest-enjoyment',
      snamCriteria: 2,
      priority: 'high'
    }
  ],

  // Crisis and high-risk questions (asked when severe symptoms are detected)
  crisis: [
    {
      id: 'crisis_1',
      category: 'crisis',
      text: 'Have you had any thoughts of hurting yourself or feel like life isn\'t worth it?',
      snamCategory: 'scary-thoughts',
      snamCriteria: 6,
      priority: 'critical'
    },
    {
      id: 'crisis_2',
      category: 'crisis',
      text: 'Do you have thoughts about ending your life or harming yourself?',
      snamCategory: 'scary-thoughts',
      snamCriteria: 6,
      priority: 'critical'
    },
    {
      id: 'crisis_3',
      category: 'crisis',
      text: 'Are you currently having thoughts of self-harm or suicide?',
      snamCategory: 'scary-thoughts',
      snamCriteria: 6,
      priority: 'critical'
    }
  ],

  // Follow-up questions for severe symptoms
  severe_followup: [
    {
      id: 'severe_mood_1',
      category: 'severe-followup',
      text: 'How long have you been feeling sad or low? Can you describe the intensity of these feelings?',
      snamCategory: 'mood',
      snamCriteria: 1,
      priority: 'high'
    },
    {
      id: 'severe_interest_1',
      category: 'severe-followup',
      text: 'What activities or hobbies used to bring you joy, and how has that changed?',
      snamCategory: 'interest-enjoyment',
      snamCriteria: 2,
      priority: 'high'
    },
    {
      id: 'severe_sleep_1',
      category: 'severe-followup',
      text: 'Can you describe your sleep patterns? Do you have trouble falling asleep or feel tired even after sleeping?',
      snamCategory: 'sleep-problems',
      snamCriteria: 7,
      priority: 'high'
    },
    {
      id: 'severe_energy_1',
      category: 'severe-followup',
      text: 'How has your energy level been affecting even simple daily tasks?',
      snamCategory: 'tiredness-low-energy',
      snamCriteria: 10,
      priority: 'high'
    }
  ],

  // SNAM Core Questions (mapped to clinical depression criteria)
  snam: [
    // Criterion 1: Feeling Sad or Empty (ICD-11: 1, DSM-5: 1)
    {
      id: 'mood-1a',
      category: 'snam',
      text: 'Over the past two weeks, have you often felt sad or upset, even when nothing bad has happened?',
      snamCategory: 'mood',
      snamCriteria: 1,
      subQuestion: 'a',
      scoringCriteria: {
        0: ['not sad', 'feeling good', 'positive mood', 'no sadness without reason'],
        1: ['occasionally sad', 'sometimes upset', 'slightly down at times'],
        2: ['frequently sad', 'often upset', 'regularly feeling down'],
        3: ['constantly sad', 'always upset', 'persistent sadness without cause']
      }
    },
    {
      id: 'mood-1b',
      category: 'snam',
      text: 'Over the past two weeks, have you felt down or low without knowing why?',
      snamCategory: 'mood',
      snamCriteria: 1,
      subQuestion: 'b',
      scoringCriteria: {
        0: ['know why I feel emotions', 'clear reasons for feelings', 'not randomly down'],
        1: ['occasionally feel low randomly', 'sometimes down without reason'],
        2: ['frequently down without reason', 'often feel low unexplainably'],
        3: ['constantly low without reason', 'always down with no cause']
      }
    },

    // Criterion 2: Losing Interest or Enjoyment (ICD-11: 2, DSM-5: 2)
    {
      id: 'interest-2a',
      category: 'snam',
      text: 'Over the past two weeks, have you stopped enjoying games, hobbies, or being with friends?',
      snamCategory: 'interest-enjoyment',
      snamCriteria: 2,
      subQuestion: 'a',
      scoringCriteria: {
        0: ['enjoy hobbies', 'like being with friends', 'engaged in activities'],
        1: ['occasionally not enjoying', 'sometimes skip activities'],
        2: ['frequently not enjoying', 'often avoid friends/hobbies'],
        3: ['no enjoyment at all', 'completely lost interest in everything']
      }
    },
    {
      id: 'interest-2b',
      category: 'snam',
      text: 'Over the past two weeks, have you lost interest in things you used to like?',
      snamCategory: 'interest-enjoyment',
      snamCriteria: 2,
      subQuestion: 'b',
      scoringCriteria: {
        0: ['still interested', 'enjoying same things', 'no loss of interest'],
        1: ['slight loss of interest', 'occasionally uninterested'],
        2: ['significant loss of interest', 'frequently uninterested'],
        3: ['complete loss of interest', 'nothing interests me anymore']
      }
    },

    // Criterion 3: Feeling Bad About Yourself (ICD-11: 4, DSM-5: 7)
    {
      id: 'self-worth-3',
      category: 'snam',
      text: 'Over the past two weeks, have you felt like you\'re not good enough or blamed yourself and felt guilty when it\'s not your fault?',
      snamCategory: 'self-worth',
      snamCriteria: 3,
      scoringCriteria: {
        0: ['good self-esteem', 'confident', 'don\'t blame myself unfairly'],
        1: ['occasional self-doubt', 'sometimes feel not good enough'],
        2: ['frequent self-doubt', 'often feel guilty without cause'],
        3: ['constant self-hatred', 'always feel worthless and guilty']
      }
    },

    // Criterion 4: Trouble Paying Attention (ICD-11: 3, DSM-5: 8)
    {
      id: 'concentration-4a',
      category: 'snam',
      text: 'Over the past two weeks, has it been hard for you to concentrate or remember things?',
      snamCategory: 'concentration',
      snamCriteria: 4,
      subQuestion: 'a',
      scoringCriteria: {
        0: ['good concentration', 'memory fine', 'focused'],
        1: ['occasional focus issues', 'sometimes forgetful'],
        2: ['frequent concentration problems', 'often forgetful'],
        3: ['severe concentration problems', 'cannot focus or remember']
      }
    },
    {
      id: 'concentration-4b',
      category: 'snam',
      text: 'Over the past two weeks, have you found it hard to make even small decisions?',
      snamCategory: 'concentration',
      snamCriteria: 4,
      subQuestion: 'b',
      scoringCriteria: {
        0: ['make decisions easily', 'no trouble deciding'],
        1: ['occasionally indecisive', 'sometimes hard to decide'],
        2: ['frequently indecisive', 'often struggle with decisions'],
        3: ['cannot make any decisions', 'paralyzed by choices']
      }
    },

    // Criterion 5: Worrying Too Much (ICD-11: 5, DSM-5: -)
    {
      id: 'worry-5a',
      category: 'snam',
      text: 'Over the past two weeks, have you felt nervous or worried most of the time?',
      snamCategory: 'worry',
      snamCriteria: 5,
      subQuestion: 'a',
      scoringCriteria: {
        0: ['calm', 'not worried', 'relaxed most of time'],
        1: ['occasionally nervous', 'sometimes worried'],
        2: ['frequently nervous', 'often worried'],
        3: ['constantly nervous', 'always worried']
      }
    },
    {
      id: 'worry-5b',
      category: 'snam',
      text: 'Over the past two weeks, have thoughts about the future made you feel really anxious?',
      snamCategory: 'worry',
      snamCriteria: 5,
      subQuestion: 'b',
      scoringCriteria: {
        0: ['hopeful about future', 'not anxious about what\'s ahead'],
        1: ['occasional future anxiety', 'sometimes worried about future'],
        2: ['frequent future anxiety', 'often anxious about what\'s coming'],
        3: ['constant future anxiety', 'always terrified about future']
      }
    },

    // Criterion 6: Scary Thoughts (ICD-11: 6, DSM-5: 9)
    {
      id: 'scary-thoughts-6',
      category: 'snam',
      text: 'Over the past two weeks, have you thought about hurting yourself or felt like life isn\'t worth it?',
      snamCategory: 'scary-thoughts',
      snamCriteria: 6,
      scoringCriteria: {
        0: ['no self-harm thoughts', 'life is worth living', 'positive outlook'],
        1: ['occasional dark thoughts', 'brief moments of hopelessness'],
        2: ['frequent thoughts of self-harm', 'often feel life isn\'t worth it'],
        3: ['constant self-harm thoughts', 'always feel life isn\'t worth it']
      }
    },

    // Criterion 7: Sleep Problems (ICD-11: 7, DSM-5: 4)
    {
      id: 'sleep-7',
      category: 'snam',
      text: 'Over the past two weeks, have you had trouble falling asleep, or felt tired even after sleeping for a long time?',
      snamCategory: 'sleep-problems',
      snamCriteria: 7,
      scoringCriteria: {
        0: ['sleeping well', 'feel rested', 'no sleep issues'],
        1: ['occasional sleep trouble', 'sometimes tired after sleep'],
        2: ['frequent sleep problems', 'often tired despite sleep'],
        3: ['severe sleep problems', 'cannot sleep or always exhausted']
      }
    },

    // Criterion 8: Eating Changes (ICD-11: 8, DSM-5: 3)
    {
      id: 'eating-8a',
      category: 'snam',
      text: 'Over the past two weeks, have you not felt hungry or skipped meals?',
      snamCategory: 'eating-changes',
      snamCriteria: 8,
      subQuestion: 'a',
      scoringCriteria: {
        0: ['normal appetite', 'eating regularly', 'healthy eating'],
        1: ['occasional lack of appetite', 'sometimes skip meals'],
        2: ['frequent lack of appetite', 'often skip meals'],
        3: ['no appetite at all', 'rarely eating']
      }
    },
    {
      id: 'eating-8b',
      category: 'snam',
      text: 'Over the past two weeks, have you been eating more than usual?',
      snamCategory: 'eating-changes',
      snamCriteria: 8,
      subQuestion: 'b',
      scoringCriteria: {
        0: ['eating normally', 'no overeating'],
        1: ['occasionally overeating', 'sometimes eating more'],
        2: ['frequently overeating', 'often eating too much'],
        3: ['constantly overeating', 'cannot stop eating']
      }
    },

    // Criterion 9: Restless or Super Slow (ICD-11: 9, DSM-5: 5)
    {
      id: 'psychomotor-9',
      category: 'snam',
      text: 'Over the past two weeks, have you felt restless or like you\'re moving or talking more slowly than usual?',
      snamCategory: 'psychomotor',
      snamCriteria: 9,
      scoringCriteria: {
        0: ['normal movement', 'usual pace', 'no restlessness'],
        1: ['occasionally restless or slow', 'sometimes notice changes'],
        2: ['frequently restless or slow', 'often feel different in movement'],
        3: ['severely restless or slow', 'others notice the change']
      }
    },

    // Criterion 10: Tiredness or Low Energy (ICD-11: 10, DSM-5: 6)
    {
      id: 'energy-10',
      category: 'snam',
      text: 'Over the past two weeks, have you felt like you have no energy, even for simple things?',
      snamCategory: 'tiredness-low-energy',
      snamCriteria: 10,
      scoringCriteria: {
        0: ['good energy', 'feeling energetic', 'active'],
        1: ['occasional low energy', 'sometimes tired'],
        2: ['frequent low energy', 'often exhausted'],
        3: ['no energy at all', 'cannot do simple things']
      }
    },

    // Criterion 11: Impairment in Functioning (Additional)
    {
      id: 'functioning-11',
      category: 'snam',
      text: 'Due to the above feelings, have you been unable to perform your daily functions normally?',
      snamCategory: 'functioning',
      snamCriteria: 11,
      scoringCriteria: {
        0: ['functioning normally', 'no impairment', 'managing daily tasks'],
        1: ['occasional difficulty', 'sometimes struggle with tasks'],
        2: ['frequent impairment', 'often cannot function normally'],
        3: ['severe impairment', 'cannot perform daily functions']
      }
    }
  ],

  // Cultural and contextual questions
  cultural: [
    {
      id: 'cultural_1',
      category: 'cultural',
      text: 'How would you describe your current state of mind? Do you feel like your usual self?',
      snamCategory: 'mood',
      snamCriteria: 1,
      priority: 'medium'
    },
    {
      id: 'cultural_2',
      category: 'cultural',
      text: 'Have you been feeling disconnected from your family or community recently?',
      snamCategory: 'interest-enjoyment',
      snamCriteria: 2,
      priority: 'medium'
    },
    {
      id: 'cultural_3',
      category: 'cultural',
      text: 'How has your ability to focus on prayers, meditation, or spiritual practices been affected?',
      snamCategory: 'concentration',
      snamCriteria: 4,
      priority: 'medium'
    }
  ],

  // Adaptive follow-up questions based on responses
  adaptive: [
    {
      id: 'adaptive_sleep_followup',
      category: 'adaptive',
      text: 'When you have trouble sleeping, what thoughts or feelings keep you awake?',
      snamCategory: 'sleep-problems',
      snamCriteria: 7,
      priority: 'medium',
      triggers: ['sleep', 'insomnia', 'trouble sleeping', 'tired']
    },
    {
      id: 'adaptive_energy_followup',
      category: 'adaptive',
      text: 'What activities used to give you energy, and how has that changed?',
      snamCategory: 'tiredness-low-energy',
      snamCriteria: 10,
      priority: 'medium',
      triggers: ['tired', 'exhausted', 'no energy']
    },
    {
      id: 'adaptive_worth_followup',
      category: 'adaptive',
      text: 'How do you feel about your worth or value as a person right now?',
      snamCategory: 'self-worth',
      snamCriteria: 3,
      priority: 'high',
      triggers: ['worthless', 'failure', 'not good enough', 'guilty']
    },
    {
      id: 'adaptive_worry_followup',
      category: 'adaptive',
      text: 'What specific things are you most worried or anxious about?',
      snamCategory: 'worry',
      snamCriteria: 5,
      priority: 'medium',
      triggers: ['worried', 'anxious', 'nervous', 'scared']
    }
  ],

  // Follow-up questions based on responses
  followUp: {
    'mood': [
      {
        id: 'mood-followup-1',
        text: 'Can you describe what triggers these feelings of sadness or emptiness?',
        category: 'follow-up',
        snamCategory: 'mood',
        snamCriteria: 1
      }
    ],
    'interest-enjoyment': [
      {
        id: 'interest-followup-1',
        text: 'What activities used to bring you joy, and how has that changed?',
        category: 'follow-up',
        snamCategory: 'interest-enjoyment',
        snamCriteria: 2
      }
    ],
    'sleep-problems': [
      {
        id: 'sleep-followup-1',
        text: 'How many hours of sleep do you typically get, and do you feel rested when you wake up?',
        category: 'follow-up',
        snamCategory: 'sleep-problems',
        snamCriteria: 7
      }
    ],
    'tiredness-low-energy': [
      {
        id: 'energy-followup-1',
        text: 'What activities do you find most draining, and has this changed recently?',
        category: 'follow-up',
        snamCategory: 'tiredness-low-energy',
        snamCriteria: 10
      }
    ],
    'eating-changes': [
      {
        id: 'eating-followup-1',
        text: 'Have you noticed any changes in your eating patterns or relationship with food?',
        category: 'follow-up',
        snamCategory: 'eating-changes',
        snamCriteria: 8
      }
    ],
    'worry': [
      {
        id: 'worry-followup-1',
        text: 'What situations or thoughts trigger your anxiety or worry the most?',
        category: 'follow-up',
        snamCategory: 'worry',
        snamCriteria: 5
      }
    ]
  }
};

// SNAM Categories mapping
const snamCategories = [
  'mood',                  // Criterion 1: Feeling Sad or Empty
  'interest-enjoyment',    // Criterion 2: Losing Interest or Enjoyment
  'self-worth',            // Criterion 3: Feeling Bad About Yourself
  'concentration',         // Criterion 4: Trouble Paying Attention
  'worry',                 // Criterion 5: Worrying Too Much
  'scary-thoughts',        // Criterion 6: Scary Thoughts
  'sleep-problems',        // Criterion 7: Sleep Problems
  'eating-changes',        // Criterion 8: Eating Changes
  'psychomotor',           // Criterion 9: Restless or Super Slow
  'tiredness-low-energy',  // Criterion 10: Tiredness or Low Energy
  'functioning'            // Criterion 11: Impairment in Functioning
];

// Helper functions for question management
const getAllQuestions = () => {
  return [
    ...questionBank.initial,
    ...questionBank.snam,
    ...questionBank.crisis,
    ...questionBank.severe_followup,
    ...questionBank.cultural,
    ...questionBank.adaptive
  ];
};

const getQuestionById = (questionId) => {
  return getAllQuestions().find(q => q.id === questionId);
};

const getInitialQuestions = () => {
  return questionBank.initial;
};

const getSNAMQuestions = () => {
  return questionBank.snam;
};

const getCrisisQuestions = () => {
  return questionBank.crisis;
};

const getSevereFollowUpQuestions = () => {
  return questionBank.severe_followup;
};

const getCulturalQuestions = () => {
  return questionBank.cultural;
};

const getAdaptiveQuestions = () => {
  return questionBank.adaptive;
};

// Check if user shows severe symptoms based on responses
const hasSevereSymptoms = (responses) => {
  const snamResponses = responses.filter(r => r.snamMapping);

  // Check for high scores (2-3) in any category
  const highScores = snamResponses.filter(r => r.snamMapping.score >= 2);

  // Check for scary thoughts (criterion 6)
  const scaryThoughtsResponse = snamResponses.find(r =>
    r.questionId === 'scary-thoughts-6' ||
    r.questionCategory === 'crisis' ||
    r.snamMapping?.category === 'scary-thoughts'
  );

  return highScores.length > 0 || (scaryThoughtsResponse && scaryThoughtsResponse.snamMapping?.score >= 1);
};

// Check if user is in crisis based on SNAM scores only (immediate intervention needed)
// Note: This is a quick score-based check. The full LLM-based crisis detection
// is performed in the assessment route for more accurate context-aware analysis.
const isInCrisis = (responses) => {
  // Only rely on SNAM scores - NO keyword matching
  // The LLM has already analyzed the context and assigned appropriate scores

  for (const response of responses) {
    // Check for high SNAM scores in scary thoughts (criterion 6)
    // Score of 2 = frequent thoughts of self-harm
    // Score of 3 = constant self-harm thoughts
    if (response.snamMapping?.category === 'scary-thoughts' && response.snamMapping?.score >= 2) {
      return true;
    }

    // Check for crisis category questions with high scores
    if (response.questionCategory === 'crisis' && response.snamMapping?.score >= 2) {
      return true;
    }
  }

  return false;
};

// Determine if assessment should continue based on responses
const shouldContinueAssessment = (responses) => {
  // Stop immediately if in crisis
  if (isInCrisis(responses)) {
    return false;
  }

  const snamResponses = responses.filter(r => r.questionCategory === 'snam');

  // Continue if we have less than 7 SNAM responses (need at least core criteria covered)
  if (snamResponses.length < 7) return true;

  // Continue if we haven't asked about all main criteria
  // We have 11 criteria, some with sub-questions
  return snamResponses.length < 11;
};

// Get covered SNAM criteria from responses
const getCoveredCriteria = (responses) => {
  const covered = new Set();
  responses.forEach(r => {
    if (r.snamMapping?.criteria) {
      covered.add(r.snamMapping.criteria);
    }
  });
  return Array.from(covered);
};

// Check if core criteria are met for diagnosis
// Note: Either criterion 1 (mood) or criterion 2 (interest) must be present and not have 0 score
const meetsCoreCriteria = (responses) => {
  const moodResponse = responses.find(r => r.snamMapping?.criteria === 1);
  const interestResponse = responses.find(r => r.snamMapping?.criteria === 2);

  const moodPresent = moodResponse && moodResponse.snamMapping.score > 0;
  const interestPresent = interestResponse && interestResponse.snamMapping.score > 0;

  return moodPresent || interestPresent;
};

module.exports = {
  questionBank,
  snamCategories,
  getAllQuestions,
  getQuestionById,
  getInitialQuestions,
  getSNAMQuestions,
  getCrisisQuestions,
  getSevereFollowUpQuestions,
  getCulturalQuestions,
  getAdaptiveQuestions,
  hasSevereSymptoms,
  isInCrisis,
  shouldContinueAssessment,
  getCoveredCriteria,
  meetsCoreCriteria
};
