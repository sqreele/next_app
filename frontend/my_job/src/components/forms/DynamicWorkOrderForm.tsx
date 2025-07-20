'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  XMarkIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'

interface WorkOrderFormData {
  type: 'pm' | 'issue' | 'workorder' | ''
  description: string
  procedure_id: string
  machine_id: string
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | ''
  priority: 'Low' | 'Medium' | 'High' | '' | null
  status: 'Pending' | 'In Progress' | 'Completed' | 'Scheduled' | ''
  due_date: string
  room_id: string
  assigned_to_id: string
  property_id: string
  topic_id: string
}

interface FormErrors {
  [key: string]: string
}

interface LoadingStates {
  submitting: boolean
  fetchingMachines: boolean
  fetchingProcedures: boolean
  uploadingImages: boolean
  fetchingData: boolean
}

interface Procedure {
  id: string
  title: string
}

interface Machine {
  id: string
  name: string
}

interface Room {
  id: string
  name: string
  number: string
}

interface User {
  id: string
  username: string
}

interface Property {
  id: string
  name: string
}

interface Topic {
  id: string
  title: string
}

interface FileWithPreview {
  file: File
  preview: string
  id: string
}

const frequencyOptions = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Yearly', label: 'Yearly' },
]

const priorityOptions = [
  { value: 'Low', label: 'Low Priority', color: 'bg-gray-100 text-gray-800' },
  { value: 'Medium', label: 'Medium Priority', color: 'bg-blue-100 text-blue-800' },
  { value: 'High', label: 'High Priority', color: 'bg-orange-100 text-orange-800' },
]

const statusOptions = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Scheduled', label: 'Scheduled' },
]

const validationRules = {
  pm: {
    required: ['description', 'procedure_id', 'machine_id', 'frequency', 'priority'],
    custom: {
      due_date: (value: string) => {
        if (value && new Date(value) < new Date()) {
          return 'Due date cannot be in the past'
        }
      }
    }
  },
  issue: {
    required: ['description', 'machine_id', 'priority'],
    custom: {
      due_date: (value: string) => {
        if (value && new Date(value) < new Date()) {
          return 'Due date cannot be in the past'
        }
      }
    }
  },
  workorder: {
    required: ['description'],
    custom: {
      due_date: (value: string) => {
        if (value && new Date(value) < new Date()) {
          return 'Due date cannot be in the past'
        }
      }
    }
  }
}

