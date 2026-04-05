'use client'

import { useLanguage } from '../contexts/LanguageContext'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="language-switch">
      <Globe className="w-4 h-4 text-gray-500" />
      <button
        onClick={() => setLanguage('en')}
        className={`language-option ${language === 'en' ? 'active' : ''}`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('te')}
        className={`language-option ${language === 'te' ? 'active' : ''}`}
      >
        తె
      </button>
    </div>
  )
}
