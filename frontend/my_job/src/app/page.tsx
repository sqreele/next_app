// src/app/page.tsx (Final Update)
'use client'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useAuthInit } from '@/hooks/use-auth-init'

export default function RootPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { isInitialized, loading } = useAuthInit()

  useEffect(() => {
    if (isInitialized) {
      if (isAuthenticated) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [isInitialized, isAuthenticated, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    )
  }

  return null
}
