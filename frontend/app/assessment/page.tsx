'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { assessmentAPI } from '../../lib/api'
import { Assessment, Question } from '../../types'
import LoadingSpinner from '../../components/LoadingSpinner'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import toast from 'react-hot-toast'
import { Send, ArrowLeft, Brain, AlertTriangle, Mic, Square, Volume2, VolumeX, Sparkles } from 'lucide-react'

interface ChatMessage {
  id: string
  type: 'question' | 'user-response' | 'ai-thinking' | 'clarification'
  content: string
  timestamp: Date
  isClarification?: boolean
  confidenceInfo?: {
    confidence: number
    reason?: string
  }
}

export default function AssessmentPage() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userResponse, setUserResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(true)
  const [crisisAlert, setCrisisAlert] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [pendingClarification, setPendingClarification] = useState<{
    originalMapping: any
    originalQuestionId: string
  } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [ttsSpeakingId, setTtsSpeakingId] = useState<string | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('')
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const [levels, setLevels] = useState<number[]>([])
  const shouldRestartRef = useRef(false)
  const lastAudioAtRef = useRef<number>(0)
  const SILENCE_TIMEOUT_MS = 25000
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    startAssessment()
  }, [user, router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const startAssessment = async () => {
    try {
      const response = await assessmentAPI.startAssessment(language)
      const { assessment: newAssessment, nextQuestion } = response.data.data

      setAssessment(newAssessment)
      setCurrentQuestion(nextQuestion)
      setIsStarting(false)

      if (nextQuestion) {
        const questionText = nextQuestion.displayText || nextQuestion.text
        addMessage('question', questionText)
      }
    } catch (error) {
      console.error('Failed to start assessment:', error)
      toast.error('Failed to start assessment')
      router.push('/dashboard')
    }
  }

  const addMessage = (type: 'question' | 'user-response' | 'ai-thinking', content: string) => {
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const handleSubmitResponse = async () => {
    if (!userResponse.trim() || !currentQuestion || !assessment) return

    setIsLoading(true)

    addMessage('user-response', userResponse)
    addMessage('ai-thinking', t('assessment.thinking'))

    try {
      // Check if this is a clarification response
      const isClarificationResponse = pendingClarification !== null
      const requestBody: any = {
        questionId: isClarificationResponse ? pendingClarification.originalQuestionId : currentQuestion.id,
        userResponse,
        language,
        isClarificationResponse,
        originalMapping: isClarificationResponse ? pendingClarification.originalMapping : undefined
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/assessment/${assessment.sessionId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      const { assessment: updatedAssessment, nextQuestion, crisisAlert: alert, results: assessmentResults, requiresClarification, originalMapping, clarificationReason } = data.data

      setMessages(prev => prev.slice(0, -1))

      // Clear pending clarification after processing
      if (isClarificationResponse) {
        setPendingClarification(null)
      }

      setAssessment(updatedAssessment)

      if (alert) {
        setCrisisAlert(true)
        addMessage('question', t('crisis.message'))
        return
      }

      // Handle clarification request
      if (requiresClarification && nextQuestion) {
        setPendingClarification({
          originalMapping: originalMapping,
          originalQuestionId: nextQuestion.originalQuestionId
        })
        setCurrentQuestion(nextQuestion)
        const questionText = nextQuestion.displayText || nextQuestion.text
        // Add clarification message with special styling
        const clarificationMessage: ChatMessage = {
          id: `${Date.now()}-clarify`,
          type: 'clarification',
          content: questionText,
          timestamp: new Date(),
          isClarification: true,
          confidenceInfo: {
            confidence: originalMapping?.confidence || 0,
            reason: clarificationReason
          }
        }
        setMessages(prev => [...prev, clarificationMessage])
        return
      }

      if (!nextQuestion) {
        setIsCompleted(true)
        setResults(assessmentResults)
        addMessage('question', t('assessment.complete'))
        return
      }

      setCurrentQuestion(nextQuestion)
      const questionText = nextQuestion.displayText || nextQuestion.text
      addMessage('question', questionText)

    } catch (error) {
      console.error('Failed to submit response:', error)
      toast.error('Failed to submit response')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
      setUserResponse('')
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitResponse()
    }
  }

  // Speech Recognition
  const isSpeechRecognitionSupported = () => {
    if (typeof window === 'undefined') return false
    return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition)
  }

  const startRecording = () => {
    if (!isSpeechRecognitionSupported() || isRecording) return
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        mediaStreamRef.current = stream
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioCtx
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {})
        }
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.85
        source.connect(analyser)
        analyserRef.current = analyser

        const bufferLength = analyser.fftSize
        const timeDomainArray = new Float32Array(bufferLength)

        const render = () => {
          if (!analyserRef.current) return
          analyserRef.current.getFloatTimeDomainData(timeDomainArray)
          let sumSquares = 0
          for (let i = 0; i < bufferLength; i++) {
            const v = timeDomainArray[i]
            sumSquares += v * v
          }
          const rms = Math.sqrt(sumSquares / bufferLength)
          const gain = 180
          const percent = Math.max(5, Math.min(100, Math.round(rms * gain * 100) / 100))

          const bands = 12
          const newLevels: number[] = []
          for (let i = 0; i < bands; i++) {
            const jitter = (Math.random() - 0.5) * 10
            newLevels.push(Math.max(5, Math.min(100, Math.round(percent + jitter))))
          }
          setLevels(newLevels)

          if (percent > 8) {
            lastAudioAtRef.current = Date.now()
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = setTimeout(() => stopRecording(), SILENCE_TIMEOUT_MS)
          } else if (Date.now() - lastAudioAtRef.current > SILENCE_TIMEOUT_MS) {
            stopRecording()
            return
          }
          rafIdRef.current = requestAnimationFrame(render)
        }
        render()

        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.lang = language === 'te' ? 'te-IN' : 'en-US'
        recognition.maxAlternatives = 1
        recognition.interimResults = true
        recognition.continuous = true

        recognition.onstart = () => {
          setIsRecording(true)
          setLiveTranscript('')
          shouldRestartRef.current = true
          lastAudioAtRef.current = Date.now()
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = setTimeout(() => stopRecording(), SILENCE_TIMEOUT_MS)
        }

        recognition.onspeechstart = () => {
          lastAudioAtRef.current = Date.now()
        }

        recognition.onresult = (event: any) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i]
            const text = res[0]?.transcript || ''
            if (res.isFinal) {
              const finalText = text.trim()
              if (finalText) {
                setUserResponse(prev => {
                  const base = prev?.trim() ? prev + ' ' : ''
                  return (base + finalText).trim()
                })
              }
            } else {
              interim += text
            }
          }
          setLiveTranscript(interim.trim())
          lastAudioAtRef.current = Date.now()
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = setTimeout(() => stopRecording(), SILENCE_TIMEOUT_MS)
          }
        }

        recognition.onend = () => {
          if (shouldRestartRef.current) {
            try { recognition.start() } catch (_) {}
            return
          }
          setIsRecording(false)
          if (liveTranscript) {
            setUserResponse(prev => {
              const base = prev?.trim() ? prev + ' ' : ''
              return (base + liveTranscript).trim()
            })
            setLiveTranscript('')
          }
        }

        recognition.onerror = () => {
          if (shouldRestartRef.current) {
            try { recognition.start() } catch (_) {}
            return
          }
          setIsRecording(false)
        }

        recognitionRef.current = recognition
        try { recognition.start() } catch (_) {}
      })
      .catch(() => {
        toast.error('Microphone permission denied')
      })
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
    shouldRestartRef.current = false
    setIsRecording(false)
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (liveTranscript) {
      setUserResponse(prev => {
        const base = prev?.trim() ? prev + ' ' : ''
        return (base + liveTranscript).trim()
      })
      setLiveTranscript('')
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
  }

  // Text to Speech
  const isSpeechSynthesisSupported = () => {
    if (typeof window === 'undefined') return false
    return typeof window.speechSynthesis !== 'undefined'
  }

  const speakText = (id: string, text: string) => {
    if (!isSpeechSynthesisSupported()) return
    if (!text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'te' ? 'te-IN' : 'en-US'
    utterance.onend = () => setTtsSpeakingId(null)
    setTtsSpeakingId(id)
    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (!isSpeechSynthesisSupported()) return
    window.speechSynthesis.cancel()
    setTtsSpeakingId(null)
  }

  const handleExit = () => {
    if (assessment && !isCompleted) {
      assessmentAPI.cancelAssessment(assessment.sessionId).catch(console.error)
    }
    router.push('/dashboard')
  }

  const renderCrisisAlert = () => (
    <div className="fixed inset-0 bg-red-900/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full animate-fade-in-up">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('crisis.title')}</h2>
        </div>
        <p className="text-gray-600 mb-6">{t('crisis.message')}</p>
        <div className="space-y-3 mb-6">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="font-semibold text-red-800">National Suicide Prevention Lifeline</p>
            <p className="text-red-700 text-lg font-mono">988</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="font-semibold text-red-800">Crisis Text Line</p>
            <p className="text-red-700">Text HOME to 741741</p>
          </div>
        </div>
        <button onClick={() => router.push('/dashboard')} className="w-full btn-primary">
          {t('nav.dashboard')}
        </button>
      </div>
    </div>
  )

  const renderResults = () => (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gradient">{t('results.title')}</h2>
        </div>

        {results && (
          <div className="space-y-6">
            {/* Score Summary with Confidence */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('assessment.score')}</h3>
              <div className="flex items-baseline space-x-3 mb-3">
                <div className="text-4xl font-bold text-gradient">
                  {results.totalScore}/33
                </div>
                {results.weightedScore !== undefined && results.weightedScore !== results.totalScore && (
                  <div className="text-sm text-gray-500">
                    ({language === 'te' ? 'భారిత' : 'Weighted'}: {results.weightedScore}/33)
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3 mb-3">
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                  results.severityLevel === 'none' ? 'bg-green-100 text-green-800' :
                  results.severityLevel === 'mild' ? 'bg-yellow-100 text-yellow-800' :
                  results.severityLevel === 'moderate' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {language === 'te' ? t(`severity.${results.severityLevel}`) : results.severityLevel.toUpperCase()}
                </div>
                {results.averageConfidence !== undefined && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 mr-2">
                      {language === 'te' ? 'విశ్వసనీయత' : 'Confidence'}:
                    </span>
                    <div className="flex items-center">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            results.averageConfidence >= 0.8 ? 'bg-green-500' :
                            results.averageConfidence >= 0.6 ? 'bg-yellow-500' :
                            'bg-orange-500'
                          }`}
                          style={{ width: `${results.averageConfidence * 100}%` }}
                        />
                      </div>
                      <span className="ml-2 text-gray-600">{Math.round(results.averageConfidence * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* LLM Analysis */}
            {results.llmAnalysis && (
              <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                  {t('results.analysis')}
                </h3>
                <p className="text-gray-700">{results.llmAnalysis.overallAssessment}</p>
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations?.lifestyleChanges && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('results.lifestyle')}</h3>
                <div className="space-y-3">
                  {results.recommendations.lifestyleChanges.slice(0, 3).map((change: any, index: number) => (
                    <div key={index} className="bg-white/60 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{change.title}</h5>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          change.priority === 'high' ? 'bg-red-100 text-red-700' :
                          change.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {change.priority}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">{change.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Professional Help */}
            {results.recommendations?.professionalHelp?.recommended && (
              <div className="bg-blue-50/80 rounded-2xl p-5 border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2">{t('results.professional')}</h4>
                <p className="text-blue-800 text-sm">{results.recommendations.professionalHelp.reasoning}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-3 mt-6">
          <button onClick={() => router.push('/dashboard')} className="flex-1 btn-primary">
            {t('nav.dashboard')}
          </button>
          <button onClick={() => router.push('/chat')} className="flex-1 btn-secondary">
            {t('nav.chat')}
          </button>
        </div>
      </div>
    </div>
  )

  if (isStarting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 animate-pulse mx-auto mb-6" />
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-blue-400/30 animate-ping mx-auto" />
          </div>
          <p className="text-gray-600">{t('action.loading')}</p>
        </div>
      </div>
    )
  }

  if (crisisAlert) return renderCrisisAlert()
  if (isCompleted) return renderResults()

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50">
      {/* Background Orbs */}
      <div className="orb orb-blue w-96 h-96 -top-48 -left-48 animate-breathe" />
      <div className="orb orb-purple w-72 h-72 top-1/2 -right-36 animate-breathe" style={{ animationDelay: '2s' }} />
      <div className="orb orb-teal w-64 h-64 -bottom-32 left-1/4 animate-breathe" style={{ animationDelay: '4s' }} />

      {/* Header */}
      <header className="glass-effect border-b border-white/20 relative z-20 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={handleExit} className="mr-4 p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-white/50">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{t('assessment.title')}</h1>
                {assessment && (
                  <p className="text-sm text-gray-600">
                    {assessment.currentQuestionIndex} / {assessment.totalQuestions}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">{t('app.name')}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* Messages */}
        <div className="flex-1 space-y-4 mb-6 overflow-y-auto scrollbar-hide">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`animate-fade-in-up ${message.type === 'user-response' ? 'flex justify-end' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`max-w-[80%] ${
                message.type === 'user-response'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl rounded-br-md px-5 py-4 shadow-lg'
                  : 'bg-white/80 backdrop-blur-sm rounded-2xl rounded-bl-md px-5 py-4 shadow-md border border-white/50'
              }`}>
                {message.type === 'question' && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">{message.timestamp.toLocaleTimeString()}</p>
                        {ttsSpeakingId === message.id ? (
                          <button onClick={stopSpeaking} className="text-gray-400 hover:text-gray-600">
                            <VolumeX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => speakText(message.id, message.content)} className="text-gray-400 hover:text-gray-600">
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {message.type === 'user-response' && (
                  <div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-blue-100 mt-2">{message.timestamp.toLocaleTimeString()}</p>
                  </div>
                )}
                {message.type === 'ai-thinking' && (
                  <div className="flex items-center space-x-3">
                    <div className="loading-spinner w-5 h-5" />
                    <span className="text-gray-600">{message.content}</span>
                  </div>
                )}
                {message.type === 'clarification' && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                          {language === 'te' ? 'స్పష్టత కోసం' : 'Clarification'}
                        </span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                      {message.confidenceInfo && (
                        <p className="text-xs text-amber-600 mt-2 italic">
                          {language === 'te'
                            ? 'మీ ప్రతిస్పందన గురించి మరింత తెలుసుకోవడంలో సహాయపడండి'
                            : 'Help me understand your response better'}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">{message.timestamp.toLocaleTimeString()}</p>
                        {ttsSpeakingId === message.id ? (
                          <button onClick={stopSpeaking} className="text-gray-400 hover:text-gray-600">
                            <VolumeX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => speakText(message.id, message.content)} className="text-gray-400 hover:text-gray-600">
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="glass-effect rounded-2xl p-4 shadow-lg">
          <div className="flex space-x-3">
            <textarea
              ref={inputRef}
              value={isRecording && liveTranscript ? ((userResponse?.trim() ? userResponse + ' ' : '') + liveTranscript) : userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('assessment.typeResponse')}
              className="flex-1 resize-none bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-400"
              rows={3}
              disabled={isLoading}
            />
            {isSpeechRecognitionSupported() && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-3 py-2 self-end rounded-xl transition-all duration-300 ${
                  isRecording
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={handleSubmitResponse}
              disabled={!userResponse.trim() || isLoading}
              className="btn-primary px-4 py-2 self-end disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <div className="loading-spinner w-5 h-5" /> : <Send className="w-5 h-5" />}
            </button>
          </div>

          {isRecording && (
            <div className="mt-3 p-3 bg-green-50/50 rounded-xl">
              <div className="flex items-center mb-2 text-xs text-green-700">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                {language === 'te' ? 'వినబడుతోంది... సహజంగా మాట్లాడండి' : 'Listening... speak naturally'}
              </div>
              <div className="flex items-end space-x-1 h-8">
                {levels.map((h, idx) => (
                  <div key={idx} className="w-1.5 bg-green-400 rounded-sm transition-all duration-75" style={{ height: `${Math.max(10, h)}%` }} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500">
            {language === 'te'
              ? 'పంపడానికి Enter నొక్కండి, కొత్త లైన్ కోసం Shift+Enter'
              : 'Press Enter to send, Shift+Enter for new line'}
          </div>
        </div>
      </div>
    </div>
  )
}
