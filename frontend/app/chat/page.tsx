'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { chatAPI } from '../../lib/api'
import { ChatMessage } from '../../types'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { Send, Brain, User, HelpCircle, MessageCircle, ArrowLeft, Mic, Square, Volume2, VolumeX } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ChatInterfaceMessage {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  isThinking?: boolean
}

export default function ChatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatInterfaceMessage[]>([])
  const [committedMessage, setCommittedMessage] = useState('')
  const [interimMessage, setInterimMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [faq, setFaq] = useState<any[]>([])
  const [resources, setResources] = useState<any>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [ttsSpeakingId, setTtsSpeakingId] = useState<string | null>(null)
  const shouldRestartRef = useRef(false)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAudioAtRef = useRef<number>(0)
  const SILENCE_TIMEOUT_MS = 25000

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadInitialData = async () => {
    try {
      const [faqResponse, resourcesResponse] = await Promise.all([
        chatAPI.getFAQ(),
        chatAPI.getResources()
      ])
      
      setFaq(faqResponse.data.data.faqs)
      setResources(resourcesResponse.data.data.resources)
      
      // Add welcome message
      addMessage('ai', `Hello${user ? ` ${user.firstName}` : ''}! I'm here to help with questions about mental health, lifestyle recommendations, and general wellness. What would you like to know?`)
      
    } catch (error) {
      console.error('Failed to load initial data:', error)
      addMessage('ai', 'Hello! I\'m here to help with questions about mental health and wellness. What would you like to know?')
    } finally {
      setIsLoadingInitial(false)
    }
  }

  const addMessage = (type: 'user' | 'ai' | 'system', content: string, isThinking = false) => {
    const message: ChatInterfaceMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
      isThinking
    }
    setMessages(prev => [...prev, message])
  }

  const handleSendMessage = async () => {
    const composed = (committedMessage + (interimMessage ? (committedMessage ? ' ' : '') + interimMessage : '')).trim()
    if (!composed || isLoading) return

    const message = composed
    setCommittedMessage('')
    setInterimMessage('')
    
    // Add user message
    addMessage('user', message)
    
    // Add thinking indicator
    addMessage('ai', 'Thinking...', true)
    
    setIsLoading(true)
    
    try {
      const response = await chatAPI.sendMessage(message)
      const aiResponse = response.data.data.message
      
      // Remove thinking message and add actual response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isThinking)
        return [...filtered, {
          id: Date.now().toString(),
          type: 'ai' as const,
          content: aiResponse,
          timestamp: new Date()
        }]
      })
      
    } catch (error) {
      console.error('Failed to send message:', error)
      
      // Remove thinking message and add error response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isThinking)
        return [...filtered, {
          id: Date.now().toString(),
          type: 'ai' as const,
          content: 'I apologize, but I\'m having trouble processing your question right now. Please try again or contact support if the issue persists.',
          timestamp: new Date()
        }]
      })
      
      toast.error('Failed to send message')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFAQClick = (question: string) => {
    setCommittedMessage(question)
    setInterimMessage('')
    inputRef.current?.focus()
  }

  const handleQuickAction = (action: string) => {
    setCommittedMessage(action)
    setInterimMessage('')
    inputRef.current?.focus()
  }

  // --- Speech to Text (Web Speech API) ---
  const isSpeechRecognitionSupported = () => {
    if (typeof window === 'undefined') return false
    // @ts-ignore
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  const startRecording = () => {
    if (!isSpeechRecognitionSupported() || isRecording) return
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        mediaStreamRef.current = stream
        // Setup waveform visualizer
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const analyser = audioCtx.createAnalyser()
          analyser.fftSize = 2048
          const source = audioCtx.createMediaStreamSource(stream)
          source.connect(analyser)
          audioCtxRef.current = audioCtx
          analyserRef.current = analyser
          sourceRef.current = source
          const draw = () => {
            const canvas = canvasRef.current
            const analyserNode = analyserRef.current
            if (!canvas || !analyserNode) {
              animationIdRef.current = requestAnimationFrame(draw)
              return
            }
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              animationIdRef.current = requestAnimationFrame(draw)
              return
            }
            const width = canvas.width
            const height = canvas.height
            const bufferLength = analyserNode.fftSize
            const dataArray = new Uint8Array(bufferLength)
            analyserNode.getByteTimeDomainData(dataArray)
            ctx.clearRect(0, 0, width, height)
            // Background
            ctx.fillStyle = '#f0fdf4' // green-50
            ctx.fillRect(0, 0, width, height)
            // Wave line
            ctx.lineWidth = 2
            ctx.strokeStyle = '#16a34a' // green-600
            ctx.beginPath()
            const sliceWidth = width / bufferLength
            let x = 0
            for (let i = 0; i < bufferLength; i++) {
              const v = dataArray[i] / 128.0
              const y = (v * height) / 2
              if (i === 0) {
                ctx.moveTo(x, y)
              } else {
                ctx.lineTo(x, y)
              }
              x += sliceWidth
            }
            ctx.lineTo(width, height / 2)
            ctx.stroke()
            animationIdRef.current = requestAnimationFrame(draw)
          }
          animationIdRef.current = requestAnimationFrame(draw)
        } catch (_) {
          // ignore visualizer errors
        }
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.lang = 'en-US'
        recognition.maxAlternatives = 1
        recognition.interimResults = true
        recognition.continuous = true

        recognition.onstart = () => {
          setIsRecording(true)
          shouldRestartRef.current = true
          lastAudioAtRef.current = Date.now()
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = setTimeout(() => stopRecording(), SILENCE_TIMEOUT_MS)
        }

        recognition.onresult = (event: any) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i]
            const text = res[0]?.transcript || ''
            if (res.isFinal) {
              const finalText = text.trim()
              if (finalText) {
                setCommittedMessage(prev => {
                  const base = prev?.trim() ? prev + ' ' : ''
                  return (base + finalText).trim()
                })
                setInterimMessage('')
              }
            } else {
              interim += text
            }
          }
          setInterimMessage(interim.trim())
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
        }

        recognition.onerror = (e: any) => {
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
        setIsRecording(false)
        toast.error('Microphone permission denied or unavailable. Please allow mic access and try again.')
      })
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
    shouldRestartRef.current = false
    setIsRecording(false)
    setInterimMessage('')
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    // teardown audio visualizer
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }
    try {
      if (sourceRef.current) {
        sourceRef.current.disconnect()
        sourceRef.current = null
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect()
        analyserRef.current = null
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
    } catch (_) {}
  }

  // --- Text to Speech ---
  const isSpeechSynthesisSupported = () => {
    if (typeof window === 'undefined') return false
    return typeof window.speechSynthesis !== 'undefined'
  }

  const speakText = (id: string, text: string) => {
    if (!isSpeechSynthesisSupported()) return
    if (!text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onend = () => setTtsSpeakingId(null)
    setTtsSpeakingId(id)
    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (!isSpeechSynthesisSupported()) return
    window.speechSynthesis.cancel()
    setTtsSpeakingId(null)
  }

  if (isLoadingInitial) {
    return <LoadingSpinner message="Loading chat..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Mental Health Assistant</h1>
                <p className="text-sm text-gray-600">Ask questions about mental health and wellness</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium text-gray-700">MindScope</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl ${
                      message.type === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    } rounded-lg px-4 py-3 shadow-sm`}
                  >
                    <div className="flex items-start space-x-3">
                      {message.type === 'ai' && !message.isThinking && (
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-primary-600" />
                        </div>
                      )}
                      {message.type === 'user' && (
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {message.isThinking && (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="loading-spinner w-4 h-4" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs ${
                            message.type === 'user' ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                          {message.type === 'ai' && !message.isThinking && (
                            <div className="flex items-center space-x-2">
                              {ttsSpeakingId === message.id ? (
                                <button onClick={stopSpeaking} className="text-gray-500 hover:text-gray-700">
                                  <VolumeX className="w-4 h-4" />
                                </button>
                              ) : (
                                <button onClick={() => speakText(message.id, message.content)} className="text-gray-500 hover:text-gray-700">
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex space-x-3">
              <textarea
                ref={inputRef}
                value={(committedMessage + (interimMessage ? (committedMessage ? ' ' : '') + interimMessage : '')).trimStart()}
                onChange={(e) => setCommittedMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about mental health, lifestyle tips, or anything else..."
                className="flex-1 resize-none border-0 focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-500"
                rows={2}
                disabled={isLoading}
              />
              {isSpeechRecognitionSupported() && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-3 py-2 self-end rounded-md border ${isRecording ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-700'} hover:bg-gray-50`}
                  title={isRecording ? 'Stop voice input' : 'Start voice input'}
                >
                  {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
              {isRecording && (
                <div className="self-end h-10 w-40 border border-green-200 rounded-md overflow-hidden bg-green-50 flex items-center justify-center">
                  <canvas ref={canvasRef} width={300} height={32} />
                </div>
              )}
              <button
                onClick={handleSendMessage}
                disabled={!(committedMessage.trim() || interimMessage.trim()) || isLoading}
                className="btn-primary px-4 py-2 self-end disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="loading-spinner w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            <div className="mt-3 text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line
              {isSpeechRecognitionSupported() && (
                <span className="ml-2">• Click the mic to dictate your question</span>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Quick Questions
              </h3>
              <div className="space-y-2">
                {[
                  'What are the signs of depression?',
                  'How can I improve my sleep?',
                  'What lifestyle changes help with anxiety?',
                  'When should I seek professional help?'
                ].map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(question)}
                    className="w-full text-left p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ */}
            {faq.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Frequently Asked
                </h3>
                <div className="space-y-2">
                  {faq.slice(0, 5).map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleFAQClick(item.question)}
                      className="w-full text-left p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                    >
                      <div className="font-medium mb-1">{item.question}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{item.answer}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {resources && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Crisis Resources
                </h3>
                <div className="space-y-3">
                  {resources.crisis.contacts.map((contact: any, index: number) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="font-medium text-red-900 text-sm">{contact.name}</div>
                      {contact.phone && (
                        <div className="text-red-800 font-mono text-lg">{contact.phone}</div>
                      )}
                      {contact.text && (
                        <div className="text-red-800 text-sm">{contact.text}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Disclaimer:</strong> This chat is for informational purposes only and does not provide medical advice, diagnosis, or treatment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
