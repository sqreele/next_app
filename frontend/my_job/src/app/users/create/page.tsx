// src/app/users/create/page.tsx
'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUsersStore } from '@/stores/users-store'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { UserIcon } from '@heroicons/react/24/outline'

interface UserFormData {
  username: string
  email: string
  profile: {
    role: 'Admin' | 'Manager' | 'Supervisor' | 'Technician'
    position: string
  }
}

interface FormErrors {
  [key: string]: string
}

const roleOptions = [
  { value: 'Admin', label: 'Administrator', color: 'bg-red-100 text-red-800' },
  { value: 'Manager', label: 'Manager', color: 'bg-blue-100 text-blue-800' },
  { value: 'Supervisor', label: 'Supervisor', color: 'bg-purple-100 text-purple-800' },
  { value: 'Technician', label: 'Technician', color: 'bg-green-100 text-green-800' },
]

export default function CreateUserPage() {
  const router = useRouter()
  const { createUser, loading } = useUsersStore()
  
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    profile: {
      role: 'Technician',
      position: '',
    }
  })
  
  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
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
          ...prev[parent as keyof UserFormData],
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
      const newUser = await createUser(formData)
      
      toast.success('User created successfully!', {
        description: `User "${newUser.username}" has been created.`
      })

      router.push('/users')
      
    } catch (error: any) {
      console.error('Error creating user:', error)
      
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
        } else if (errorData.message) {
          toast.error(errorData.message)
        }
      }
    }
  }

  const selectedRole = roleOptions.find(r => r.value === formData.profile.role)

  return (
    <ProtectedRoute requiredRole="Admin">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <UserIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create User</h1>
            <p className="text-gray-600">Add a new user to the system</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter username..."
                  className={errors.username ? 'border-red-500' : ''}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address..."
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position *
                </label>
                <Input
                  type="text"
                  value={formData.profile.position}
                  onChange={(e) => handleInputChange('profile.position', e.target.value)}
                  placeholder="Enter position/job title..."
                  className={errors.position ? 'border-red-500' : ''}
                />
                {errors.position && (
                  <p className="mt-1 text-sm text-red-600">{errors.position}</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {roleOptions.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => handleInputChange('profile.role', role.value as any)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        formData.profile.role === role.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm font-medium">{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Username:</span>
                  <span className="font-medium">{formData.username || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{formData.email || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Position:</span>
                  <span className="font-medium">{formData.profile.position || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <Badge className={selectedRole?.color}>
                    {formData.profile.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                'Create User'
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
