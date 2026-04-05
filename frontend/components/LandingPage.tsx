'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Shield, Users, MessageCircle, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const router = useRouter()

  const features = [
    {
      icon: <MessageCircle className="w-8 h-8 text-primary-600" />,
      title: 'Conversational Assessment',
      description: 'Natural, AI-powered conversations instead of rigid questionnaires'
    },
    {
      icon: <Brain className="w-8 h-8 text-primary-600" />,
      title: 'AI-Powered Analysis',
      description: 'Advanced language processing maps responses to clinical PHQ-9 scores'
    },
    {
      icon: <Shield className="w-8 h-8 text-primary-600" />,
      title: 'Privacy First',
      description: 'Secure, encrypted data storage with complete user privacy protection'
    },
    {
      icon: <Users className="w-8 h-8 text-primary-600" />,
      title: 'Personalized Recommendations',
      description: 'Tailored lifestyle suggestions based on your unique assessment results'
    }
  ]

  const benefits = [
    'Clinically validated PHQ-9 assessment',
    'Natural conversation flow',
    'Personalized lifestyle recommendations',
    'Secure and private',
    'Accessible anytime, anywhere',
    'Professional support guidance'
  ]

  const handleGetStarted = () => {
    if (isDemoMode) {
      router.push('/demo')
    } else {
      router.push('/auth/register')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">MindScope</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI-Powered Mental Health
              <span className="text-primary-600 block">Assessment & Support</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Experience a revolutionary approach to depression screening through natural conversations 
              with AI, backed by clinical validation and personalized lifestyle recommendations.
            </p>
            
            {/* Demo Mode Toggle */}
            <div className="flex items-center justify-center mb-8">
              <span className={`text-sm font-medium ${!isDemoMode ? 'text-gray-900' : 'text-gray-500'}`}>
                Full Access
              </span>
              <button
                onClick={() => setIsDemoMode(!isDemoMode)}
                className={`mx-3 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDemoMode ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDemoMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isDemoMode ? 'text-gray-900' : 'text-gray-500'}`}>
                Demo Mode
              </span>
            </div>

            <button
              onClick={handleGetStarted}
              className="btn-primary text-lg px-8 py-3 inline-flex items-center group"
            >
              {isDemoMode ? 'Try Demo' : 'Start Assessment'}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <p className="text-sm text-gray-500 mt-4">
              Free • Secure • No Medical Diagnosis
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose MindScope?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Combining cutting-edge AI with clinical expertise to provide accurate, 
              accessible mental health screening and support.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Take Control of Your Mental Health
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our AI-powered assessment provides clinically validated insights while 
                maintaining the privacy and comfort you deserve.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-success-600 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="bg-primary-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Assessment Preview
                </h3>
                <p className="text-gray-600 text-sm">
                  "How are you feeling today? Can you describe your current emotional state?"
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <p className="text-gray-600 text-sm italic">
                  "I've been feeling really down lately, like nothing seems to matter anymore..."
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center text-sm text-gray-500">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mr-2 animate-pulse"></div>
                  AI is analyzing your response...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Take the first step towards better mental health with our AI-powered assessment tool.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-white text-primary-600 hover:bg-gray-50 font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center group"
          >
            {isDemoMode ? 'Try Demo Now' : 'Start Free Assessment'}
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Brain className="w-6 h-6 text-primary-400" />
                <span className="ml-2 text-lg font-semibold">MindScope</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered mental health assessment and support platform.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/demo" className="hover:text-white transition-colors">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/resources" className="hover:text-white transition-colors">Resources</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/disclaimer" className="hover:text-white transition-colors">Medical Disclaimer</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 MindScope. All rights reserved.</p>
            <p className="mt-2">
              <strong>Disclaimer:</strong> This tool is for screening purposes only and does not provide medical diagnosis. 
              Please consult a healthcare professional for proper medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
