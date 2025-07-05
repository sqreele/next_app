// src/app/page.tsx (Fixed)
'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export default function RootPage() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuthStore()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    if (loading || hasRedirected) return

    const timer = setTimeout(() => {
      if (!hasRedirected) {
        setHasRedirected(true)
        if (isAuthenticated) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      }
    }, 100) // Small delay to prevent race conditions

    return () => clearTimeout(timer)
  }, [isAuthenticated, loading, router, hasRedirected])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading application...</p>
      </div>
    </div>
  )
}