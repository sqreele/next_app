// src/hooks/use-auth-init.ts
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export function useAuthInit() {
  const { checkAuth, isAuthenticated, loading } = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      try {
        await checkAuth()
      } catch (error) {
        console.error('Auth initialization failed:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    if (!isAuthenticated && !isInitialized) {
      initAuth()
    } else {
      setIsInitialized(true)
    }
  }, [checkAuth, isAuthenticated, isInitialized])

  return {
    isInitialized,
    loading: loading || !isInitialized,
  }
}
