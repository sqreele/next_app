// src/components/auth/ProtectedRoute.tsx (Fixed)
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, user, loading, checkAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  const [hasRedirected, setHasRedirected] = useState(false)

  const verifyAuth = useCallback(async () => {
    if (hasRedirected) return

    try {
      setIsChecking(true)
      
      const isValid = await checkAuth()
      
      if (!isValid && !hasRedirected) {
        setHasRedirected(true)
        router.push(redirectTo)
        return
      }
      
      // Check role if required
      if (requiredRole && user?.profile?.role !== requiredRole && !hasRedirected) {
        setHasRedirected(true)
        router.push('/unauthorized')
        return
      }
      
    } catch (error) {
      console.error('Auth check failed:', error)
      if (!hasRedirected) {
        setHasRedirected(true)
        router.push(redirectTo)
      }
    } finally {
      setIsChecking(false)
    }
  }, [checkAuth, requiredRole, router, redirectTo, user?.profile?.role, hasRedirected])

  useEffect(() => {
    if (!isAuthenticated && !loading && !hasRedirected) {
      setHasRedirected(true)
      router.push(redirectTo)
    } else if (isAuthenticated && user) {
      verifyAuth()
    }
  }, [isAuthenticated, user, loading, verifyAuth, router, redirectTo, hasRedirected])

  // Show loading spinner while checking authentication
  if (isChecking || loading || hasRedirected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated
  if (!isAuthenticated || !user) {
    return null
  }

  // Check role requirement
  if (requiredRole && user.profile?.role !== requiredRole) {
    return null
  }

  return <>{children}</>
}