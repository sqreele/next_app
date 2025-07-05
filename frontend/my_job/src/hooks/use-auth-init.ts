// src/hooks/use-auth-init.ts (Fixed)
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export function useAuthInit() {
  const { checkAuth, isAuthenticated, loading } = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  const initAuth = useCallback(async () => {
    if (isInitialized) return

    setInitLoading(true)
    try {
      await checkAuth()
    } catch (error) {
      console.error('Auth initialization failed:', error)
    } finally {
      setIsInitialized(true)
      setInitLoading(false)
    }
  }, [checkAuth, isInitialized])

  useEffect(() => {
    if (!isAuthenticated && !isInitialized) {
      initAuth()
    } else if (isAuthenticated) {
      setIsInitialized(true)
      setInitLoading(false)
    }
  }, [isAuthenticated, isInitialized, initAuth])

  return {
    isInitialized,
    loading: loading || initLoading,
  }
}