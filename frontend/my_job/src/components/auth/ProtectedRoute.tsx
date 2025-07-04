// src/components/auth/ProtectedRoute.tsx
'use client'
import React, { useEffect, useState } from 'react'
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

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const isValid = await checkAuth()
        
        if (!isValid) {
          router.push(redirectTo)
          return
        }
        
        // Check role if required
        if (requiredRole && user?.profile?.role !== requiredRole) {
          router.push('/unauthorized')
          return
        }
        
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push(redirectTo)
      } finally {
        setIsChecking(false)
      }
    }

    if (!isAuthenticated) {
      router.push(redirectTo)
    } else {
      verifyAuth()
    }
  }, [isAuthenticated, user, requiredRole, router, redirectTo, checkAuth])

  // Show loading spinner while checking authentication
  if (isChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated or checking
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
