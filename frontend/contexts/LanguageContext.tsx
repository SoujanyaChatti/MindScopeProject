'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'en' | 'te'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'app.name': 'MindScope',
    'app.tagline': 'Your Mental Wellness Companion',
    'app.description': 'AI-powered conversational mental health assessment with personalized support',

    // Navigation
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.assessment': 'Assessment',
    'nav.history': 'History',
    'nav.chat': 'Chat',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',

    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.firstName': 'First Name',
    'auth.lastName': 'Last Name',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.signUp': 'Sign Up',
    'auth.signIn': 'Sign In',

    // Dashboard
    'dashboard.welcome': 'Welcome back',
    'dashboard.subtitle': "How are you feeling today? Let's check in on your mental health.",
    'dashboard.startAssessment': 'Start New Assessment',
    'dashboard.startAssessmentDesc': 'Take a quick mental health assessment to get personalized insights.',
    'dashboard.continueAssessment': 'You have an assessment in progress. Continue where you left off.',
    'dashboard.viewHistory': 'View History',
    'dashboard.recentResults': 'Recent Results',
    'dashboard.recentAssessments': 'Recent Assessments',
    'dashboard.totalAssessments': 'Total Assessments',
    'dashboard.totalTests': 'Total tests',
    'dashboard.lastScore': 'Last Score',
    'dashboard.latestScore': 'Latest Score',
    'dashboard.averageScore': 'Average Score',
    'dashboard.lastAssessment': 'Last Assessment',
    'dashboard.lastExam': 'Last exam',
    'dashboard.never': 'Never',
    'dashboard.quickChat': 'Quick Chat',
    'dashboard.profile': 'Profile',
    'dashboard.manageProfile': 'Manage Profile',
    'dashboard.history': 'Assessment History',
    'dashboard.historyDesc': 'View your past assessments and track your progress over time.',
    'dashboard.settings': 'Profile Settings',
    'dashboard.settingsDesc': 'Update your profile information and account settings.',
    'dashboard.completedOn': 'Completed on',

    // Assessment
    'assessment.title': 'Mental Health Assessment',
    'assessment.subtitle': 'Answer honestly for accurate results',
    'assessment.start': 'Start Assessment',
    'assessment.continue': 'Continue',
    'assessment.submit': 'Submit',
    'assessment.thinking': 'Processing your response...',
    'assessment.complete': 'Assessment Complete',
    'assessment.score': 'Your Score',
    'assessment.severity': 'Severity Level',
    'assessment.recommendations': 'Recommendations',
    'assessment.viewDetails': 'View Details',
    'assessment.typeResponse': 'Type your response...',
    'assessment.speakResponse': 'Or speak your response',

    // Results
    'results.title': 'Assessment Results',
    'results.analysis': 'Clinical Analysis',
    'results.observations': 'Key Observations',
    'results.riskFactors': 'Risk Factors',
    'results.protectiveFactors': 'Protective Factors',
    'results.criteria': 'Criteria Breakdown',
    'results.conversation': 'Conversation History',
    'results.question': 'Question',
    'results.yourResponse': 'Your Response',
    'results.recommendations': 'Personalized Recommendations',
    'results.lifestyle': 'Lifestyle Changes',
    'results.professionalHelp': 'Professional Help',

    // Severity Levels
    'severity.none': 'No Depression',
    'severity.mild': 'Mild',
    'severity.moderate': 'Moderate',
    'severity.severe': 'Severe',

    // History
    'history.title': 'Assessment History',
    'history.noResults': 'No completed assessments yet',
    'history.noAssessments': 'No completed assessments yet.',
    'history.completedOn': 'Completed on',

    // Chat
    'chat.title': 'Mental Health Support Chat',
    'chat.placeholder': 'Ask me anything about mental health...',
    'chat.send': 'Send',

    // Crisis
    'crisis.title': 'Immediate Support Needed',
    'crisis.message': "We're concerned about your safety. Please reach out for immediate help.",
    'crisis.helpline': 'National Helpline: 988',
    'crisis.emergency': 'Emergency: 911',

    // Language
    'language.select': 'Select Language',
    'language.english': 'English',
    'language.telugu': 'తెలుగు',

    // Common Actions
    'action.back': 'Back',
    'action.next': 'Next',
    'action.prev': 'Prev',
    'action.cancel': 'Cancel',
    'action.save': 'Save',
    'action.close': 'Close',
    'action.loading': 'Loading...',
    'action.start': 'Start Assessment',
    'action.continue': 'Continue',
    'action.viewHistory': 'View History',
    'action.viewDetails': 'View Details',
    'action.viewAll': 'View all assessments',
  },
  te: {
    // Common
    'app.name': 'మైండ్‌స్కోప్',
    'app.tagline': 'మీ మానసిక ఆరోగ్య సహచరుడు',
    'app.description': 'వ్యక్తిగత మద్దతుతో AI-ఆధారిత సంభాషణ మానసిక ఆరోగ్య అంచనా',

    // Navigation
    'nav.home': 'హోమ్',
    'nav.dashboard': 'డాష్‌బోర్డ్',
    'nav.assessment': 'అంచనా',
    'nav.history': 'చరిత్ర',
    'nav.chat': 'చాట్',
    'nav.profile': 'ప్రొఫైల్',
    'nav.logout': 'లాగ్అవుట్',

    // Auth
    'auth.login': 'లాగిన్',
    'auth.register': 'నమోదు',
    'auth.email': 'ఇమెయిల్',
    'auth.password': 'పాస్‌వర్డ్',
    'auth.firstName': 'మొదటి పేరు',
    'auth.lastName': 'ఇంటి పేరు',
    'auth.confirmPassword': 'పాస్‌వర్డ్ నిర్ధారించండి',
    'auth.forgotPassword': 'పాస్‌వర్డ్ మర్చిపోయారా?',
    'auth.noAccount': 'ఖాతా లేదా?',
    'auth.hasAccount': 'ఖాతా ఉందా?',
    'auth.signUp': 'సైన్ అప్',
    'auth.signIn': 'సైన్ ఇన్',

    // Dashboard
    'dashboard.welcome': 'తిరిగి స్వాగతం',
    'dashboard.subtitle': 'మీరు ఈ రోజు ఎలా భావిస్తున్నారు? మీ మానసిక ఆరోగ్యం తనిఖీ చేద్దాం.',
    'dashboard.startAssessment': 'కొత్త అంచనా ప్రారంభించండి',
    'dashboard.startAssessmentDesc': 'వ్యక్తిగత అంతర్దృష్టులు పొందడానికి త్వరిత మానసిక ఆరోగ్య అంచనా తీసుకోండి.',
    'dashboard.continueAssessment': 'మీకు ప్రగతిలో ఒక అంచనా ఉంది. మీరు ఆపిన చోట కొనసాగించండి.',
    'dashboard.viewHistory': 'చరిత్ర చూడండి',
    'dashboard.recentResults': 'ఇటీవల ఫలితాలు',
    'dashboard.recentAssessments': 'ఇటీవలి అంచనాలు',
    'dashboard.totalAssessments': 'మొత్తం అంచనాలు',
    'dashboard.totalTests': 'మొత్తం పరీక్షలు',
    'dashboard.lastScore': 'చివరి స్కోరు',
    'dashboard.latestScore': 'తాజా స్కోరు',
    'dashboard.averageScore': 'సగటు స్కోరు',
    'dashboard.lastAssessment': 'చివరి అంచనా',
    'dashboard.lastExam': 'చివరి పరీక్ష',
    'dashboard.never': 'ఎప్పుడూ లేదు',
    'dashboard.quickChat': 'త్వరిత చాట్',
    'dashboard.profile': 'ప్రొఫైల్',
    'dashboard.manageProfile': 'ప్రొఫైల్ నిర్వహించండి',
    'dashboard.history': 'అంచనా చరిత్ర',
    'dashboard.historyDesc': 'మీ గత అంచనాలను చూడండి మరియు కాలక్రమేణా మీ పురోగతిని ట్రాక్ చేయండి.',
    'dashboard.settings': 'ప్రొఫైల్ సెట్టింగ్‌లు',
    'dashboard.settingsDesc': 'మీ ప్రొఫైల్ సమాచారం మరియు ఖాతా సెట్టింగ్‌లను అప్‌డేట్ చేయండి.',
    'dashboard.completedOn': 'పూర్తయిన తేదీ',

    // Assessment
    'assessment.title': 'మానసిక ఆరోగ్య అంచనా',
    'assessment.subtitle': 'ఖచ్చితమైన ఫలితాల కోసం నిజాయితీగా జవాబివ్వండి',
    'assessment.start': 'అంచనా ప్రారంభించండి',
    'assessment.continue': 'కొనసాగించు',
    'assessment.submit': 'సమర్పించు',
    'assessment.thinking': 'మీ ప్రతిస్పందనను ప్రాసెస్ చేస్తోంది...',
    'assessment.complete': 'అంచనా పూర్తయింది',
    'assessment.score': 'మీ స్కోరు',
    'assessment.severity': 'తీవ్రత స్థాయి',
    'assessment.recommendations': 'సిఫార్సులు',
    'assessment.viewDetails': 'వివరాలు చూడండి',
    'assessment.typeResponse': 'మీ ప్రతిస్పందన టైప్ చేయండి...',
    'assessment.speakResponse': 'లేదా మాట్లాడండి',

    // Results
    'results.title': 'అంచనా ఫలితాలు',
    'results.analysis': 'క్లినికల్ విశ్లేషణ',
    'results.observations': 'ముఖ్య పరిశీలనలు',
    'results.riskFactors': 'ప్రమాద కారకాలు',
    'results.protectiveFactors': 'రక్షణ కారకాలు',
    'results.criteria': 'ప్రమాణాల విభజన',
    'results.conversation': 'సంభాషణ చరిత్ర',
    'results.question': 'ప్రశ్న',
    'results.yourResponse': 'మీ ప్రతిస్పందన',
    'results.recommendations': 'వ్యక్తిగత సిఫార్సులు',
    'results.lifestyle': 'జీవనశైలి మార్పులు',
    'results.professionalHelp': 'వృత్తిపరమైన సహాయం',

    // Severity Levels
    'severity.none': 'డిప్రెషన్ లేదు',
    'severity.mild': 'తేలికపాటి',
    'severity.moderate': 'మధ్యస్థ',
    'severity.severe': 'తీవ్రమైన',

    // History
    'history.title': 'అంచనా చరిత్ర',
    'history.noResults': 'ఇంకా పూర్తయిన అంచనాలు లేవు',
    'history.noAssessments': 'ఇంకా పూర్తయిన అంచనాలు లేవు.',
    'history.completedOn': 'పూర్తయిన తేదీ',

    // Chat
    'chat.title': 'మానసిక ఆరోగ్య మద్దతు చాట్',
    'chat.placeholder': 'మానసిక ఆరోగ్యం గురించి ఏదైనా అడగండి...',
    'chat.send': 'పంపు',

    // Crisis
    'crisis.title': 'తక్షణ మద్దతు అవసరం',
    'crisis.message': 'మీ భద్రత గురించి మాకు ఆందోళన. దయచేసి తక్షణ సహాయం కోసం సంప్రదించండి.',
    'crisis.helpline': 'జాతీయ హెల్ప్‌లైన్: 988',
    'crisis.emergency': 'అత్యవసర: 911',

    // Language
    'language.select': 'భాష ఎంచుకోండి',
    'language.english': 'English',
    'language.telugu': 'తెలుగు',

    // Common Actions
    'action.back': 'వెనుకకు',
    'action.next': 'తదుపరి',
    'action.prev': 'మునుపటి',
    'action.cancel': 'రద్దు',
    'action.save': 'సేవ్',
    'action.close': 'మూసివేయి',
    'action.loading': 'లోడ్ అవుతోంది...',
    'action.start': 'అంచనా ప్రారంభించండి',
    'action.continue': 'కొనసాగించు',
    'action.viewHistory': 'చరిత్ర చూడండి',
    'action.viewDetails': 'వివరాలు చూడండి',
    'action.viewAll': 'అన్ని అంచనాలు చూడండి',
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem('mindscope-language') as Language
    if (saved && (saved === 'en' || saved === 'te')) {
      setLanguageState(saved)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('mindscope-language', lang)
  }

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
