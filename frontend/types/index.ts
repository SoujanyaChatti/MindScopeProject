export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName?: string
  age?: number
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say'
  phoneNumber?: string
  emergencyContact?: {
    name?: string
    phone?: string
    relationship?: string
  }
  profileCompleted: boolean
  totalAssessments: number
  lastAssessmentDate?: string
  createdAt?: string
  updatedAt?: string
}

export interface Assessment {
  id: string
  userId: string
  sessionId: string
  status: 'in-progress' | 'completed' | 'abandoned'
  currentQuestionIndex: number
  totalQuestions: number
  responses: AssessmentResponse[]
  snamScores?: {
    totalScore: number
    criteriaScores: Array<{
      criteria: number
      category: string
      score: number
    }>
    severityLevel: 'none' | 'mild' | 'moderate' | 'severe'
    meetsCoreCriteria: boolean
    lastUpdated: string
  }
  llmAnalysis?: {
    overallAssessment: string
    keyObservations: string[]
    riskFactors: string[]
    protectiveFactors: string[]
    confidenceLevel: number
    clinicalNotes?: string
  }
  recommendations?: {
    lifestyleChanges: Array<{
      category: 'sleep' | 'exercise' | 'diet' | 'social' | 'mindfulness' | 'professional'
      title: string
      description: string
      priority: 'high' | 'medium' | 'low'
      estimatedImpact: 'high' | 'medium' | 'low'
    }>
    professionalHelp: {
      recommended: boolean
      urgency: 'immediate' | 'soon' | 'consider'
      reasoning: string
      resources: string[]
    }
    followUpSchedule: {
      suggestedInterval: number
      reasoning: string
      nextAssessment?: string
    }
  }
  metadata: {
    startTime: string
    endTime?: string
    duration?: number
    completionRate?: number
  }
}

export interface AssessmentResponse {
  questionId: string
  questionText: string
  questionCategory: 'initial' | 'snam' | 'follow-up' | 'crisis' | 'severe-followup' | 'cultural' | 'adaptive'
  userResponse: string
  timestamp: string
  snamMapping?: {
    score: number
    confidence: number
    category: string
    criteria: number
    reasoning: string
  }
}

export interface Question {
  id: string
  category: 'initial' | 'snam' | 'follow-up' | 'crisis' | 'severe-followup' | 'cultural' | 'adaptive'
  text: string
  displayText?: string
  isRephrased?: boolean
  snamCategory?: string
  snamCriteria?: number
  followUpQuestions?: string[]
}

export interface ChatMessage {
  id: string
  message: string
  timestamp: string
  isAuthenticated: boolean
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  message: string
  data?: T
  errors?: any[]
}

export interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  hasNext: boolean
  hasPrev: boolean
}

export interface AssessmentHistory {
  assessments: Assessment[]
  pagination: PaginationInfo
}

export interface UserStats {
  totalAssessments: number
  averageScore: number
  latestScore: number
  firstAssessment?: string
  lastAssessment?: string
}

export interface CrisisAlert {
  crisisAlert: boolean
  immediateSupport: {
    message: string
    resources: string[]
  }
}

export interface AssessmentResults {
  totalScore: number
  severityLevel: 'none' | 'mild' | 'moderate' | 'severe'
  criteriaScores: Array<{
    criteria: number
    category: string
    score: number
  }>
  meetsCoreCriteria: boolean
  llmAnalysis?: {
    overallAssessment: string
    keyObservations: string[]
    riskFactors: string[]
    protectiveFactors: string[]
    confidenceLevel: number
    clinicalNotes?: string
  }
  recommendations?: Assessment['recommendations']
}

// SNAM Categories
export type SNAMCategory =
  | 'mood'
  | 'interest-enjoyment'
  | 'self-worth'
  | 'concentration'
  | 'worry'
  | 'scary-thoughts'
  | 'sleep-problems'
  | 'eating-changes'
  | 'psychomotor'
  | 'tiredness-low-energy'
  | 'functioning'
