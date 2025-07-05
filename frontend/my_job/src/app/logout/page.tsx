'use client'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

export default function LogoutPage() {
  const router = useRouter()
  const { logout, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Perform logout
        logout()
        toast.success('Logged out successfully')
        
        // Redirect to login page
        router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
        toast.error('Error during logout')
        router.push('/login')
      }
    }

    // Only perform logout if user is authenticated
    if (isAuthenticated) {
      performLogout()
    } else {
      // If not authenticated, just redirect to login
      router.push('/login')
    }
  }, [logout, isAuthenticated, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Logging out...</p>
      </div>
    </div>
  )
} 