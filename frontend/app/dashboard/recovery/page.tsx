'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import {
  Brain, Moon, Activity, Heart, AlertCircle, Apple, Zap,
  ChevronRight, Check, Clock, Target, Sparkles, ArrowLeft,
  MessageCircle, RefreshCw, Pause, Play
} from 'lucide-react'
import { recoveryAPI } from '../../../lib/api'
import toast from 'react-hot-toast'

interface Agent {
  name: string
  isActive: boolean
  priority: string
  checkInStreak: number
  totalCheckIns: number
  lastCheckIn: string | null
}

interface RecoveryStatus {
  hasActiveRecovery: boolean
  recovery?: {
    id: string
    status: string
    planStartDate: string
    plannedDurationDays: number
    activeAgents: Agent[]
    initialSeverity: {
      level: string
      totalScore: number
    }
    totalCheckIns: number
    daysActive: number
  }
  message?: string
}

interface QuickResponse {
  label: string
  value: string
  score?: number
}

interface CheckIn {
  agent: string
  type: string
  message: string
  quickResponses?: (string | QuickResponse)[]
}

// Helper function to get display text from quick response
function getQuickResponseText(qr: string | QuickResponse): string {
  if (typeof qr === 'string') return qr
  return qr.label || qr.value || ''
}

// Helper function to get value for submission
function getQuickResponseValue(qr: string | QuickResponse): string {
  if (typeof qr === 'string') return qr
  return qr.value || qr.label || ''
}

const agentIcons: Record<string, any> = {
  sleep: Moon,
  activity: Activity,
  mood: Heart,
  worry: AlertCircle,
  nutrition: Apple,
  energy: Zap
}

const agentColors: Record<string, string> = {
  sleep: 'from-indigo-500 to-purple-600',
  activity: 'from-green-500 to-emerald-600',
  mood: 'from-pink-500 to-rose-600',
  worry: 'from-amber-500 to-orange-600',
  nutrition: 'from-lime-500 to-green-600',
  energy: 'from-yellow-500 to-amber-600'
}

const agentDescriptions: Record<string, string> = {
  sleep: 'Sleep hygiene and CBT-I techniques',
  activity: 'Behavioral activation therapy',
  mood: 'CBT thought records and self-compassion',
  worry: 'Grounding, breathing, and worry management',
  nutrition: 'Balanced eating and meal consistency',
  energy: 'Energy management and pacing'
}

