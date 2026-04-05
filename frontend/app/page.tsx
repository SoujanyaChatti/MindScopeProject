'use client'

import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LandingPage from '../components/LandingPage'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return <LoadingSpinner />
  }

  if (user) {
    return <LoadingSpinner />
  }

  return <LandingPage />
}
