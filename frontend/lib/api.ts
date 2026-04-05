import axios from 'axios'
import Cookies from 'js-cookie'
import { User, Assessment, Question, ChatMessage, AssessmentHistory, UserStats, ApiResponse } from '../types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, 
});
// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Content-Type': 'application/json',
//     withCredentials: true, 
//   },
// })

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
  }) => api.post('/auth/register', userData),
  
  getCurrentUser: () => api.get('/auth/me'),
  
  refreshToken: () => api.post('/auth/refresh'),
}

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  
  updateProfile: (data: Partial<User>) => api.put('/user/profile', data),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/user/password', { currentPassword, newPassword }),
  
  deleteAccount: (password: string) => api.delete('/user/account', { data: { password } }),
  
  getStats: () => api.get('/user/stats'),
}

// Assessment API
export const assessmentAPI = {
  startAssessment: (language: string = 'en', forceNew: boolean = true) =>
    api.post('/assessment/start', { language, forceNew }),

  submitResponse: (sessionId: string, questionId: string, userResponse: string, language: string = 'en') =>
    api.post(`/assessment/${sessionId}/respond`, { questionId, userResponse, language }),
  
  getAssessment: (sessionId: string) => api.get(`/assessment/${sessionId}`),
  
  getAssessmentHistory: (page = 1, limit = 10) =>
    api.get(`/assessment/history?page=${page}&limit=${limit}`),
  
  cancelAssessment: (sessionId: string) => api.delete(`/assessment/${sessionId}`),
}

// Chat API
export const chatAPI = {
  sendMessage: (message: string) => api.post('/chat/message', { message }),

  getResources: () => api.get('/chat/resources'),

  getFAQ: () => api.get('/chat/faq'),

  submitFeedback: (rating: number, feedback?: string, message?: string) =>
    api.post('/chat/feedback', { rating, feedback, message }),
}

// Recovery API
export const recoveryAPI = {
  // Plan Management
  getStatus: () => api.get('/recovery/status'),

  activate: (assessmentId: string, forceReactivate = false) =>
    api.post('/recovery/activate', { assessmentId, forceReactivate }),

  pause: () => api.post('/recovery/pause'),

  resume: () => api.post('/recovery/resume'),

  // Check-ins
  getCheckIn: () => api.get('/recovery/check-in'),

  submitCheckIn: (agentName: string, response: string, quickResponse?: string, score?: number) =>
    api.post('/recovery/check-in', { agentName, response, quickResponse, score }),

  // Progress
  getProgress: () => api.get('/recovery/progress'),

  getHistory: (agent?: string, limit = 20, offset = 0) =>
    api.get(`/recovery/history?${agent ? `agent=${agent}&` : ''}limit=${limit}&offset=${offset}`),

  getDailySummary: () => api.get('/recovery/daily-summary'),

  // Goals
  getGoals: () => api.get('/recovery/goals'),

  addGoal: (goal: { agentName?: string; title: string; description?: string; targetDate?: string }) =>
    api.post('/recovery/goals', goal),

  updateGoal: (goalId: string, data: { progress?: number; status?: string }) =>
    api.put(`/recovery/goals/${goalId}`, data),

  // Preferences
  getPreferences: () => api.get('/recovery/preferences'),

  updatePreferences: (prefs: { checkInTime?: string; checkInFrequency?: string; enableReminders?: boolean }) =>
    api.put('/recovery/preferences', prefs),

  // Agent-specific endpoints
  agents: {
    // Generic
    getIntervention: (agentName: string, severity?: number) =>
      api.get(`/recovery/agents/${agentName}/intervention${severity ? `?severity=${severity}` : ''}`),

    getExercises: (agentName: string, type?: string) =>
      api.get(`/recovery/agents/${agentName}/exercises${type ? `?type=${type}` : ''}`),

    // Sleep
    logSleep: (data: { bedTime: string; wakeTime: string; sleepQuality: number; nightWakings?: number; notes?: string }) =>
      api.post('/recovery/agents/sleep/diary', data),

    getRelaxation: (type: string) =>
      api.get(`/recovery/agents/sleep/relaxation/${type}`),

    // Activity
    getActivitySuggestion: (energy?: string) =>
      api.get(`/recovery/agents/activity/suggestion${energy ? `?energy=${energy}` : ''}`),

    getChallenge: () =>
      api.get('/recovery/agents/activity/challenge'),

    generateActivityPlan: (preferences?: object, currentEnergy?: string) =>
      api.post('/recovery/agents/activity/plan', { preferences, currentEnergy }),

    // Mood
    logMood: (data: { mood: string; intensity: number; context?: string; thoughts?: string }) =>
      api.post('/recovery/agents/mood/log', data),

    reframeMoodThought: (thought: string) =>
      api.post('/recovery/agents/mood/reframe', { thought }),

    getAffirmation: (type?: string) =>
      api.get(`/recovery/agents/mood/affirmation${type ? `?type=${type}` : ''}`),

    // Worry
    processWorry: (worry: string) =>
      api.post('/recovery/agents/worry/process', { worry }),

    reframeWorry: (worry: string, previousWorries?: string[]) =>
      api.post('/recovery/agents/worry/reframe', { worry, previousWorries }),

    getGrounding: (intensity?: string) =>
      api.get(`/recovery/agents/worry/grounding${intensity ? `?intensity=${intensity}` : ''}`),

    getPanicSupport: (phase?: string) =>
      api.get(`/recovery/agents/worry/panic-support${phase ? `?phase=${phase}` : ''}`),

    getWorryTimeGuidance: (phase?: string) =>
      api.get(`/recovery/agents/worry/worry-time${phase ? `?phase=${phase}` : ''}`),

    generateAnxietyLadder: (fearTopic: string) =>
      api.post('/recovery/agents/worry/anxiety-ladder', { fearTopic }),
  }
}

// Utility functions
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.response?.data?.errors) {
    return error.response.data.errors.map((err: any) => err.msg).join(', ')
  }
  if (error.message) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export default api