// Utility function for API calls with error handling
const fetchWithErrorHandling = async (url: string, errorMessage: string) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Error fetching ${url}:`, error)
    toast.error(errorMessage)
    throw error
  }
}

// Debounce utility
const useDebounce = (callback: Function, delay: number) => {
  return useCallback(
    (...args: any[]) => {
      const timeoutId = setTimeout(() => callback(...args), delay)
      return () => clearTimeout(timeoutId)
    },
    [callback, delay]
  )
}

export function DynamicWorkOrderForm() {
  const router = useRouter()
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    submitting: false,
    fetchingMachines: false,
    fetchingProcedures: false,
    uploadingImages: false,
    fetchingData: false
  })

  const [formData, setFormData] = useState<WorkOrderFormData>({
    type: '',
    description: '',
    procedure_id: '',
    machine_id: '',
    frequency: '',
    priority: '',
    status: '',
    due_date: '',
    room_id: '',
    assigned_to_id: '',
    property_id: '',
    topic_id: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [technicians, setTechnicians] = useState<User[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [filesWithPreview, setFilesWithPreview] = useState<FileWithPreview[]>([])

  // Memoized field visibility logic
  const visibleFields = useMemo(() => ({
    procedure_id: formData.type === 'pm',
    frequency: formData.type === 'pm',
    machine_id: formData.type === 'pm' || formData.type === 'issue',
    priority: formData.type === 'pm' || formData.type === 'issue'
  }), [formData.type])

  // Update loading state helper
  const updateLoadingState = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }))
  }, [])

  // Fetch dropdown data on component mount
  useEffect(() => {
    const fetchData = async () => {
      updateLoadingState('fetchingData', true)
      try {
        const [roomsData, techData, propData, topicData] = await Promise.all([
          fetchWithErrorHandling('/api/v1/rooms/', 'Failed to load rooms'),
          fetchWithErrorHandling('/api/v1/users/?role=technician', 'Failed to load technicians'),
          fetchWithErrorHandling('/api/v1/properties/', 'Failed to load properties'),
          fetchWithErrorHandling('/api/v1/topics/', 'Failed to load topics')
        ])

        setRooms(roomsData)
        setTechnicians(techData)
        setProperties(propData)
        setTopics(topicData)
      } catch (error) {
        console.error('Error fetching dropdown data:', error)
      } finally {
        updateLoadingState('fetchingData', false)
      }
    }
    fetchData()
  }, [updateLoadingState])

  // Fetch machines based on work order type
  useEffect(() => {
    if (formData.type && formData.type !== 'workorder') {
      const fetchMachines = async () => {
        updateLoadingState('fetchingMachines', true)
        try {
          const data = await fetchWithErrorHandling(
            `/api/v1/machines/by-work-order-type/${formData.type}`,
            'Failed to load machines'
          )
          setMachines(data)
        } catch (error) {
          setMachines([])
        } finally {
          updateLoadingState('fetchingMachines', false)
        }
      }
      fetchMachines()
    } else {
      setMachines([])
    }
  }, [formData.type, updateLoadingState])

  // Debounced procedure fetching
  const debouncedFetchProcedures = useDebounce(async (machineId: string) => {
    if (formData.type === 'pm' && machineId) {
      updateLoadingState('fetchingProcedures', true)
      try {
        const data = await fetchWithErrorHandling(
          `/api/v1/procedures/machine/${machineId}`,
          'Failed to load procedures'
        )
        setProcedures(data)
      } catch (error) {
        setProcedures([])
      } finally {
        updateLoadingState('fetchingProcedures', false)
      }
    } else {
      setProcedures([])
    }
  }, 300)

  // Fetch procedures when machine changes
  useEffect(() => {
    const cleanup = debouncedFetchProcedures(formData.machine_id)
    return cleanup
  }, [formData.machine_id, debouncedFetchProcedures])

  // Set default values based on work order type
  useEffect(() => {
    if (formData.type === 'pm') {
      setFormData(prev => ({
        ...prev,
        status: prev.status || 'Pending',
        priority: prev.priority || 'Low',
      }))
    } else if (formData.type === 'issue') {
      setFormData(prev => ({
        ...prev,
        status: prev.status || 'Pending',
        priority: prev.priority || 'High',
        procedure_id: '',
        frequency: '',
      }))
    } else if (formData.type === 'workorder') {
      setFormData(prev => ({
        ...prev,
        status: prev.status || 'Scheduled',
        priority: null,
        procedure_id: '',
        frequency: '',
        machine_id: '',
      }))
    }
  }, [formData.type])

  // Enhanced form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    const rules = validationRules[formData.type as keyof typeof validationRules]
    
    if (!rules) {
      newErrors.type = 'Work order type is required'
      setErrors(newErrors)
      return false
    }

    // Check required fields
    rules.required.forEach(field => {
      const value = formData[field as keyof WorkOrderFormData]
      if (!value || (typeof value === 'string' && !value.trim())) {
        const fieldName = field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        newErrors[field] = `${fieldName} is required`
      }
    })

    // Check custom validation rules
    Object.entries(rules.custom).forEach(([field, validator]) => {
      const value = formData[field as keyof WorkOrderFormData] as string
      const error = validator(value)
      if (error) {
        newErrors[field] = error
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleInputChange = useCallback((field: keyof WorkOrderFormData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      
      // Validate files
      const validFiles = newFiles.filter(file => {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast.error(`File ${file.name} is too large (max 5MB)`)
          return false
        }
        if (!file.type.startsWith('image/')) {
          toast.error(`File ${file.name} is not an image`)
          return false
        }
        return true
      })

      // Create file objects with previews
      const newFilesWithPreview: FileWithPreview[] = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(7)
      }))

      setFilesWithPreview(prev => [...prev, ...newFilesWithPreview])
    }
  }

  const removeFile = (id: string) => {
    setFilesWithPreview(prev => {
      const fileToRemove = prev.find(f => f.id === id)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      filesWithPreview.forEach(fileWithPreview => {
        URL.revokeObjectURL(fileWithPreview.preview)
      })
    }
  }, [])

  const createWorkOrder = async (submitData: any) => {
    const response = await fetch('/api/v1/work_orders/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Failed to create work order')
    }

    return await response.json()
  }

  const uploadImage = async (file: File, workOrderId: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('work_order_id', workOrderId)
    formData.append('upload_type', 'before')

    const response = await fetch('/api/v1/work_orders/upload_image', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to upload ${file.name}: ${errorData.detail || 'Unknown error'}`)
    }

    return await response.json()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    updateLoadingState('submitting', true)
    try {
      const submitData: any = {
        type: formData.type,
        description: formData.description,
        procedure_id: formData.procedure_id ? parseInt(formData.procedure_id) : null,
        machine_id: formData.machine_id ? parseInt(formData.machine_id) : null,
        frequency: formData.frequency || null,
        priority: formData.priority || null,
        status: formData.status,
        due_date: formData.due_date || null,
        room_id: formData.room_id ? parseInt(formData.room_id) : null,
        assigned_to_id: formData.assigned_to_id ? parseInt(formData.assigned_to_id) : null,
        property_id: formData.property_id ? parseInt(formData.property_id) : null,
        topic_id: formData.topic_id ? parseInt(formData.topic_id) : null,
      }

      const workOrder = await createWorkOrder(submitData)

      // Upload images if any
      if (filesWithPreview.length > 0) {
        updateLoadingState('uploadingImages', true)
        const uploadResults = await Promise.allSettled(
          filesWithPreview.map(({ file }) => uploadImage(file, workOrder.id))
        )

        const failedUploads = uploadResults.filter(result => result.status === 'rejected')
        if (failedUploads.length > 0) {
          console.error('Failed uploads:', failedUploads)
          toast.warning(`Work order created, but ${failedUploads.length} images failed to upload`)
        }
      }

      toast.success('Work order created successfully!')
      router.push('/work-orders')
    } catch (error: any) {
      console.error('Error creating work order:', error)
      toast.error(error.message || 'Failed to create work order')
    } finally {
      updateLoadingState('submitting', false)
      updateLoadingState('uploadingImages', false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pm': return WrenchScrewdriverIcon
      case 'issue': return ExclamationTriangleIcon
      case 'workorder': return DocumentIcon
      default: return ClipboardDocumentListIcon
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pm': return 'bg-green-100 text-green-800 border-green-200'
      case 'issue': return 'bg-red-100 text-red-800 border-red-200'
      case 'workorder': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const isLoading = Object.values(loadingStates).some(Boolean)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Work Order</h1>
          <p className="text-gray-600">Fill out the form to create a new work order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Work Order Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Work Order Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 'pm', label: 'Preventive Maintenance', icon: WrenchScrewdriverIcon, description: 'Scheduled maintenance tasks' },
                { value: 'issue', label: 'Issue/Problem', icon: ExclamationTriangleIcon, description: 'Report and fix problems' },
                { value: 'workorder', label: 'Work Order', icon: DocumentIcon, description: 'General work requests' },
              ].map((type) => {
                const IconComponent = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleInputChange('type', type.value)}
                    disabled={isLoading}
                    className={`p-4 rounded-lg border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                      formData.type === type.value
                        ? getTypeColor(type.value)
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    aria-pressed={formData.type === type.value}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <IconComponent className="h-5 w-5" />
                      <span className="font-medium">{type.label}</span>
                    </div>
                    <p className="text-sm opacity-75">{type.description}</p>
                  </button>
                )
              })}
            </div>
            {errors.type && (
              <p className="mt-2 text-sm text-red-600" role="alert">{errors.type}</p>
            )}
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the work to be done..."
                rows={3}
                className={errors.description ? 'border-red-500' : ''}
                aria-describedby={errors.description ? "description-error" : undefined}
                aria-invalid={!!errors.description}
                disabled={isLoading}
              />
              {errors.description && (
                <p id="description-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.description}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                className={errors.due_date ? 'border-red-500' : ''}
                aria-describedby={errors.due_date ? "due_date-error" : undefined}
                aria-invalid={!!errors.due_date}
                disabled={isLoading}
              />
              {errors.due_date && (
                <p id="due_date-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.due_date}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.status ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-describedby={errors.status ? "status-error" : undefined}
                aria-invalid={!!errors.status}
                disabled={isLoading}
              >
                <option value="">Select status...</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p id="status-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.status}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="property_id">Property</Label>
              <select
                id="property_id"
                value={formData.property_id}
                onChange={(e) => handleInputChange('property_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <option value="">Select a property...</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="topic_id">Topic</Label>
              <select
                id="topic_id"
                value={formData.topic_id}
                onChange={(e) => handleInputChange('topic_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <option value="">Select a topic...</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Type-specific Details */}
        {formData.type && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(getTypeIcon(formData.type), { className: "h-5 w-5" })}
                {formData.type === 'pm' && 'Preventive Maintenance Details'}
                {formData.type === 'issue' && 'Issue Details'}
                {formData.type === 'workorder' && 'Work Order Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {visibleFields.machine_id && (
                <div>
                  <Label htmlFor="machine_id">
                    Machine * 
                    {loadingStates.fetchingMachines && (
                      <span className="ml-2 text-sm text-gray-500">(Loading...)</span>
                    )}
                  </Label>
                  <select
                    id="machine_id"
                    value={formData.machine_id}
                    onChange={(e) => handleInputChange('machine_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      errors.machine_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    aria-describedby={errors.machine_id ? "machine_id-error" : undefined}
                    aria-invalid={!!errors.machine_id}
                    disabled={isLoading || loadingStates.fetchingMachines}
                  >
                    <option value="">Select a machine...</option>
                    {machines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name}
                      </option>
                    ))}
                  </select>
                  {errors.machine_id && (
                    <p id="machine_id-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.machine_id}
                    </p>
                  )}
                </div>
              )}

              {visibleFields.procedure_id && (
                <div>
                  <Label htmlFor="procedure_id">
                    Procedure *
                    {loadingStates.fetchingProcedures && (
                      <span className="ml-2 text-sm text-gray-500">(Loading...)</span>
                    )}
                  </Label>
                  <select
                    id="procedure_id"
                    value={formData.procedure_id}
                    onChange={(e) => handleInputChange('procedure_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      errors.procedure_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!formData.machine_id || isLoading || loadingStates.fetchingProcedures}
                    aria-describedby={errors.procedure_id ? "procedure_id-error" : undefined}
                    aria-invalid={!!errors.procedure_id}
                  >
                    <option value="">
                      {!formData.machine_id ? 'Select a machine first...' : 'Select a procedure...'}
                    </option>
                    {procedures.map((procedure) => (
                      <option key={procedure.id} value={procedure.id}>
                        {procedure.title}
                      </option>
                    ))}
                  </select>
                  {errors.procedure_id && (
                    <p id="procedure_id-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.procedure_id}
                    </p>
                  )}
                </div>
              )}

              {visibleFields.frequency && (
                <div>
                  <Label htmlFor="frequency">Frequency *</Label>
                  <select
                    id="frequency"
                    value={formData.frequency}
                    onChange={(e) => handleInputChange('frequency', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      errors.frequency ? 'border-red-500' : 'border-gray-300'
                    }`}
                    aria-describedby={errors.frequency ? "frequency-error" : undefined}
                    aria-invalid={!!errors.frequency}
                    disabled={isLoading}
                  >
                    <option value="">Select frequency...</option>
                    {frequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.frequency && (
                    <p id="frequency-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.frequency}
                    </p>
                  )}
                </div>
              )}

              {visibleFields.priority && (
                <div>
                  <Label>Priority *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {priorityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleInputChange('priority', option.value)}
                        disabled={isLoading}
                        className={`p-3 rounded-lg border-2 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                          formData.priority === option.value
                            ? `${option.color} border-current`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        aria-pressed={formData.priority === option.value}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-600" role="alert">{errors.priority}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assignment & Location */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="room_id">Room</Label>
              <select
                id="room_id"
                value={formData.room_id}
                onChange={(e) => handleInputChange('room_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <option value="">Select a room...</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="assigned_to_id">Assigned To</Label>
              <select
                id="assigned_to_id"
                value={formData.assigned_to_id}
                onChange={(e) => handleInputChange('assigned_to_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <option value="">Select a technician...</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.username}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhotoIcon className="h-5 w-5" />
              Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="before_images">Before Images</Label>
              <Input
                id="before_images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="w-full"
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum file size: 5MB per image. Accepted formats: JPG, PNG, GIF, WebP
              </p>
              
              {filesWithPreview.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected Images:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {filesWithPreview.map((fileWithPreview) => (
                      <div key={fileWithPreview.id} className="relative group">
                        <img
                          src={fileWithPreview.preview}
                          alt={fileWithPreview.file.name}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(fileWithPreview.id)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={isLoading}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {fileWithPreview.file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Debug Card - Only in development */}
        {formData.type && process.env.NODE_ENV === 'development' && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Form Configuration (Debug)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-blue-800">
                <p className="mb-2">
                  <strong>Selected Type:</strong> {formData.type.toUpperCase()}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium mb-1">Visible Fields:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Description</li>
                      <li>Status</li>
                      <li>Due Date</li>
                      <li>Property</li>
                      <li>Topic</li>
                      <li>Room</li>
                      <li>Assigned To</li>
                      <li>Images</li>
                      {visibleFields.procedure_id && <li>Procedure</li>}
                      {visibleFields.machine_id && <li>Machine</li>}
                      {visibleFields.frequency && <li>Frequency</li>}
                      {visibleFields.priority && <li>Priority</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Default Values:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {formData.type === 'pm' && (
                        <>
                          <li>Status: Pending</li>
                          <li>Priority: Low</li>
                        </>
                      )}
                      {formData.type === 'issue' && (
                        <>
                          <li>Status: Pending</li>
                          <li>Priority: High</li>
                        </>
                      )}
                      {formData.type === 'workorder' && (
                        <>
                          <li>Status: Scheduled</li>
                          <li>Priority: None (hidden)</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            className="flex-1 sm:flex-none"
            disabled={isLoading}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {loadingStates.submitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {loadingStates.uploadingImages ? 'Uploading Images...' : 'Creating...'}
              </div>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Create Work Order
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}