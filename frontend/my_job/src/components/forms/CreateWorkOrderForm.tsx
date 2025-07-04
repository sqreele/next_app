
// src/components/forms/CreateWorkOrderForm.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkOrderStore } from '@/stores/work-orders-store'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { useTechnicianStore } from '@/stores/technicians-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface WorkOrderFormData {
  task: string
  description: string
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  due_date: string
  machine_id: number
  room_id: number
  assigned_to_id: number
}

interface FormErrors {
  [key: string]: string
}

const statusOptions = [
  { 
    value: 'Pending', 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: ClockIcon 
  },
  { 
    value: 'In Progress', 
    label: 'In Progress', 
    color: 'bg-blue-100 text-blue-800',
    icon: ExclamationTriangleIcon 
  },
  { 
    value: 'Completed', 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleIcon 
  },
  { 
    value: 'Cancelled', 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800',
    icon: XMarkIcon 
  },
]

const priorityOptions = [
  { 
    value: 'Low', 
    label: 'Low', 
    color: 'bg-gray-100 text-gray-800'
  },
  { 
    value: 'Medium', 
    label: 'Medium', 
    color: 'bg-blue-100 text-blue-800'
  },
  { 
    value: 'High', 
    label: 'High', 
    color: 'bg-orange-100 text-orange-800'
  },
  { 
    value: 'Urgent', 
    label: 'Urgent', 
    color: 'bg-red-100 text-red-800'
  },
]

export function CreateWorkOrderForm() {
  const router = useRouter()
  const { createWorkOrder, loading } = useWorkOrderStore()
  const { machines, fetchMachines, getOperationalMachines } = useMachineStore()
  const { rooms, fetchRooms, getActiveRooms } = useRoomStore()
  const { technicians, fetchTechnicians, getAvailableTechnicians } = useTechnicianStore()
  
  const [formData, setFormData] = useState<WorkOrderFormData>({
    task: '',
    description: '',
    status: 'Pending',
    priority: 'Medium',
    due_date: '',
    machine_id: 0,
    room_id: 0,
    assigned_to_id: 0,
  })
  
  const [errors, setErrors] = useState<FormErrors>({})

  // Fetch data on component mount
  useEffect(() => {
    fetchMachines()
    fetchRooms()
    fetchTechnicians()
  }, [fetchMachines, fetchRooms, fetchTechnicians])

  const operationalMachines = getOperationalMachines()
  const activeRooms = getActiveRooms()
  const availableTechnicians = getAvailableTechnicians()

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.task.trim()) {
      newErrors.task = 'Task is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required'
    } else {
      const dueDate = new Date(formData.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dueDate < today) {
        newErrors.due_date = 'Due date cannot be in the past'
      }
    }

    if (formData.machine_id === 0) {
      newErrors.machine_id = 'Please select a machine'
    }

    if (formData.room_id === 0) {
      newErrors.room_id = 'Please select a room'
    }

    if (formData.assigned_to_id === 0) {
      newErrors.assigned_to_id = 'Please assign to a technician'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof WorkOrderFormData, value: string | number) => {
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
      const newWorkOrder = await createWorkOrder(formData)
      
      toast.success('Work order created successfully!', {
        description: `Work order "${newWorkOrder.task}" has been created.`
      })

      router.push('/work-orders')
      
    } catch (error: any) {
      console.error('Error creating work order:', error)
      
      // Handle validation errors from API
      if (error?.response?.status === 422 || error?.response?.status === 400) {
        const errorData = error.response.data
        if (errorData.errors) {
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
  const selectedPriority = priorityOptions.find(p => p.value === formData.priority)
  const selectedMachine = operationalMachines.find(m => m.id === formData.machine_id)
  const selectedRoom = activeRooms.find(r => r.id === formData.room_id)
  const selectedTechnician = availableTechnicians.find(t => t.id === formData.assigned_to_id)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Work Order</h1>
          <p className="text-gray-600">Create a new maintenance or repair request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Work Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Task */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <Input
                type="text"
                value={formData.task}
                onChange={(e) => handleInputChange('task', e.target.value)}
                placeholder="Enter task title..."
                className={errors.task ? 'border-red-500' : ''}
              />
              {errors.task && (
                <p className="mt-1 text-sm text-red-600">{errors.task}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter detailed description..."
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                className={errors.due_date ? 'border-red-500' : ''}
              />
              {errors.due_date && (
                <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
              )}
            </div>

            {/* Machine Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Machine *
              </label>
              <select
                value={formData.machine_id}
                onChange={(e) => handleInputChange('machine_id', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.machine_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value={0}>Select a machine...</option>
                {operationalMachines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} - Room: {activeRooms.find(r => r.id === machine.room_id)?.name} ({activeRooms.find(r => r.id === machine.room_id)?.number})
                  </option>
                ))}
              </select>
              {errors.machine_id && (
                <p className="mt-1 text-sm text-red-600">{errors.machine_id}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
