// src/app/register/page.tsx (Complete rewrite with API integration)
'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  CheckCircleIcon, 
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface FormData {
  username: string
  email: string
  password: string
  confirmPassword: string
  profile: {
    role: 'Admin' | 'Technician' | 'Manager' | 'Supervisor'
    position: string
  }
}

interface FormErrors {
  [key: string]: string
}

interface ValidationState {
  username: {
    valid: boolean
    available: boolean | null
    checking: boolean
  }
  email: {
    valid: boolean
    available: boolean | null
    checking: boolean
  }
  password: {
    valid: boolean
    strength: 'weak' | 'medium' | 'strong'
  }
  confirmPassword: {
    valid: boolean
  }
}

const roleOptions = [
  { value: 'Technician', label: 'Technician', description: 'Field maintenance worker' },
  { value: 'Supervisor', label: 'Supervisor', description: 'Team supervisor' },
  { value: 'Manager', label: 'Manager', description: 'Department manager' },
  { value: 'Admin', label: 'Administrator', description: 'System administrator' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { register, loading, error, isAuthenticated, clearError, checkUsernameAvailability, checkEmailAvailability } = useAuthStore()
  
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    profile: {
      role: 'Technician',
      position: '',
    }
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validation, setValidation] = useState<ValidationState>({
    username: { valid: false, available: null, checking: false },
    email: { valid: false, available: null, checking: false },
    password: { valid: false, strength: 'weak' },
    confirmPassword: { valid: false }
  })

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  // Clear error when component mounts
  useEffect(() => {
    clearError()
  }, [clearError])

  // Username validation and availability check
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length >= 3) {
        setValidation(prev => ({
          ...prev,
          username: { ...prev.username, checking: true }
        }))

        const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(formData.username)
        let available = null

        if (isValid) {
          available = await checkUsernameAvailability(formData.username)
        }

        setValidation(prev => ({
          ...prev,
          username: { valid: isValid, available, checking: false }
        }))
      } else {
        setValidation(prev => ({
          ...prev,
          username: { valid: false, available: null, checking: false }
        }))
      }
    }

    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.username, checkUsernameAvailability])

  // Email validation and availability check
  useEffect(() => {
    const checkEmail = async () => {
      if (formData.email.length > 0) {
        setValidation(prev => ({
          ...prev,
          email: { ...prev.email, checking: true }
        }))

        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        let available = null

        if (isValid) {
          available = await checkEmailAvailability(formData.email)
        }

        setValidation(prev => ({
          ...prev,
          email: { valid: isValid, available, checking: false }
        }))
      } else {
        setValidation(prev => ({
          ...prev,
          email: { valid: false, available: null, checking: false }
        }))
      }
    }

    const timeoutId = setTimeout(checkEmail, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.email, checkEmailAvailability])

  // Password strength validation
  useEffect(() => {
    const password = formData.password
    let strength: 'weak' | 'medium' | 'strong' = 'weak'
    let valid = false

    if (password.length >= 8) {
      valid = true
      let score = 0
      if (password.length >= 12) score++
      if (/[a-z]/.test(password)) score++
      if (/[A-Z]/.test(password)) score++
      if (/[0-9]/.test(password)) score++
      if (/[^A-Za-z0-9]/.test(password)) score++

      if (score >= 4) strength = 'strong'
      else if (score >= 2) strength = 'medium'
    }

    setValidation(prev => ({
      ...prev,
      password: { valid, strength }
    }))
  }, [formData.password])

  // Confirm password validation
  useEffect(() => {
    const valid = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword
    setValidation(prev => ({
      ...prev,
      confirmPassword: { valid }
    }))
  }, [formData.password, formData.confirmPassword])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (!validation.username.valid) {
      newErrors.username = 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
    } else if (validation.username.available === false) {
      newErrors.username = 'Username is already taken'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validation.email.valid) {
      newErrors.email = 'Please enter a valid email address'
    } else if (validation.email.available === false) {
      newErrors.email = 'Email is already registered'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!validation.password.valid) {
      newErrors.password = 'Password must be at least 8 characters long'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (!validation.confirmPassword.valid) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.profile.position.trim()) {
      newErrors.position = 'Position is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof FormData] as Record<string, any> || {}),
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    try {
      const result = await register(formData)
      
      toast.success('Registration successful!', {
        description: 'Welcome to PMCS! You can now access the system.'
      })

      // Redirect to dashboard if auto-login, otherwise to login
      if (result.access_token) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
      
    } catch (error: any) {
      console.error('Registration error:', error)
      
      // Handle validation errors from API
      if (error?.response?.status === 422 || error?.response?.status === 400) {
        const errorData = error.response.data
        if (errorData.errors) {
          // Handle Laravel-style validation errors
          Object.keys(errorData.errors).forEach(field => {
            setErrors(prev => ({
              ...prev,
              [field]: Array.isArray(errorData.errors[field]) 
                ? errorData.errors[field][0] 
                : errorData.errors[field]
            }))
          })
        }
      }
    }
  }

  const getPasswordStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'strong': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getValidationIcon = (field: keyof ValidationState) => {
    const fieldValidation = validation[field]
    
    if ('checking' in fieldValidation && fieldValidation.checking) {
      return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    }
    
    if ('available' in fieldValidation) {
      if (fieldValidation.valid && fieldValidation.available === true) {
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      } else if (fieldValidation.valid && fieldValidation.available === false) {
        return <XMarkIcon className="h-4 w-4 text-red-500" />
      } else if (!fieldValidation.valid && formData[field as keyof FormData]) {
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
      }
    } else {
      if (fieldValidation.valid) {
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      } else if (formData[field as keyof FormData]) {
        return <XMarkIcon className="h-4 w-4 text-red-500" />
      }
    }
    
    return null
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-green-100 to-white px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="bg-green-500 rounded-full h-16 w-16 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">PMCS</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold text-green-900">
            Create your account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter username"
                  className={errors.username ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {getValidationIcon('username')}
                </div>
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
              {formData.username && validation.username.valid && validation.username.available === true && (
                <p className="mt-1 text-sm text-green-600">Username is available!</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <div className="relative">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className={errors.email ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {getValidationIcon('email')}
                </div>
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
              {formData.email && validation.email.valid && validation.email.available === true && (
                <p className="mt-1 text-sm text-green-600">Email is available!</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password"
                  className={errors.password ? 'border-red-500 pr-20' : 'pr-20'}
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  {getValidationIcon('password')}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {formData.password && (
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Strength:</span>
                  <Badge className={getPasswordStrengthColor(validation.password.strength)}>
                    {validation.password.strength}
                  </Badge>
                </div>
              )}
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm password"
                  className={errors.confirmPassword ? 'border-red-500 pr-20' : 'pr-20'}
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  {getValidationIcon('confirmPassword')}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {roleOptions.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleInputChange('profile.role', role.value as any)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                      formData.profile.role === role.value
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <div>
                      <div className="font-medium">{role.label}</div>
                      <div className="text-sm text-gray-500">{role.description}</div>
                    </div>
                    {formData.profile.role === role.value && (<CheckCircleIcon className="h-5 w-5 text-green-500" />
                   )}
                 </button>
               ))}
             </div>
           </div>

           {/* Position Field */}
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
               Position *
             </label>
             <Input
               type="text"
               value={formData.profile.position}
               onChange={(e) => handleInputChange('profile.position', e.target.value)}
               placeholder="Enter your position/job title"
               className={errors.position ? 'border-red-500' : ''}
               disabled={loading}
             />
             {errors.position && (
               <p className="mt-1 text-sm text-red-600">{errors.position}</p>
             )}
           </div>

           {/* Global Error Display */}
           {error && (
             <div className="bg-red-50 border border-red-200 rounded-lg p-3">
               <p className="text-sm text-red-800">{error}</p>
             </div>
           )}

           {/* Submit Button */}
           <Button
             type="submit"
             disabled={loading || validation.username.checking || validation.email.checking}
             className="w-full bg-green-500 text-white font-semibold py-2 rounded-lg mt-4 hover:bg-green-600 transition"
           >
             {loading ? (
               <div className="flex items-center gap-2">
                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                 Creating Account...
               </div>
             ) : (
               'Create Account'
             )}
           </Button>
         </form>

         {/* Login Link */}
         <div className="mt-6 text-center text-sm text-gray-600">
           Already have an account?{' '}
           <Link href="/login" className="text-green-600 hover:text-green-500 font-medium">
             Sign in
           </Link>
         </div>

         {/* Terms and Privacy */}
         <div className="mt-4 text-center text-xs text-gray-500">
           By creating an account, you agree to our{' '}
           <Link href="/terms" className="text-green-600 hover:text-green-500">
             Terms of Service
           </Link>{' '}
           and{' '}
           <Link href="/privacy" className="text-green-600 hover:text-green-500">
             Privacy Policy
           </Link>
         </div>
       </CardContent>
     </Card>
   </div>
 )
}
 