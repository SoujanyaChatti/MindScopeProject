'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../contexts/LanguageContext'
import { Brain, Play, History, User, Settings, LogOut, BarChart3, Calendar, Heart } from 'lucide-react'
import { assessmentAPI, userAPI } from '../../lib/api'
import { Assessment, UserStats } from '../../types'
import LoadingSpinner from '../../components/LoadingSpinner'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { t, language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentAssessments, setRecentAssessments] = useState<Assessment[]>([])
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    
    loadDashboardData()
  }, [user, router])

  const loadDashboardData = async () => {
    try {
      //historyResponse
      const [statsResponse] = await Promise.all([
        userAPI.getStats(),
        //assessmentAPI.getAssessmentHistory(1, 3)
      ])
      
      setStats(statsResponse.data.data.stats)
      //setRecentAssessments(historyResponse.data.data.assessments)
      
      // Check for active assessment
      // if (historyResponse.data.data.assessments.length > 0) {
      //   const latest = historyResponse.data.data.assessments[0]
      //   if (latest.status === 'in-progress') {
      //     setActiveAssessment(latest)
      //   }
      // }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleStartAssessment = () => {
    router.push('/assessment')
  }

  const handleContinueAssessment = () => {
    if (activeAssessment) {
      router.push(`/assessment/${activeAssessment.sessionId}`)
    }
  }

  const handleLogout = async () => {
    try {
      logout()
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'minimal': return 'text-success-600 bg-success-100'
      case 'mild': return 'text-warning-600 bg-warning-100'
      case 'moderate': return 'text-orange-600 bg-orange-100'
      case 'moderately-severe': return 'text-danger-600 bg-danger-100'
      case 'severe': return 'text-red-700 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Orbs */}
      <div className="orb orb-blue w-96 h-96 -top-48 -right-48 animate-breathe" />
      <div className="orb orb-purple w-72 h-72 bottom-1/4 -left-36 animate-breathe" style={{ animationDelay: '2s' }} />

      {/* Navigation */}
      <nav className="glass-effect border-b border-white/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">MindScope</span>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-white/50"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('dashboard.welcome')}, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-2">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Profile & Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card col-span-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.profile')}</h2>
                    <p className="text-sm text-gray-600">
                      {user?.firstName} {user?.lastName} • {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/dashboard/profile')}
                    className="btn-secondary text-sm"
                  >
                    {t('dashboard.manageProfile')}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 text-center border border-blue-100">
                    <div className="flex items-center justify-center mb-1">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {stats?.totalAssessments ?? 0}
                    </div>
                    <div className="text-xs text-gray-500">{t('dashboard.totalTests')}</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 text-center border border-purple-100">
                    <div className="flex items-center justify-center mb-1">
                      <Brain className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {typeof stats?.latestScore === 'number' ? stats?.latestScore : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">{t('dashboard.latestScore')}</div>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-3 text-center border border-teal-100">
                    <div className="flex items-center justify-center mb-1">
                      <Calendar className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {stats?.lastAssessment ? new Date(stats.lastAssessment).toLocaleDateString() : t('dashboard.never')}
                    </div>
                    <div className="text-xs text-gray-500">{t('dashboard.lastExam')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action card */}
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center mb-4">
              <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">{t('nav.assessment')}</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {activeAssessment
                ? t('dashboard.continueAssessment')
                : t('dashboard.startAssessmentDesc')
              }
            </p>
            <button
              onClick={activeAssessment ? handleContinueAssessment : handleStartAssessment}
              className="btn-primary w-full"
            >
              {activeAssessment ? t('action.continue') : t('action.start')}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Recovery Journey - NEW */}
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center mb-4">
              <div className="p-2 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">
                Recovery Journey
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Access your personalized recovery agents for sleep, mood, activity, and more.
            </p>
            <button
              onClick={() => router.push('/dashboard/recovery')}
              className="btn-primary w-full"
            >
              View Recovery
            </button>
          </div>

          {/* Assessment History */}
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center mb-4">
              <div className="p-2 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl">
                <History className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">
                {t('dashboard.history')}
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              {t('dashboard.historyDesc')}
            </p>
            <button
              onClick={() => router.push('/dashboard/history')}
              className="btn-secondary w-full"
            >
              {t('action.viewHistory')}
            </button>
          </div>

          {/* Profile Settings */}
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center mb-4">
              <div className="p-2 bg-gradient-to-br from-gray-100 to-slate-100 rounded-xl">
                <Settings className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">
                {t('dashboard.settings')}
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              {t('dashboard.settingsDesc')}
            </p>
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="btn-secondary w-full"
            >
              {t('dashboard.manageProfile')}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="card text-center animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl w-fit mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalAssessments}</h3>
              <p className="text-gray-600">{t('dashboard.totalAssessments')}</p>
            </div>

            <div className="card text-center animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl w-fit mx-auto mb-3">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats.averageScore ? Math.round(stats.averageScore) : 'N/A'}
              </h3>
              <p className="text-gray-600">{t('dashboard.averageScore')}</p>
            </div>

            <div className="card text-center animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl w-fit mx-auto mb-3">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stats.latestScore ?? 'N/A'}</h3>
              <p className="text-gray-600">{t('dashboard.latestScore')}</p>
            </div>

            <div className="card text-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <div className="p-2 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl w-fit mx-auto mb-3">
                <Calendar className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats.lastAssessment ? new Date(stats.lastAssessment).toLocaleDateString() : t('dashboard.never')}
              </h3>
              <p className="text-gray-600">{t('dashboard.lastAssessment')}</p>
            </div>
          </div>
        )}

        {/* Recent Assessments */}
        {recentAssessments.length > 0 && (
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.9s' }}>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('dashboard.recentAssessments')}</h2>
            <div className="space-y-4">
              {recentAssessments.map((assessment) => (
                <div key={assessment.id} className="bg-gray-50/70 border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {t('nav.assessment')} #{assessment.sessionId.slice(-8)}
                        </span>
                        {assessment.snamScores && (
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getSeverityColor(assessment.snamScores.severityLevel)}`}>
                            {language === 'te' ? t(`severity.${assessment.snamScores.severityLevel}`) : assessment.snamScores.severityLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {t('dashboard.completedOn')} {new Date(assessment.metadata.startTime).toLocaleDateString()}
                        {assessment.snamScores && (
                          <span className="ml-2">
                            • {t('assessment.score')}: {assessment.snamScores.totalScore}/33
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/results/${assessment.sessionId}`)}
                      className="btn-secondary text-sm"
                    >
                      {t('action.viewDetails')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {recentAssessments.length >= 3 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push('/dashboard/history')}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  {t('action.viewAll')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}