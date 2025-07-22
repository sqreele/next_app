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
import { toast } from 'sonner'
import { 
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { 
  workOrdersAPI, 
  isValidationError, 
  getValidationErrors, 
  validateWorkOrderData,
  CreateWorkOrderData 
} from '@/services/work-orders-api'
import { useFormData } from '@/hooks/use-form-data'

// Enhanced validation schema using Zod
const workOrderSchema = z.object({
  type: z.enum(['pm', 'issue', 'workorder'], {
    required_error: 'Work order type is required'
  }),
  description: z.string()
    .min(5, 'Description must be at least 5 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  procedure_id: z.string().optional(),
  machine_id: z.string().optional(),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Yearly']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Scheduled']),
  due_date: z.string().optional(),
  room_id: z.string().optional(),
  assigned_to_id: z.string().optional(),
  property_id: z.string().optional(),
  topic_id: z.string().optional(),
}).superRefine((data, ctx) => {
  // Conditional validation based on work order type
  if (data.type === 'pm') {
    if (!data.procedure_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['procedure_id'],
        message: 'Procedure is required for Preventive Maintenance'
      })
    }
    if (!data.machine_id) {
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
    if (!data.machine_id) {
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
  
  // Date validation
  if (data.due_date) {
    const dueDate = new Date(data.due_date)
    const now = new Date()
    if (dueDate < now) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['due_date'],
        message: 'Due date cannot be in the past'
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
}

const workOrderTypes = [
  { 
    value: 'pm' as const, 
    label: 'Preventive Maintenance', 
    icon: WrenchScrewdriverIcon, 
    description: 'Scheduled maintenance tasks',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  { 
    value: 'issue' as const, 
    label: 'Issue/Problem', 
    icon: ExclamationTriangleIcon, 
    description: 'Report and fix problems',
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  { 
    value: 'workorder' as const, 
    label: 'Work Order', 
    icon: DocumentIcon, 
    description: 'General work requests',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
]

const priorityOptions = [
  { value: 'Low' as const, label: 'Low Priority', color: 'bg-gray-100 text-gray-800' },
  { value: 'Medium' as const, label: 'Medium Priority', color: 'bg-blue-100 text-blue-800' },
  { value: 'High' as const, label: 'High Priority', color: 'bg-orange-100 text-orange-800' },
]

export function ImprovedWorkOrderForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [files, setFiles] = useState<FileWithPreview[]>([])
  
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
    setError,
    clearErrors,
    formState: { errors, isValid, isDirty }
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      type: undefined,
      description: '',
      status: 'Pending',
      priority: undefined,
      procedure_id: '',
      machine_id: '',
      frequency: undefined,
      due_date: '',
      room_id: '',
      assigned_to_id: '',
      property_id: '',
      topic_id: '',
    },
    mode: 'onChange'
  })

  const watchedType = watch('type')
  const watchedMachineId = watch('machine_id')

  // Load machines when work order type changes
  useEffect(() => {
    if (watchedType && watchedType !== 'workorder') {
      fetchMachinesByType(watchedType)
      // Clear machine and procedure when type changes
      setValue('machine_id', '')
      setValue('procedure_id', '')
    }
  }, [watchedType, fetchMachinesByType, setValue])

  // Load procedures when machine changes (for PM only)
  useEffect(() => {
    if (watchedType === 'pm' && watchedMachineId) {
      fetchProceduresByMachine(parseInt(watchedMachineId))
      // Clear procedure when machine changes
      setValue('procedure_id', '')
    }
  }, [watchedType, watchedMachineId, fetchProceduresByMachine, setValue])

  // Set default values based on work order type
  useEffect(() => {
    if (watchedType === 'pm') {
      setValue('status', 'Pending')
      setValue('priority', 'Low')
    } else if (watchedType === 'issue') {
      setValue('status', 'Pending')
      setValue('priority', 'High')
    } else if (watchedType === 'workorder') {
      setValue('status', 'Scheduled')
      setValue('priority', undefined)
      setValue('procedure_id', '')
      setValue('frequency', undefined)
      setValue('machine_id', '')
    }
  }, [watchedType, setValue])

  // File handling functions
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const newFiles = Array.from(e.target.files)
    
    // Validate files
    const validFiles = newFiles.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 5MB)`)
        return false
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`)
        return false
      }
      return true
    })

    const newFilesWithPreview: FileWithPreview[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(7),
      uploadStatus: 'pending'
    }))

    setFiles(prev => [...prev, ...newFilesWithPreview])
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }, [])

  // Upload images function
  const uploadImages = useCallback(async (workOrderId: string): Promise<string[]> => {
    const pendingFiles = files.filter(f => f.uploadStatus === 'pending')
    if (pendingFiles.length === 0) return []

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
        formData.append('upload_type', 'before')

        const response = await fetch('/api/v1/work_orders/upload_image', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const result = await response.json()
        
        setFiles(prev => prev.map(f => 
          f.id === fileWithPreview.id 
            ? { ...f, uploadStatus: 'success', uploadProgress: 100 }
            : f
        ))

        return result.url
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileWithPreview.id 
            ? { ...f, uploadStatus: 'error', error: 'Upload failed' }
            : f
        ))
        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    return results.filter((url): url is string => url !== null)
  }, [files])

  // Enhanced form submission with better error handling
  const onSubmit = async (data: WorkOrderFormData) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    clearErrors() // Clear any previous errors

    try {
      // Transform data for API
      const submitData: CreateWorkOrderData = {
        type: data.type,
        description: data.description,
        procedure_id: data.procedure_id ? parseInt(data.procedure_id) : null,
        machine_id: data.machine_id ? parseInt(data.machine_id) : null,
        frequency: data.frequency || null,
        priority: data.priority || null,
        status: data.status,
        due_date: data.due_date || undefined,
        room_id: data.room_id ? parseInt(data.room_id) : undefined,
        assigned_to_id: data.assigned_to_id ? parseInt(data.assigned_to_id) : undefined,
        property_id: data.property_id ? parseInt(data.property_id) : undefined,
        topic_id: data.topic_id ? parseInt(data.topic_id) : undefined,
        before_images: [],
        after_images: [],
        before_image_path: null,
        after_image_path: null,
        pdf_file_path: null
      }

      // Client-side validation first
      const clientValidationErrors = validateWorkOrderData(submitData)
      if (clientValidationErrors.length > 0) {
        clientValidationErrors.forEach(error => toast.error(error))
        return
      }

      // Create work order - error handling is now managed by the API client
      const workOrder = await workOrdersAPI.createWorkOrder(submitData)

      // Upload images if any
      if (files.length > 0) {
        try {
          await uploadImages(workOrder.id.toString())
          const failedUploads = files.filter(f => f.uploadStatus === 'error')
          if (failedUploads.length > 0) {
            toast.warning(`Work order created, but ${failedUploads.length} images failed to upload`)
          }
        } catch (error) {
          console.error('Image upload error:', error)
          toast.warning('Work order created, but some images failed to upload')
        }
      }

      toast.success('Work order created successfully!')
      router.push('/work-orders')
    } catch (error: any) {
      console.error('Error creating work order:', error)
      
      // Handle validation errors specifically
      if (isValidationError(error)) {
        const validationErrors = getValidationErrors(error)
        
        // Set form errors for specific fields if possible
        // This is a simple mapping - you might want to make it more sophisticated
        validationErrors.forEach(errMsg => {
          if (errMsg.includes('description')) {
            setError('description', { message: errMsg })
          } else if (errMsg.includes('machine')) {
            setError('machine_id', { message: errMsg })
          } else if (errMsg.includes('procedure')) {
            setError('procedure_id', { message: errMsg })
          } else if (errMsg.includes('priority')) {
            setError('priority', { message: errMsg })
          } else {
            toast.error(errMsg)
          }
        })
      } else {
        // For non-validation errors, the API client already showed a toast
        // but we can add additional form-specific handling here if needed
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Work Order Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Work Order Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {workOrderTypes.map((type) => {
                  const IconComponent = type.icon
                  const isSelected = field.value === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => field.onChange(type.value)}
                      disabled={isSubmitting}
                      className={`p-4 rounded-lg border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSelected
                          ? type.color
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
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
            )}
          />
          {errors.type && (
            <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>
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
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="description"
                  placeholder="Describe the work to be done..."
                  rows={3}
                  disabled={isSubmitting}
                  className={errors.description ? 'border-red-500' : ''}
                />
              )}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

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
                />
              )}
            />
            {errors.due_date && (
              <p className="mt-1 text-sm text-red-600">{errors.due_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="status"
                  disabled={isSubmitting}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.status ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select status...</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
              )}
            />
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={dataLoading || isSubmitting}
                >
                  <option value="">Select a property...</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="topic_id">Topic</Label>
            <Controller
              name="topic_id"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="topic_id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={dataLoading || isSubmitting}
                >
                  <option value="">Select a topic...</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Type-specific Details */}
      {watchedType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(
                workOrderTypes.find(t => t.value === watchedType)?.icon || DocumentIcon,
                { className: "h-5 w-5" }
              )}
              {watchedType === 'pm' && 'Preventive Maintenance Details'}
              {watchedType === 'issue' && 'Issue Details'}
              {watchedType === 'workorder' && 'Work Order Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleFields.machine_id && (
              <div>
                <Label htmlFor="machine_id">Machine *</Label>
                <Controller
                  name="machine_id"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      id="machine_id"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                        errors.machine_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={dataLoading || isSubmitting}
                    >
                      <option value="">Select a machine...</option>
                      {machines.map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.machine_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.machine_id.message}</p>
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                        errors.procedure_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={!watchedMachineId || dataLoading || isSubmitting}
                    >
                      <option value="">
                        {!watchedMachineId ? 'Select a machine first...' : 'Select a procedure...'}
                      </option>
                      {procedures.map((procedure) => (
                        <option key={procedure.id} value={procedure.id}>
                          {procedure.title}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.procedure_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.procedure_id.message}</p>
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
                    >
                      <option value="">Select frequency...</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  )}
                />
                {errors.frequency && (
                  <p className="mt-1 text-sm text-red-600">{errors.frequency.message}</p>
                )}
              </div>
            )}

            {visibleFields.priority && (
              <div>
                <Label>Priority *</Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {priorityOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => field.onChange(option.value)}
                          disabled={isSubmitting}
                          className={`p-3 rounded-lg border-2 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                            field.value === option.value
                              ? `${option.color} border-current`
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-sm font-medium">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                />
                {errors.priority && (
                  <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
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
            <Controller
              name="room_id"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="room_id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={dataLoading || isSubmitting}
                >
                  <option value="">Select a room...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({room.number})
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="assigned_to_id">Assigned To</Label>
            <Controller
              name="assigned_to_id"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="assigned_to_id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={dataLoading || isSubmitting}
                >
                  <option value="">Select a technician...</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.username}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Images Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhotoIcon className="h-5 w-5" />
            Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="images">Before Images</Label>
            <Input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              disabled={isSubmitting}
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum file size: 5MB per image. Accepted formats: JPG, PNG, GIF, WebP
            </p>
            
            {files.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Images:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {files.map((fileWithPreview) => (
                    <div key={fileWithPreview.id} className="relative group">
                      <img
                        src={fileWithPreview.preview}
                        alt={fileWithPreview.file.name}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(fileWithPreview.id)}
                        disabled={isSubmitting}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XMarkIcon className="h-4 w-4" />
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="flex gap-4 pt-6 border-t">
        <Button
          type="button"
          variant="secondary"
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
              Creating...
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
  )
}
