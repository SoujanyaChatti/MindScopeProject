'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { assessmentAPI } from '../../../../lib/api'
import { Assessment } from '../../../../types'
import { useLanguage } from '../../../../contexts/LanguageContext'
import LoadingSpinner from '../../../../components/LoadingSpinner'
import LanguageSwitcher from '../../../../components/LanguageSwitcher'
import { ArrowLeft, AlertTriangle, CheckCircle, MessageSquare, Brain, Heart, Activity, Sparkles } from 'lucide-react'

export default function AssessmentResultsPage() {
  const router = useRouter()
  const params = useParams()
  const { t, language } = useLanguage()
  const sessionId = params.sessionId as string
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAssessment = async () => {
      try {
        const res = await assessmentAPI.getAssessment(sessionId)
        setAssessment(res.data.data.assessment)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load assessment')
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      loadAssessment()
    }
  }, [sessionId])

  const getSeverityColor = (level?: string) => {
    switch (level) {
      case 'none': return 'text-green-600 bg-green-100'
      case 'mild': return 'text-yellow-600 bg-yellow-100'
      case 'moderate': return 'text-orange-600 bg-orange-100'
      case 'severe': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityIcon = (level?: string) => {
    switch (level) {
      case 'none': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'mild': return <Activity className="w-5 h-5 text-yellow-600" />
      case 'moderate': return <AlertTriangle className="w-5 h-5 text-orange-600" />
      case 'severe': return <AlertTriangle className="w-5 h-5 text-red-600" />
      default: return <Activity className="w-5 h-5 text-gray-600" />
    }
  }

  const getCriteriaName = (criteria: number) => {
    const names: Record<number, string> = {
      1: 'Feeling Sad/Empty',
      2: 'Loss of Interest',
      3: 'Self-Worth Issues',
      4: 'Concentration Problems',
      5: 'Excessive Worry',
      6: 'Scary Thoughts',
      7: 'Sleep Problems',
      8: 'Eating Changes',
      9: 'Psychomotor Changes',
      10: 'Low Energy',
      11: 'Functioning Impairment'
    }
    return names[criteria] || `Criterion ${criteria}`
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

  if (error || !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center max-w-md animate-fade-in-up">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Assessment</h2>
          <p className="text-gray-600 mb-6">{error || 'Assessment not found'}</p>
          <button onClick={() => router.push('/dashboard/history')} className="btn-primary">
            {t('action.back')}
          </button>
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
            <button onClick={() => router.push('/dashboard/history')} className="text-gray-600 hover:text-gray-800 mr-3 p-2 rounded-lg hover:bg-white/50">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-2">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">{t('results.title')}</h1>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        {/* Score Summary */}
        <div className="card animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('results.title')}</h2>
            <span className="text-sm text-gray-500">
              {new Date(assessment.metadata?.startTime || Date.now()).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 text-center">
              <p className="text-sm text-gray-600 mb-2">{t('assessment.score')}</p>
              <p className="text-4xl font-bold text-gradient">
                {assessment.snamScores?.totalScore || 0}/33
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 text-center">
              <p className="text-sm text-gray-600 mb-2">{t('assessment.severity')}</p>
              <div className="flex items-center justify-center space-x-2">
                {getSeverityIcon(assessment.snamScores?.severityLevel)}
                <span className={`px-3 py-1.5 text-sm font-medium rounded-full capitalize ${getSeverityColor(assessment.snamScores?.severityLevel)}`}>
                  {language === 'te' ? t(`severity.${assessment.snamScores?.severityLevel || 'none'}`) : assessment.snamScores?.severityLevel || 'Unknown'}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 text-center">
              <p className="text-sm text-gray-600 mb-2">Core Criteria</p>
              <p className="text-lg font-semibold">
                {assessment.snamScores?.meetsCoreCriteria ? (
                  <span className="text-orange-600">Yes</span>
                ) : (
                  <span className="text-green-600">No</span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50/50 rounded-xl text-sm text-blue-700 border border-blue-100">
            <strong>Scoring Guide:</strong> 0-13 = No Depression, 14-16 = Mild, 17-20 = Moderate, 21-33 = Severe
          </div>
        </div>

        {/* LLM Analysis */}
        {assessment.llmAnalysis && (
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
              {t('results.analysis')}
            </h2>

            <p className="text-gray-700 mb-4 leading-relaxed">{assessment.llmAnalysis.overallAssessment}</p>

            {assessment.llmAnalysis.keyObservations && assessment.llmAnalysis.keyObservations.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('results.observations')}</h3>
                <ul className="space-y-2">
                  {assessment.llmAnalysis.keyObservations.map((obs, i) => (
                    <li key={i} className="flex items-start text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 mr-2 flex-shrink-0" />
                      {obs}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessment.llmAnalysis.riskFactors && assessment.llmAnalysis.riskFactors.length > 0 && (
                <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">{t('results.riskFactors')}</h3>
                  <ul className="space-y-1">
                    {assessment.llmAnalysis.riskFactors.map((risk, i) => (
                      <li key={i} className="flex items-start text-sm text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 mr-2 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {assessment.llmAnalysis.protectiveFactors && assessment.llmAnalysis.protectiveFactors.length > 0 && (
                <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
                  <h3 className="text-sm font-semibold text-green-800 mb-2">{t('results.protectiveFactors')}</h3>
                  <ul className="space-y-1">
                    {assessment.llmAnalysis.protectiveFactors.map((factor, i) => (
                      <li key={i} className="flex items-start text-sm text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 mr-2 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Criteria Breakdown */}
        {assessment.snamScores?.criteriaScores && assessment.snamScores.criteriaScores.length > 0 && (
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('results.criteria')}</h2>
            <div className="space-y-3">
              {assessment.snamScores.criteriaScores.map((item) => (
                <div key={item.criteria} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">{getCriteriaName(item.criteria)}</p>
                    <p className="text-sm text-gray-500 capitalize">{item.category.replace(/-/g, ' ')}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${item.score >= 2 ? 'bg-gradient-to-r from-red-400 to-red-500' : item.score >= 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gradient-to-r from-green-400 to-green-500'}`}
                        style={{ width: `${(item.score / 3) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{item.score}/3</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversation History */}
        {assessment.responses && assessment.responses.length > 0 && (
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
              {t('results.conversation')}
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {assessment.responses.map((response, index) => (
                <div key={index} className="border-l-3 border-gradient-to-b from-blue-400 to-indigo-500 pl-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-2 border border-blue-100">
                    <p className="text-sm font-medium text-blue-900 mb-1">{t('results.question')}:</p>
                    <p className="text-sm text-blue-800">{response.questionText}</p>
                  </div>
                  <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
                    <p className="text-sm font-medium text-gray-900 mb-1">{t('results.yourResponse')}:</p>
                    <p className="text-sm text-gray-700">{response.userResponse}</p>
                    {response.snamMapping && (
                      <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200">
                        {t('assessment.score')}: {response.snamMapping.score}/3 •
                        {language === 'en' ? 'Category' : 'వర్గం'}: {response.snamMapping.category?.replace(/-/g, ' ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {assessment.recommendations && (
          <div className="card animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Heart className="w-5 h-5 mr-2 text-pink-600" />
              {t('results.recommendations')}
            </h2>

            {assessment.recommendations.lifestyleChanges && assessment.recommendations.lifestyleChanges.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('results.lifestyle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {assessment.recommendations.lifestyleChanges.map((rec, i) => (
                    <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">{rec.title}</p>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assessment.recommendations.professionalHelp && (
              <div className={`p-5 rounded-xl border ${
                assessment.recommendations.professionalHelp.urgency === 'immediate' ? 'bg-red-50/70 border-red-100' :
                assessment.recommendations.professionalHelp.urgency === 'soon' ? 'bg-orange-50/70 border-orange-100' :
                'bg-blue-50/70 border-blue-100'
              }`}>
                <h3 className="text-sm font-semibold mb-2">
                  {t('results.professionalHelp')}: {assessment.recommendations.professionalHelp.recommended ?
                    (language === 'en' ? 'Recommended' : 'సిఫారసు చేయబడింది') :
                    (language === 'en' ? 'Optional' : 'ఐచ్ఛికం')}
                </h3>
                <p className="text-sm mb-3">{assessment.recommendations.professionalHelp.reasoning}</p>
                {assessment.recommendations.professionalHelp.resources && (
                  <div className="mt-3 pt-3 border-t border-gray-200/50">
                    <p className="text-xs font-semibold mb-2">{language === 'en' ? 'Resources' : 'వనరులు'}:</p>
                    <ul className="text-xs space-y-1.5">
                      {assessment.recommendations.professionalHelp.resources.map((res, i) => (
                        <li key={i} className="flex items-start">
                          <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 mr-2 flex-shrink-0" />
                          {res}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Back Button */}
        <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <button onClick={() => router.push('/dashboard/history')} className="btn-secondary">
            {t('action.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
