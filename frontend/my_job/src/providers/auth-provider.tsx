// src/providers/auth-provider.tsx (Updated)
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { User } from '@/types/user'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (role: string) => boolean
  isAdmin: () => boolean
  isTechnician: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    loading,
    isAuthenticated,
    login: storeLogin,
    logout: storeLogout,
    hasRole,
    isAdmin,
    isTechnician,
    checkAuth,
  } = useAuthStore()

  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuth()
      } catch (error) {
        console.error('Auth initialization failed:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    initializeAuth()
  }, [checkAuth])

  const login = async (username: string, password: string) => {
    await storeLogin({ username, password })
  }

  const logout = () => {
    storeLogout()
  }

  const value = {
    user,
    loading: loading || !isInitialized,
    isAuthenticated,
    login,
    logout,
    hasRole,
    isAdmin,
    isTechnician,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
