// frontend/my_job/src/components/forms/ImprovedWorkOrderForm.tsx
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  CogIcon,
  TagIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { 
  workOrdersAPI, 
  isValidationError, 
  getValidationErrors, 
  validateWorkOrderData 
} from '@/services/work-orders-api'
import { useFormData } from '@/hooks/use-form-data'

// Enhanced validation schema with more detailed job fields
const workOrderSchema = z.object({
  type: z.enum(['pm', 'issue', 'workorder'], {
    required_error: 'Work order type is required'
  }),
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  procedure_id: z.string().optional(),
  machine_id: z.string().optional(),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional().nullable(),
  status: z.enum(['Scheduled', 'Pending', 'In Progress', 'Completed']),
  due_date: z.string().optional(),
  estimated_duration: z.string()
    .regex(/^\d+$/, 'Duration must be a number')
    .optional(),
  room_id: z.string().optional(),
  assigned_to_id: z.string().optional(),
  property_id: z.string().optional(),
  topic_id: z.string().optional(),
  topic_ids: z.array(z.number()).optional(),
  safety_requirements: z.string().max(500, 'Safety requirements must be less than 500 characters').optional(),
  required_tools: z.string().max(500, 'Required tools must be less than 500 characters').optional(),
  required_parts: z.string().max(500, 'Required parts must be less than 500 characters').optional(),
  special_instructions: z.string().max(1000, 'Special instructions must be less than 1000 characters').optional(),
  cost_estimate: z.string()
    .regex(/^\d*\.?\d*$/, 'Cost must be a valid number')
    .optional(),
}).superRefine((data, ctx) => {
  // Enhanced conditional validation based on work order type
  if (data.type === 'pm') {
    if (!data.procedure_id || data.procedure_id === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['procedure_id'],
        message: 'Procedure is required for Preventive Maintenance'
      })
    }
    if (!data.machine_id || data.machine_id === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['machine_id'],
        message: 'Machine is required for Preventive Maintenance'
      })
    }
    if (!data.frequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['frequency'],
        message: 'Frequency is required for Preventive Maintenance'
      })
    }
    if (!data.priority) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priority'],
        message: 'Priority is required for Preventive Maintenance'
      })
    }
  }
  
  if (data.type === 'issue') {
    if (!data.machine_id || data.machine_id === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['machine_id'],
        message: 'Machine is required for Issue reports'
      })
    }
    if (!data.priority) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priority'],
        message: 'Priority is required for Issue reports'
      })
    }
  }
  
  // Date validation with better error handling
  if (data.due_date && data.due_date !== '') {
    const dueDate = new Date(data.due_date)
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Set to start of day for comparison
    if (dueDate < now) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['due_date'],
        message: 'Due date cannot be in the past'
      })
    }
  }

  // Cost estimate validation
  if (data.cost_estimate && data.cost_estimate !== '') {
    const cost = parseFloat(data.cost_estimate)
    if (cost < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cost_estimate'],
        message: 'Cost estimate cannot be negative'
      })
    }
    if (cost > 1000000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cost_estimate'],
        message: 'Cost estimate seems unusually high'
      })
    }
  }

  // Duration validation
  if (data.estimated_duration && data.estimated_duration !== '') {
    const duration = parseInt(data.estimated_duration)
    if (duration <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['estimated_duration'],
        message: 'Duration must be greater than 0'
      })
    }
    if (duration > 480) { // 8 hours
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['estimated_duration'],
        message: 'Duration seems unusually long (max 480 minutes)'
      })
    }
  }
})

type WorkOrderFormData = z.infer<typeof workOrderSchema>

interface FileWithPreview {
  file: File
  preview: string
  id: string
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error'
  uploadProgress?: number
  error?: string
  type: 'before' | 'after' | 'reference'
}

const workOrderTypes = [
  { 
    value: 'pm' as const, 
    label: 'Preventive Maintenance', 
    icon: WrenchScrewdriverIcon, 
    description: 'Scheduled maintenance tasks to prevent issues',
    color: 'bg-green-100 text-green-800 border-green-200',
    features: ['Scheduled maintenance', 'Machine-specific', 'Procedure-based', 'Recurring tasks']
  },
  { 
    value: 'issue' as const, 
    label: 'Issue/Problem', 
    icon: ExclamationTriangleIcon, 
    description: 'Report and fix equipment problems',
    color: 'bg-red-100 text-red-800 border-red-200',
    features: ['Problem reporting', 'Urgent repairs', 'Machine-specific', 'Priority-based']
  },
  { 
    value: 'workorder' as const, 
    label: 'General Work Order', 
    icon: DocumentIcon, 
    description: 'General work requests and tasks',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    features: ['General requests', 'Flexible scope', 'Custom tasks', 'Project work']
  },
]

