'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../../contexts/LanguageContext'
import { assessmentAPI } from '../../../lib/api'
import { Assessment } from '../../../types'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import { ArrowLeft, ChevronLeft, ChevronRight, History, Brain } from 'lucide-react'

export default function AssessmentHistoryPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = async (p: number) => {
    try {
      const res = await assessmentAPI.getAssessmentHistory(p, 10)
      const data = res.data.data
      setAssessments(data.assessments)
      setTotalPages(data.pagination.totalPages)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const getSeverityColor = (level?: string) => {
    switch (level) {
      case 'none': return 'text-green-600 bg-green-100'
      case 'mild': return 'text-yellow-600 bg-yellow-100'
      case 'moderate': return 'text-orange-600 bg-orange-100'
      case 'severe': return 'text-red-600 bg-red-100'
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

      {/* Header */}
      <div className="glass-effect border-b border-white/20 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-800 mr-3 p-2 rounded-lg hover:bg-white/50">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center mr-2">
                <History className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">{t('dashboard.history')}</h1>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {assessments.length === 0 ? (
          <div className="card text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600">{t('history.noAssessments')}</p>
            <button
              onClick={() => router.push('/assessment')}
              className="btn-primary mt-4"
            >
              {t('action.start')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {assessments.map((a, index) => (
              <div key={a.sessionId} className="card animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {t('nav.assessment')} #{a.sessionId.slice(-8)}
                      </span>
                      {a.snamScores && (
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${getSeverityColor(a.snamScores.severityLevel)}`}>
                          {language === 'te' ? t(`severity.${a.snamScores.severityLevel}`) : a.snamScores.severityLevel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('dashboard.completedOn')} {new Date(a.metadata?.startTime || a.createdAt || Date.now()).toLocaleString()}
                      {a.snamScores && (
                        <span className="ml-2">• {t('assessment.score')}: {a.snamScores.totalScore}/33</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/results/${a.sessionId}`)}
                    className="btn-secondary text-sm"
                  >
                    {t('action.viewDetails')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center space-x-3 animate-fade-in-up">
            <button
              className="btn-secondary flex items-center"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> {t('action.prev')}
            </button>
            <span className="text-sm text-gray-600 px-4">
              {language === 'en' ? `Page ${page} of ${totalPages}` : `పేజీ ${page} / ${totalPages}`}
            </span>
            <button
              className="btn-secondary flex items-center"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t('action.next')} <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
