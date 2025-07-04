'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const { login, loading, error, isAuthenticated, clearError } = useAuthStore()
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  // Clear error when component mounts
  useEffect(() => {
    clearError()
  }, [clearError])

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required'
    }
    
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await login({
        username: formData.username,
        password: formData.password
      })
      
      toast.success('Login successful!')
      router.push('/')
    } catch (error) {
      // Error is already handled in the store and displayed via toast
      console.error('Login error:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-green-100 to-white px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <div className="bg-green-500 rounded-full h-16 w-16 flex items-center justify-center mb-2">
            <span className="text-2xl font-bold text-white">PMCS</span>
          </div>
          <h1 className="text-2xl font-semibold text-green-900">Sign in to PMCS</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div>
            <Input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={validationErrors.username ? 'border-red-500' : ''}
              disabled={loading}
            />
            {validationErrors.username && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.username}</p>
            )}
          </div>
          
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={validationErrors.password ? 'border-red-500' : ''}
              disabled={loading}
            />
            {validationErrors.password && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
            )}
          </div>
          
          {error && (
            <div className="text-sm text-red-600 text-center">
              {error}
            </div>
          )}
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 text-white font-semibold py-2 rounded-lg mt-2 hover:bg-green-600 transition"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </div>
            ) : (
              'Login'
            )}
          </Button>
        </form>
        
        <div className="mt-4 text-sm text-gray-500">
          Don't have an account?{' '}
          <Link href="/register" className="text-green-600 underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
