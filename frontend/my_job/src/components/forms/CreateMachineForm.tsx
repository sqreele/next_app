// src/components/forms/CreateMachineForm.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

interface MachineFormData {
  name: string
  status: 'Operational' | 'Maintenance' | 'Offline' | 'Decommissioned'
  room_id: number
}

interface FormErrors {
  [key: string]: string
}

const statusOptions = [
  { 
    value: 'Operational', 
    label: 'Operational', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleIcon 
  },
  { 
    value: 'Maintenance', 
    label: 'Maintenance', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: WrenchScrewdriverIcon 
  },
  { 
    value: 'Offline', 
    label: 'Offline', 
    color: 'bg-red-100 text-red-800',
    icon: XMarkIcon 
  },
  { 
    value: 'Decommissioned', 
    label: 'Decommissioned', 
    color: 'bg-gray-100 text-gray-800',
    icon: ExclamationTriangleIcon 
  },
]

export function CreateMachineForm() {
  const router = useRouter()
  const { createMachine, loading } = useMachineStore()
  const { rooms, fetchRooms, getActiveRooms, loading: roomsLoading } = useRoomStore()
  
  const [formData, setFormData] = useState<MachineFormData>({
    name: '',
    status: 'Operational',
    room_id: 0,
  })
  
  const [errors, setErrors] = useState<FormErrors>({})

  // Fetch rooms on component mount
  useEffect(() => {
    if (rooms.length === 0) {
      fetchRooms()
    }
  }, [fetchRooms, rooms.length])

  const activeRooms = getActiveRooms()

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Machine name is required'
    }

    if (formData.room_id === 0) {
      newErrors.room_id = 'Please select a room'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof MachineFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

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
      const newMachine = await createMachine(formData)
      
      toast.success('Machine created successfully!', {
        description: `Machine "${newMachine.name}" has been created.`
      })

      router.push('/machines')
      
    } catch (error: any) {
      console.error('Error creating machine:', error)
      
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

  const selectedStatus = statusOptions.find(s => s.value === formData.status)
  const selectedRoom = activeRooms.find(r => r.id === formData.room_id)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <CogIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Machine</h1>
          <p className="text-gray-600">Add a new machine to the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Machine Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Machine Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Machine Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter machine name..."
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Room Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room *
              </label>
              <select
                value={formData.room_id}
                onChange={(e) => handleInputChange('room_id', parseInt(e.target.value))}
                disabled={roomsLoading}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.room_id ? 'border-red-500' : 'border-gray-300'
                } ${roomsLoading ? 'bg-gray-100' : ''}`}
              >
                <option value={0}>
                  {roomsLoading ? 'Loading rooms...' : 'Select a room...'}
                </option>
                {activeRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.number}) - {room.room_type}
                  </option>
                ))}
              </select>
              {errors.room_id && (
                <p className="mt-1 text-sm text-red-600">{errors.room_id}</p>
              )}
              {!roomsLoading && activeRooms.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">No active rooms available</p>
              )}
            </div>

            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                {statusOptions.map((status) => {
                  const IconComponent = status.icon
                  return (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => handleInputChange('status', status.value as any)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        formData.status === status.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span className="text-sm font-medium">{status.label}</span>
                    </button>
                  )
                })}
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
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{formData.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Room:</span>
                <span className="font-medium">
                  {selectedRoom ? `${selectedRoom.name} (${selectedRoom.number})` : 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge className={selectedStatus?.color}>
                  {formData.status}
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
            disabled={loading || roomsLoading}
            className="flex-1 sm:flex-none"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              'Create Machine'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