const priorityOptions = [
  { 
    value: 'Low' as const, 
    label: 'Low Priority', 
    color: 'bg-gray-100 text-gray-800',
    description: 'Non-urgent, can be scheduled flexibly'
  },
  { 
    value: 'Medium' as const, 
    label: 'Medium Priority', 
    color: 'bg-blue-100 text-blue-800',
    description: 'Normal priority, complete within standard timeframe'
  },
  { 
    value: 'High' as const, 
    label: 'High Priority', 
    color: 'bg-orange-100 text-orange-800',
    description: 'Important, should be completed soon'
  },
  { 
    value: 'Critical' as const, 
    label: 'Critical Priority', 
    color: 'bg-red-100 text-red-800',
    description: 'Urgent, requires immediate attention'
  },
]

const durationOptions = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
  { value: '480', label: '8 hours (full day)' },
]

export function ImprovedWorkOrderForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [selectedTopics, setSelectedTopics] = useState<number[]>([])
  
  // Use the form data hook for dropdowns
  const {
    machines,
    rooms,
    technicians,
    procedures,
    properties,
    topics,
    loading: dataLoading,
    error: dataError,
    fetchMachinesByType,
    fetchProceduresByMachine
  } = useFormData()

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    clearErrors,
    formState: { errors, isValid, isDirty }
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      type: undefined,
      title: '',
      description: '',
      status: 'Scheduled',
      priority: null,
      procedure_id: '',
      machine_id: '',
      frequency: undefined,
      due_date: '',
      estimated_duration: '',
      room_id: '',
      assigned_to_id: '',
      property_id: '',
      topic_id: '',
      topic_ids: [],
      safety_requirements: '',
      required_tools: '',
      required_parts: '',
      special_instructions: '',
      cost_estimate: '',
    },
    mode: 'onChange'
  })

  const watchedType = watch('type')
  const watchedMachineId = watch('machine_id')

  // Load machines when work order type changes
  useEffect(() => {
    if (watchedType && watchedType !== 'workorder') {
      fetchMachinesByType(watchedType)
      // Clear machine selection when type changes
      setValue('machine_id', '')
      setValue('procedure_id', '')
    }
  }, [watchedType, fetchMachinesByType, setValue])

  // Load procedures when machine changes (for PM only)
  useEffect(() => {
    if (watchedType === 'pm' && watchedMachineId && watchedMachineId !== '') {
      fetchProceduresByMachine(parseInt(watchedMachineId))
      // Clear procedure selection when machine changes
      setValue('procedure_id', '')
    }
  }, [watchedType, watchedMachineId, fetchProceduresByMachine, setValue])

  // Set default values based on work order type
  useEffect(() => {
    if (watchedType === 'pm') {
      setValue('status', 'Scheduled')
      setValue('priority', 'Medium')
      // Clear fields that don't apply to PM
      clearErrors(['priority'])
    } else if (watchedType === 'issue') {
      setValue('status', 'Pending')
      setValue('priority', 'High')
      // Clear fields that don't apply to issues
      setValue('procedure_id', '')
      setValue('frequency', undefined)
      clearErrors(['procedure_id', 'frequency'])
    } else if (watchedType === 'workorder') {
      setValue('status', 'Scheduled')
      setValue('priority', null)
      // Clear fields that don't apply to work orders
      setValue('procedure_id', '')
      setValue('frequency', undefined)
      setValue('machine_id', '')
      clearErrors(['priority', 'procedure_id', 'frequency', 'machine_id'])
    }
  }, [watchedType, setValue, clearErrors])

  // Enhanced file handling functions with type support
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after' | 'reference' = 'before') => {
    if (!e.target.files) return

    const newFiles = Array.from(e.target.files)
    
    // Validate files with detailed feedback
    const validFiles = newFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // Increased to 10MB
        toast.error(`File "${file.name}" is too large (max 10MB)`)
        return false
      }
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" type not supported`)
        return false
      }
      return true
    })

    if (validFiles.length === 0 && newFiles.length > 0) {
      toast.error('No valid files selected')
      return
    }

    const newFilesWithPreview: FileWithPreview[] = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(7),
      uploadStatus: 'pending',
      type
    }))

    setFiles(prev => [...prev, ...newFilesWithPreview])
    
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} file(s) selected`)
    }
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== id)
    })
    toast.info('File removed')
  }, [])

  // Enhanced topic selection
  const handleTopicToggle = useCallback((topicId: number) => {
    setSelectedTopics(prev => {
      const newSelection = prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
      
      setValue('topic_ids', newSelection)
      return newSelection
    })
  }, [setValue])

  // Enhanced upload images function with better error handling
  const uploadImages = useCallback(async (workOrderId: string): Promise<string[]> => {
    const pendingFiles = files.filter(f => f.uploadStatus === 'pending')
    if (pendingFiles.length === 0) return []

    toast.info(`Uploading ${pendingFiles.length} file(s)...`)

    const uploadPromises = pendingFiles.map(async (fileWithPreview) => {
      try {
        setFiles(prev => prev.map(f => 
          f.id === fileWithPreview.id 
            ? { ...f, uploadStatus: 'uploading', uploadProgress: 0 }
            : f
        ))

        const formData = new FormData()
        formData.append('file', fileWithPreview.file)
        formData.append('work_order_id', workOrderId)
        formData.append('upload_type', fileWithPreview.type)

        const response = await fetch('/api/v1/work_orders/upload_image', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Upload failed' }))
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const result = await response.json()
        
        setFiles(prev => prev.map(f => 
          f.id === fileWithPreview.id 
            ? { ...f, uploadStatus: 'success', uploadProgress: 100 }
            : f
        ))

        return result.url || result.file_path
      } catch (error: any) {
        console.error(`Upload failed for ${fileWithPreview.file.name}:`, error)
        setFiles(prev => prev.map(f => 
          f.id === fileWithPreview.id 
            ? { ...f, uploadStatus: 'error', error: error.message }
            : f
        ))
        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    const successfulUploads = results.filter((url): url is string => url !== null)
    
    if (successfulUploads.length > 0) {
      toast.success(`${successfulUploads.length} file(s) uploaded successfully`)
    }
    
    return successfulUploads
  }, [files])

  // Enhanced form submission with improved error handling
  const onSubmit = async (data: WorkOrderFormData) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    try {
      // Transform data for API
      const submitData = {
        type: data.type,
        title: data.title?.trim(),
        description: data.description.trim(),
        procedure_id: data.procedure_id && data.procedure_id !== '' ? parseInt(data.procedure_id) : null,
        machine_id: data.machine_id && data.machine_id !== '' ? parseInt(data.machine_id) : null,
        frequency: data.frequency || null,
        priority: data.priority || null,
        status: data.status,
        due_date: data.due_date && data.due_date !== '' ? data.due_date : undefined,
        estimated_duration: data.estimated_duration && data.estimated_duration !== '' ? parseInt(data.estimated_duration) : undefined,
        room_id: data.room_id && data.room_id !== '' ? parseInt(data.room_id) : undefined,
        assigned_to_id: data.assigned_to_id && data.assigned_to_id !== '' ? parseInt(data.assigned_to_id) : undefined,
        property_id: data.property_id && data.property_id !== '' ? parseInt(data.property_id) : undefined,
        topic_id: data.topic_id && data.topic_id !== '' ? parseInt(data.topic_id) : undefined,
        topic_ids: selectedTopics,
        safety_requirements: data.safety_requirements?.trim() || null,
        required_tools: data.required_tools?.trim() || null,
        required_parts: data.required_parts?.trim() || null,
        special_instructions: data.special_instructions?.trim() || null,
        cost_estimate: data.cost_estimate && data.cost_estimate !== '' ? parseFloat(data.cost_estimate) : undefined,
        before_images: [],
        after_images: [],
      }

      // Client-side validation before submission
      const clientValidationErrors = validateWorkOrderData(submitData)
      if (clientValidationErrors.length > 0) {
        clientValidationErrors.forEach(error => toast.error(error))
        return
      }

      // Create work order with enhanced error handling
      const workOrder = await workOrdersAPI.createWorkOrder(submitData)

      // Upload images if any
      if (files.length > 0) {
        try {
          await uploadImages(workOrder.id.toString())
          const failedUploads = files.filter(f => f.uploadStatus === 'error')
          if (failedUploads.length > 0) {
            toast.warning(`Work order created, but ${failedUploads.length} file(s) failed to upload`)
          }
        } catch (error) {
          console.error('File upload error:', error)
          toast.warning('Work order created, but some files failed to upload')
        }
      }

      toast.success('Work order created successfully!')
      
      // Reset form and navigate
      reset()
      setFiles([])
      setSelectedTopics([])
      router.push('/work-orders')
      
    } catch (error: any) {
      console.error('Error creating work order:', error)
      
      // Enhanced error handling using the new API client
      if (isValidationError(error)) {
        const validationErrors = getValidationErrors(error)
        validationErrors.forEach(err => toast.error(err))
      } else {
        // Fallback for other types of errors
        toast.error(error.message || 'Failed to create work order. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cleanup effect for file previews
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [files])

  // Loading and error states
  if (dataLoading && (!machines.length && !rooms.length && !technicians.length)) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (dataError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span>Error loading form data: {dataError}</span>
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const getVisibleFields = () => ({
    procedure_id: watchedType === 'pm',
    frequency: watchedType === 'pm',
    machine_id: watchedType === 'pm' || watchedType === 'issue',
    priority: watchedType === 'pm' || watchedType === 'issue'
  })

  const visibleFields = getVisibleFields()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Work Order Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5" />
              Work Order Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {workOrderTypes.map((type) => {
                    const Icon = type.icon
                    const isSelected = field.value === type.value
                    return (
                      <button
                        key={type.value}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => field.onChange(type.value)}
                        className={`p-6 rounded-lg border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                          isSelected
                            ? `${type.color} border-current shadow-md`
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`h-6 w-6 mt-1 ${isSelected ? 'text-current' : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{type.label}</h3>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{type.description}</p>
                            <div className="flex flex-wrap gap-1 mt-3">
                              {type.features.map((feature, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            />
            {errors.type && (
              <p className="mt-2 text-sm text-red-600" role="alert">{errors.type.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Basic Information */}
        {watchedType && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="title"
                        placeholder="Enter a descriptive title for this job"
                        disabled={isSubmitting}
                        className={errors.title ? 'border-red-500' : ''}
                        aria-describedby={errors.title ? "title-error" : undefined}
                      />
                    )}
                  />
                  {errors.title && (
                    <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="description"
                        placeholder="Provide a detailed description of the work to be performed..."
                        disabled={isSubmitting}
                        rows={4}
                        className={errors.description ? 'border-red-500' : ''}
                        aria-describedby={errors.description ? "description-error" : undefined}
                      />
                    )}
                  />
                  {errors.description && (
                    <p id="description-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {visibleFields.priority && (
                  <div>
                    <Label>Priority *</Label>
                    <Controller
                      name="priority"
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {priorityOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => field.onChange(option.value)}
                              className={`p-3 rounded-lg border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                                field.value === option.value
                                  ? `${option.color} border-current`
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <span className="text-sm font-medium block">{option.label}</span>
                              <span className="text-xs text-gray-600 mt-1 block">{option.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    />
                    {errors.priority && (
                      <p className="mt-1 text-sm text-red-600" role="alert">{errors.priority.message}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CogIcon className="h-5 w-5" />
                  Technical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {visibleFields.machine_id && (
                  <div>
                    <Label htmlFor="machine_id">Machine/Equipment *</Label>
                    <Controller
                      name="machine_id"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          id="machine_id"
                          disabled={isSubmitting || dataLoading}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                            errors.machine_id ? 'border-red-500' : 'border-gray-300'
                          }`}
                          aria-describedby={errors.machine_id ? "machine_id-error" : undefined}
                        >
                          <option value="">Select equipment...</option>
                          {machines.map((machine) => (
                            <option key={machine.id} value={machine.id.toString()}>
                              {machine.name} - {machine.status}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.machine_id && (
                      <p id="machine_id-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.machine_id.message}
                      </p>
                    )}
                  </div>
                )}

                {visibleFields.procedure_id && (
                  <div>
                    <Label htmlFor="procedure_id">Procedure *</Label>
                    <Controller
                      name="procedure_id"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          id="procedure_id"
                          disabled={isSubmitting || !watchedMachineId || watchedMachineId === '' || dataLoading}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                            errors.procedure_id ? 'border-red-500' : 'border-gray-300'
                          }`}
                          aria-describedby={errors.procedure_id ? "procedure_id-error" : undefined}
                        >
                          <option value="">
                            {!watchedMachineId || watchedMachineId === '' ? 'Select equipment first...' : 'Select procedure...'}
                          </option>
                          {procedures.map((procedure) => (
                            <option key={procedure.id} value={procedure.id.toString()}>
                              {procedure.title}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.procedure_id && (
                      <p id="procedure_id-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.procedure_id.message}
                      </p>
                    )}
                  </div>
                )}

                {visibleFields.frequency && (
                  <div>
                    <Label htmlFor="frequency">Frequency *</Label>
                    <Controller
                      name="frequency"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          id="frequency"
                          disabled={isSubmitting}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                            errors.frequency ? 'border-red-500' : 'border-gray-300'
                          }`}
                          aria-describedby={errors.frequency ? "frequency-error" : undefined}
                        >
                          <option value="">Select frequency...</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly</option>
                        </select>
                      )}
                    />
                    {errors.frequency && (
                      <p id="frequency-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.frequency.message}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="estimated_duration">Estimated Duration (minutes)</Label>
                  <Controller
                    name="estimated_duration"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        id="estimated_duration"
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                          errors.estimated_duration ? 'border-red-500' : 'border-gray-300'
                        }`}
                        aria-describedby={errors.estimated_duration ? "estimated_duration-error" : undefined}
                      >
                        <option value="">Select duration...</option>
                        {durationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.estimated_duration && (
                    <p id="estimated_duration-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.estimated_duration.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cost_estimate">Cost Estimate ($)</Label>
                  <Controller
                    name="cost_estimate"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="cost_estimate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        disabled={isSubmitting}
                        className={errors.cost_estimate ? 'border-red-500' : ''}
                        aria-describedby={errors.cost_estimate ? "cost_estimate-error" : undefined}
                      />
                    )}
                  />
                  {errors.cost_estimate && (
                    <p id="cost_estimate-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.cost_estimate.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scheduling & Assignment */}
        {watchedType && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Scheduling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Controller
                    name="due_date"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="due_date"
                        type="datetime-local"
                        disabled={isSubmitting}
                        className={errors.due_date ? 'border-red-500' : ''}
                        aria-describedby={errors.due_date ? "due_date-error" : undefined}
                      />
                    )}
                  />
                  {errors.due_date && (
                    <p id="due_date-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.due_date.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        id="status"
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Assignment & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="assigned_to_id">Assigned To</Label>
                  <Controller
                    name="assigned_to_id"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        id="assigned_to_id"
                        disabled={isSubmitting || dataLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select technician...</option>
                        {technicians.map((technician) => (
                          <option key={technician.id} value={technician.id.toString()}>
                            {technician.username} - {technician.role}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="room_id">Room/Location</Label>
                  <Controller
                    name="room_id"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        id="room_id"
                        disabled={isSubmitting || dataLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select location...</option>
                        {rooms.map((room) => (
                          <option key={room.id} value={room.id.toString()}>
                            {room.name} {room.number ? `(${room.number})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="property_id">Property</Label>
                  <Controller
                    name="property_id"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        id="property_id"
                        disabled={isSubmitting || dataLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select property...</option>
                        {properties.map((property) => (
                          <option key={property.id} value={property.id.toString()}>
                            {property.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Additional Details */}
        {watchedType && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  Safety & Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="safety_requirements">Safety Requirements</Label>
                  <Controller
                    name="safety_requirements"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="safety_requirements"
                        placeholder="List any safety requirements, PPE needed, lockout procedures, etc."
                        disabled={isSubmitting}
                        rows={3}
                        className={errors.safety_requirements ? 'border-red-500' : ''}
                        aria-describedby={errors.safety_requirements ? "safety_requirements-error" : undefined}
                      />
                    )}
                  />
                  {errors.safety_requirements && (
                    <p id="safety_requirements-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.safety_requirements.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="required_tools">Required Tools</Label>
                  <Controller
                    name="required_tools"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="required_tools"
                        placeholder="List tools and equipment needed for this job"
                        disabled={isSubmitting}
                        rows={3}
                        className={errors.required_tools ? 'border-red-500' : ''}
                        aria-describedby={errors.required_tools ? "required_tools-error" : undefined}
                      />
                    )}
                  />
                  {errors.required_tools && (
                    <p id="required_tools-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.required_tools.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="required_parts">Required Parts/Materials</Label>
                  <Controller
                    name="required_parts"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="required_parts"
                        placeholder="List parts, materials, or supplies needed"
                        disabled={isSubmitting}
                        rows={3}
                        className={errors.required_parts ? 'border-red-500' : ''}
                        aria-describedby={errors.required_parts ? "required_parts-error" : undefined}
                      />
                    )}
                  />
                  {errors.required_parts && (
                    <p id="required_parts-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.required_parts.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TagIcon className="h-5 w-5" />
                  Topics & Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Related Topics</Label>
                  <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                    {topics.length > 0 ? (
                      <div className="p-2 space-y-1">
                        {topics.map((topic) => (
                          <label key={topic.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTopics.includes(topic.id)}
                              onChange={() => handleTopicToggle(topic.id)}
                              disabled={isSubmitting}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">{topic.title}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No topics available
                      </div>
                    )}
                  </div>
                  {selectedTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedTopics.map(topicId => {
                        const topic = topics.find(t => t.id === topicId)
                        return topic ? (
                          <Badge key={topicId} variant="secondary" className="text-xs">
                            {topic.title}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="special_instructions">Special Instructions</Label>
                  <Controller
                    name="special_instructions"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id="special_instructions"
                        placeholder="Any special instructions, notes, or considerations for this job"
                        disabled={isSubmitting}
                        rows={4}
                        className={errors.special_instructions ? 'border-red-500' : ''}
                        aria-describedby={errors.special_instructions ? "special_instructions-error" : undefined}
                      />
                    )}
                  />
                  {errors.special_instructions && (
                    <p id="special_instructions-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.special_instructions.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* File Attachments */}
        {watchedType && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhotoIcon className="h-5 w-5" />
                File Attachments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="before_images">Before Images</Label>
                  <Input
                    id="before_images"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'before')}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Images/PDFs showing current state</p>
                </div>
                
                <div>
                  <Label htmlFor="after_images">After Images</Label>
                  <Input
                    id="after_images"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'after')}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Images/PDFs showing completed work</p>
                </div>
                
                <div>
                  <Label htmlFor="reference_files">Reference Files</Label>
                  <Input
                    id="reference_files"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'reference')}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Manuals, diagrams, references</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                Maximum file size: 10MB per file. Accepted formats: JPG, PNG, GIF, WebP, PDF
              </p>
              
              {files.length > 0 && (
                <div className="space-y-4">
                  {['before', 'after', 'reference'].map(type => {
                    const typeFiles = files.filter(f => f.type === type)
                    if (typeFiles.length === 0) return null
                    
                    return (
                      <div key={type}>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                          {type} Files ({typeFiles.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {typeFiles.map((fileWithPreview) => (
                            <div key={fileWithPreview.id} className="relative group">
                              {fileWithPreview.file.type.startsWith('image/') ? (
                                <img
                                  src={fileWithPreview.preview}
                                  alt={fileWithPreview.file.name}
                                  className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                />
                              ) : (
                                <div className="w-full h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                  <DocumentIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeFile(fileWithPreview.id)}
                                disabled={isSubmitting}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {fileWithPreview.file.name}
                              </p>
                              {fileWithPreview.uploadStatus === 'uploading' && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                                  <span className="text-white text-xs">
                                    {fileWithPreview.uploadProgress || 0}%
                                  </span>
                                </div>
                              )}
                              {fileWithPreview.uploadStatus === 'error' && (
                                <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center rounded-lg">
                                  <span className="text-white text-xs">Failed</span>
                                </div>
                              )}
                              {fileWithPreview.uploadStatus === 'success' && (
                                <div className="absolute top-1 right-1 p-1 bg-green-500 text-white rounded-full">
                                  <CheckCircleIcon className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Buttons */}
        {watchedType && (
          <Card>
            <CardContent className="pt-6">
              <Separator className="mb-6" />
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4" />
                  <span>Form auto-saves as you type</span>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1 sm:flex-none"
                    disabled={isSubmitting}
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className="flex-1 sm:flex-none"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Job...
                      </div>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Create Job
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {!isValid && isDirty && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Please fill in all required fields before submitting.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  )
}
