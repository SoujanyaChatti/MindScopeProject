'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { authAPI } from '../lib/api'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = Cookies.get('token')
      console.log('Token found:', !!token) // Debug log
      if (token) {
        const response = await authAPI.getCurrentUser()
        console.log('Current user response:', response.data) // Debug log
        setUser(response.data.data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      Cookies.remove('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password)
      console.log('Login response:', response.data) // Debug log
      const { user: userData, token } = response.data.data
      
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
      Cookies.set('token', token, { expires: 7, secure: isHttps, sameSite: 'strict' })
      setUser(userData)
      console.log('User set:', userData) // Debug log
    } catch (error: any) {
      console.error('Login error:', error) // Debug log
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      const response = await authAPI.register(userData)
      const { user: newUser, token } = response.data.data
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
      Cookies.set('token', token, { expires: 7, secure: isHttps, sameSite: 'strict'})
      setUser(newUser)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed')
    }
  }

  const logout = () => {
    Cookies.remove('token')
    setUser(null)
  }

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await authAPI.updateProfile(data)
      setUser(response.data.data.user)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Profile update failed')
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
