// src/providers/auth-provider.tsx (Fixed)
'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
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
    loading: storeLoading,
    isAuthenticated,
    login: storeLogin,
    logout: storeLogout,
    hasRole,
    isAdmin,
    isTechnician,
    checkAuth,
  } = useAuthStore()

  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // Memoize the login function to prevent unnecessary re-renders
  const login = useCallback(async (username: string, password: string) => {
    await storeLogin({ username, password })
  }, [storeLogin])

  // Memoize the logout function to prevent unnecessary re-renders
  const logout = useCallback(() => {
    storeLogout()
  }, [storeLogout])

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      // Don't initialize if already initialized or if currently initializing
      if (isInitialized || !isMounted) {
        return
      }

      setIsInitializing(true)
      
      try {
        await checkAuth()
      } catch (error) {
        console.error('Auth initialization failed:', error)
      } finally {
        if (isMounted) {
          setIsInitialized(true)
          setIsInitializing(false)
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
    }
  }, [checkAuth, isInitialized]) // Only depend on checkAuth and isInitialized

  const value = {
    user,
    loading: storeLoading || isInitializing,
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