export default function RecoveryPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<RecoveryStatus | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'checkin' | 'tools'>('overview')

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    loadRecoveryStatus()
  }, [user, router])

  const loadRecoveryStatus = async () => {
    try {
      setLoading(true)
      const res = await recoveryAPI.getStatus()
      setStatus(res.data)

      if (res.data.hasActiveRecovery) {
        const checkInRes = await recoveryAPI.getCheckIn()
        setCheckIns(checkInRes.data.checkIns || [])
      }
    } catch (error) {
      console.error('Failed to load recovery status:', error)
      toast.error('Failed to load recovery data')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickResponse = async (agentName: string, quickResponse: string) => {
    try {
      setSubmitting(true)
      const res = await recoveryAPI.submitCheckIn(agentName, quickResponse, quickResponse)
      toast.success('Check-in submitted!')

      // Show follow-up
      if (res.data.followUp) {
        toast(res.data.followUp, { duration: 5000, icon: '💬' })
      }

      // Refresh check-ins
      const checkInRes = await recoveryAPI.getCheckIn()
      setCheckIns(checkInRes.data.checkIns || [])
      setSelectedAgent(null)
    } catch (error) {
      toast.error('Failed to submit check-in')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCustomResponse = async (agentName: string) => {
    if (!response.trim()) return

    try {
      setSubmitting(true)
      const res = await recoveryAPI.submitCheckIn(agentName, response)
      toast.success('Check-in submitted!')

      if (res.data.followUp) {
        toast(res.data.followUp, { duration: 5000, icon: '💬' })
      }

      setResponse('')
      const checkInRes = await recoveryAPI.getCheckIn()
      setCheckIns(checkInRes.data.checkIns || [])
      setSelectedAgent(null)
    } catch (error) {
      toast.error('Failed to submit check-in')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePauseResume = async () => {
    try {
      if (status?.recovery?.status === 'active') {
        await recoveryAPI.pause()
        toast.success('Recovery plan paused')
      } else {
        await recoveryAPI.resume()
        toast.success('Recovery plan resumed')
      }
      loadRecoveryStatus()
    } catch (error) {
      toast.error('Failed to update recovery status')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading recovery plan...</p>
        </div>
      </div>
    )
  }

  if (!status?.hasActiveRecovery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>

          <div className="card p-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Active Recovery Plan</h1>
            <p className="text-gray-600 mb-6">
              Complete an assessment to activate personalized recovery agents that will help you
              with sleep, activity, mood, and more.
            </p>
            <button
              onClick={() => router.push('/assessment')}
              className="btn-primary"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    )
  }

  const recovery = status.recovery!

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Recovery Journey</h1>
                <p className="text-sm text-gray-600">
                  Day {recovery.daysActive} of {recovery.plannedDurationDays}
                </p>
              </div>
            </div>
            <button
              onClick={handlePauseResume}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                recovery.status === 'active'
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {recovery.status === 'active' ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              )}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mt-4">
            {(['overview', 'checkin', 'tools'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'checkin' && 'Check-in'}
                {tab === 'tools' && 'Tools & Exercises'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{recovery.daysActive}</div>
                <div className="text-sm text-gray-600">Days Active</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{recovery.totalCheckIns}</div>
                <div className="text-sm text-gray-600">Total Check-ins</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{recovery.activeAgents.length}</div>
                <div className="text-sm text-gray-600">Active Agents</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">
                  {Math.max(...recovery.activeAgents.map(a => a.checkInStreak))}
                </div>
                <div className="text-sm text-gray-600">Best Streak</div>
              </div>
            </div>

            {/* Active Agents */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Recovery Agents</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recovery.activeAgents.map((agent) => {
                  const Icon = agentIcons[agent.name] || Brain
                  const color = agentColors[agent.name] || 'from-gray-500 to-gray-600'

                  return (
                    <div
                      key={agent.name}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${color}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          agent.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : agent.priority === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {agent.priority} priority
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 capitalize mb-1">{agent.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{agentDescriptions[agent.name]}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {agent.totalCheckIns} check-ins
                        </span>
                        <span className="flex items-center text-amber-600">
                          <Sparkles className="w-4 h-4 mr-1" />
                          {agent.checkInStreak} streak
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Check-in Tab */}
        {activeTab === 'checkin' && (
          <div className="space-y-6">
            {checkIns.length === 0 ? (
              <div className="card p-8 text-center">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600">You've completed all your check-ins for now.</p>
              </div>
            ) : (
              checkIns.map((checkIn, index) => {
                const Icon = agentIcons[checkIn.agent] || Brain
                const color = agentColors[checkIn.agent] || 'from-gray-500 to-gray-600'
                const isSelected = selectedAgent === checkIn.agent

                return (
                  <div key={index} className="card">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 capitalize mb-1">
                          {checkIn.agent} Agent
                        </h3>
                        <p className="text-gray-700 mb-4">{checkIn.message}</p>

                        {checkIn.quickResponses && checkIn.quickResponses.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {checkIn.quickResponses.map((qr, i) => (
                              <button
                                key={i}
                                onClick={() => handleQuickResponse(checkIn.agent, getQuickResponseValue(qr))}
                                disabled={submitting}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
                              >
                                {getQuickResponseText(qr)}
                              </button>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => setSelectedAgent(isSelected ? null : checkIn.agent)}
                          className="text-blue-600 text-sm font-medium flex items-center"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {isSelected ? 'Cancel' : 'Write custom response'}
                        </button>

                        {isSelected && (
                          <div className="mt-4">
                            <textarea
                              value={response}
                              onChange={(e) => setResponse(e.target.value)}
                              placeholder="Share how you're feeling..."
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={3}
                            />
                            <button
                              onClick={() => handleCustomResponse(checkIn.agent)}
                              disabled={submitting || !response.trim()}
                              className="mt-2 btn-primary"
                            >
                              {submitting ? 'Submitting...' : 'Submit Response'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            <button
              onClick={loadRecoveryStatus}
              className="flex items-center justify-center w-full py-3 text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Check-ins
            </button>
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            {recovery.activeAgents.map((agent) => {
              const Icon = agentIcons[agent.name] || Brain
              const color = agentColors[agent.name] || 'from-gray-500 to-gray-600'

              return (
                <AgentTools
                  key={agent.name}
                  agentName={agent.name}
                  icon={Icon}
                  color={color}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Separate component for agent tools
function AgentTools({ agentName, icon: Icon, color }: { agentName: string; icon: any; color: string }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toolResult, setToolResult] = useState<any>(null)

  const handleTool = async (toolType: string) => {
    setLoading(true)
    setToolResult(null)

    try {
      let result
      switch (toolType) {
        case 'affirmation':
          result = await recoveryAPI.agents.getAffirmation()
          break
        case 'grounding':
          result = await recoveryAPI.agents.getGrounding()
          break
        case 'challenge':
          result = await recoveryAPI.agents.getChallenge()
          break
        case 'activitySuggestion':
          result = await recoveryAPI.agents.getActivitySuggestion('low')
          break
        case 'panicSupport':
          result = await recoveryAPI.agents.getPanicSupport('during')
          break
        default:
          result = await recoveryAPI.agents.getExercises(agentName)
      }
      setToolResult(result.data)
    } catch (error) {
      toast.error('Failed to load tool')
    } finally {
      setLoading(false)
    }
  }

  const tools: Record<string, { label: string; action: string }[]> = {
    sleep: [
      { label: 'Relaxation Exercises', action: 'exercises' },
    ],
    activity: [
      { label: 'Get Activity Suggestion', action: 'activitySuggestion' },
      { label: 'Mini Challenge', action: 'challenge' },
    ],
    mood: [
      { label: 'Get Affirmation', action: 'affirmation' },
    ],
    worry: [
      { label: 'Grounding Exercise', action: 'grounding' },
      { label: 'Panic Support', action: 'panicSupport' },
    ],
    nutrition: [
      { label: 'Meal Ideas', action: 'exercises' },
    ],
    energy: [
      { label: 'Energy Tips', action: 'exercises' },
    ],
  }

  const agentTools = tools[agentName] || []

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="ml-3 font-semibold text-gray-900 capitalize">{agentName} Tools</h3>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2 mb-4">
            {agentTools.map((tool) => (
              <button
                key={tool.action}
                onClick={() => handleTool(tool.action)}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
              >
                {tool.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {toolResult && (
            <div className="bg-gray-50 rounded-lg p-4">
              {toolResult.affirmation && (
                <p className="text-lg text-gray-800 italic">"{toolResult.affirmation}"</p>
              )}
              {toolResult.grounding?.exercise && (
                <div>
                  <h4 className="font-semibold mb-2">{toolResult.grounding.exercise.name}</h4>
                  <p className="text-gray-600 whitespace-pre-line">{toolResult.grounding.exercise.script}</p>
                </div>
              )}
              {toolResult.grounding?.message && !toolResult.grounding?.exercise && (
                <p className="text-gray-700">{toolResult.grounding.message}</p>
              )}
              {toolResult.challenge && (
                <div>
                  <h4 className="font-semibold mb-2">
                    {typeof toolResult.challenge === 'string'
                      ? toolResult.challenge
                      : toolResult.challenge.challenge || 'Micro Challenge'}
                  </h4>
                  {typeof toolResult.challenge === 'object' && toolResult.challenge.reward && (
                    <p className="text-sm text-green-600">Reward: {toolResult.challenge.reward}</p>
                  )}
                  {typeof toolResult.challenge === 'object' && toolResult.challenge.duration && (
                    <p className="text-sm text-gray-500">Duration: {toolResult.challenge.duration}</p>
                  )}
                </div>
              )}
              {toolResult.suggestion && (
                <div>
                  <h4 className="font-semibold mb-2">
                    {typeof toolResult.suggestion === 'string'
                      ? toolResult.suggestion
                      : toolResult.suggestion.activity || 'Activity Suggestion'}
                  </h4>
                  {typeof toolResult.suggestion === 'object' && toolResult.suggestion.duration && (
                    <p className="text-sm text-gray-500">Duration: {toolResult.suggestion.duration}</p>
                  )}
                  {typeof toolResult.suggestion === 'object' && toolResult.suggestion.type && (
                    <p className="text-sm text-blue-600 capitalize">Type: {toolResult.suggestion.type}</p>
                  )}
                </div>
              )}
              {toolResult.support && (
                <div>
                  <h4 className="font-semibold mb-2">{toolResult.support.title}</h4>
                  <p className="text-gray-700 mb-3">{toolResult.support.immediateMessage}</p>
                  {toolResult.support.steps && (
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {toolResult.support.steps.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {toolResult.exercises && (
                <ExerciseDisplay exercises={toolResult.exercises} />
              )}
              {toolResult.intervention && (
                <InterventionDisplay intervention={toolResult.intervention} />
              )}
              {/* Catch-all for any other data */}
              {!toolResult.affirmation && !toolResult.grounding && !toolResult.challenge &&
               !toolResult.suggestion && !toolResult.support && !toolResult.exercises &&
               !toolResult.intervention && toolResult.message && (
                <p className="text-gray-700">{toolResult.message}</p>
              )}
              {/* Fallback: render remaining properties if nothing else matched */}
              {!toolResult.affirmation && !toolResult.grounding && !toolResult.challenge &&
               !toolResult.suggestion && !toolResult.support && !toolResult.exercises &&
               !toolResult.intervention && !toolResult.message && (
                <SafeRender value={toolResult} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper component to safely render any value
function SafeRender({ value }: { value: any }): JSX.Element | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <>{String(value)}</>
  }

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, i) => (
          <li key={i}><SafeRender value={item} /></li>
        ))}
      </ul>
    )
  }

  if (typeof value === 'object') {
    // Handle {label, value} pattern
    if ('label' in value && 'value' in value) {
      return <span><strong>{value.label}:</strong> {String(value.value)}</span>
    }
    // Handle other objects by listing their properties
    return (
      <div className="space-y-1">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <span className="font-medium capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
            <SafeRender value={v} />
          </div>
        ))}
      </div>
    )
  }

  return null
}

// Component to display exercises properly
function ExerciseDisplay({ exercises }: { exercises: any }) {
  if (!exercises) return null

  // Handle array of exercises
  if (Array.isArray(exercises)) {
    return (
      <div className="space-y-4">
        {exercises.map((exercise, index) => (
          <div key={index} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
            {exercise.name && <h4 className="font-semibold text-gray-900 mb-2">{exercise.name}</h4>}
            {exercise.title && <h4 className="font-semibold text-gray-900 mb-2">{exercise.title}</h4>}
            {exercise.description && <p className="text-gray-700 mb-2">{exercise.description}</p>}
            {exercise.script && <p className="text-gray-600 whitespace-pre-line mb-2">{exercise.script}</p>}
            {exercise.instructions && (
              <div className="text-gray-600">
                {typeof exercise.instructions === 'string' ? (
                  <p>{exercise.instructions}</p>
                ) : Array.isArray(exercise.instructions) ? (
                  <ol className="list-decimal list-inside space-y-1">
                    {exercise.instructions.map((inst: string, i: number) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ol>
                ) : (
                  <SafeRender value={exercise.instructions} />
                )}
              </div>
            )}
            {exercise.steps && (
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                {exercise.steps.map((step: any, i: number) => (
                  <li key={i}>{typeof step === 'string' ? step : step.instruction || step.step || <SafeRender value={step} />}</li>
                ))}
              </ol>
            )}
            {exercise.duration && (
              <p className="text-sm text-gray-500 mt-2">Duration: {exercise.duration}</p>
            )}
            {exercise.benefits && (
              <p className="text-sm text-green-600 mt-1">Benefits: {
                Array.isArray(exercise.benefits) ? exercise.benefits.join(', ') : exercise.benefits
              }</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Handle single exercise object
  if (typeof exercises === 'object') {
    return (
      <div>
        {exercises.name && <h4 className="font-semibold text-gray-900 mb-2">{exercises.name}</h4>}
        {exercises.title && <h4 className="font-semibold text-gray-900 mb-2">{exercises.title}</h4>}
        {exercises.description && <p className="text-gray-700 mb-2">{exercises.description}</p>}
        {exercises.message && <p className="text-gray-700 mb-2">{exercises.message}</p>}
        {exercises.script && <p className="text-gray-600 whitespace-pre-line">{exercises.script}</p>}
        {exercises.items && Array.isArray(exercises.items) && (
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            {exercises.items.map((item: any, i: number) => (
              <li key={i}>{typeof item === 'string' ? item : item.name || item.title || <SafeRender value={item} />}</li>
            ))}
          </ul>
        )}
        {/* Fallback for other properties */}
        {!exercises.name && !exercises.title && !exercises.description && !exercises.message && !exercises.script && !exercises.items && (
          <SafeRender value={exercises} />
        )}
      </div>
    )
  }

  // Handle string
  if (typeof exercises === 'string') {
    return <p className="text-gray-700">{exercises}</p>
  }

  return null
}

// Component to display interventions properly
function InterventionDisplay({ intervention }: { intervention: any }) {
  if (!intervention) return null

  return (
    <div className="space-y-3">
      {intervention.title && <h4 className="font-semibold text-gray-900">{intervention.title}</h4>}
      {intervention.message && <p className="text-gray-700">{intervention.message}</p>}
      {intervention.description && <p className="text-gray-600">{intervention.description}</p>}

      {intervention.tips && Array.isArray(intervention.tips) && (
        <div>
          <h5 className="font-medium text-gray-800 mb-1">Tips:</h5>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            {intervention.tips.map((tip: any, i: number) => (
              <li key={i}>{typeof tip === 'string' ? tip : tip.text || tip.tip || <SafeRender value={tip} />}</li>
            ))}
          </ul>
        </div>
      )}

      {intervention.techniques && Array.isArray(intervention.techniques) && (
        <div>
          <h5 className="font-medium text-gray-800 mb-1">Techniques:</h5>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            {intervention.techniques.map((tech: any, i: number) => (
              <li key={i}>{typeof tech === 'string' ? tech : tech.name || tech.title || <SafeRender value={tech} />}</li>
            ))}
          </ul>
        </div>
      )}

      {intervention.resources && Array.isArray(intervention.resources) && (
        <div>
          <h5 className="font-medium text-gray-800 mb-1">Resources:</h5>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            {intervention.resources.map((res: any, i: number) => (
              <li key={i}>{typeof res === 'string' ? res : res.title || res.name || <SafeRender value={res} />}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Fallback for unhandled properties */}
      {!intervention.title && !intervention.message && !intervention.description &&
       !intervention.tips && !intervention.techniques && !intervention.resources && (
        <SafeRender value={intervention} />
      )}
    </div>
  )
}
