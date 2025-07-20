'use client'

import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkOrderStore } from '@/stores/work-orders-store'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { useTechnicianStore } from '@/stores/technicians-store'
import { useAuthStore } from '@/stores/auth-store'
import { useTopicsStore } from '@/stores/topics-store'
import { useProceduresStore } from '@/stores/procedures-store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ClipboardDocumentListIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { workOrderFormSections as baseWorkOrderFormSections } from '@/config/work-order-form-config'
import { useWorkOrderForm } from '@/hooks/use-work-order-form'
import { useFormProgress } from '@/hooks/use-form-progress'
import { DynamicFormRenderer } from './dynamic-form-renderer'
import { ReviewSection } from './ReviewSection'
import { ProgressBar } from '@/components/ui/progress-bar'
import { motion, AnimatePresence } from 'framer-motion'

const initialFormData = {
  description: '',
  due_date: '',
  room_id: '',
  machine_id: '',
  assigned_to_id: '',
  priority: '',
  status: 'Pending',
  type: 'pm',
  topic_id: '',
  has_pm: false,
  has_issue: false,
  beforePhotos: [],
  afterPhotos: [],
  pdf_file_path: null,
  procedure_id: '',
  frequency: '',
}

const allowedStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'] as const
type AllowedStatus = typeof allowedStatuses[number]
const allowedPriorities = ['Low', 'Medium', 'High', 'Urgent'] as const
type AllowedPriority = typeof allowedPriorities[number]
const allowedTypes = ['pm', 'issue', 'workorder'] as const;
type AllowedType = typeof allowedTypes[number];

type CreateWorkOrderData = {
  description: string
  status: AllowedStatus
  priority: AllowedPriority
  due_date?: string
  room_id?: number
  machine_id?: number
  assigned_to_id?: number
  before_image_path?: string
  after_image_path?: string
  before_images: string[]
  after_images: string[]
  pdf_file_path?: string
  property_id: number
  type: AllowedType
  topic_id?: number
  has_pm?: boolean
  has_issue?: boolean
  frequency?: string
  procedure_id?: number | string
}

export function CreateWorkOrderForm() {
  const router = useRouter()
  const { createWorkOrder, loading } = useWorkOrderStore()
  const { getOperationalMachines } = useMachineStore()
  const { getActiveRooms } = useRoomStore()
  const { getAvailableTechnicians } = useTechnicianStore()
  const { user } = useAuthStore.getState()
  const { topics, fetchTopics, loading: topicsLoading, error: topicsError } = useTopicsStore()
  const { procedures, fetchProcedures, loading: proceduresLoading, error: proceduresError } = useProceduresStore()

  // Use refs to track component mount state
  const isMounted = useRef(true)
  const pmWarningShown = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Memoize expensive operations
  const operationalMachines = useMemo(() => getOperationalMachines(), [getOperationalMachines])
  const activeRooms = useMemo(() => getActiveRooms(), [getActiveRooms])
  const availableTechnicians = useMemo(() => getAvailableTechnicians(), [getAvailableTechnicians])
  const pmCapableMachines = useMemo(() => operationalMachines.filter(machine => machine.has_pm), [operationalMachines])

  const {
    formData,
    errors,
    setErrors,
    setValue,
    validateForm,
    getUploadedImageUrls,
    areAllImagesUploaded,
    getUploadStatus,
    reset,
  } = useWorkOrderForm(initialFormData)

  // Function to check if a field should be visible based on type
  const isFieldVisible = useCallback((fieldName: string, type: string) => {
    switch (type) {
      case 'pm':
        // Show: procedure_id, machine_id, frequency, priority
        return !['task'].includes(fieldName) // Show all except task if it exists
      case 'issue':
        // Hide: procedure_id, frequency
        // Show: machine_id, priority
        return !['procedure_id', 'frequency'].includes(fieldName)
      case 'workorder':
        // Hide: procedure_id, machine_id, frequency, priority
        return !['procedure_id', 'machine_id', 'frequency', 'priority'].includes(fieldName)
      default:
        return true
    }
  }, [])

  const dynamicWorkOrderFormSections = useMemo(() => {
    const sections = JSON.parse(JSON.stringify(baseWorkOrderFormSections))
    const mainSection = sections[0]
    const fields: any[] = mainSection?.fields || []

    // Add procedure_id field if it doesn't exist
    if (mainSection && !fields.some((f: any) => f.name === 'procedure_id')) {
      fields.push({
        name: 'procedure_id',
        label: 'Procedure',
        type: 'select',
        required: true,
        conditional: (formData: any) => formData.type === 'pm' && !!formData.has_pm,
        selectOptions: procedures.map((proc: any) => ({ value: proc.id, label: proc.title })),
        validation: {
          custom: (value: any, formData: any) => {
            if (formData.type === 'pm' && formData.has_pm && !value) {
              return 'Procedure is required for Preventive Maintenance'
            }
            return true
          },
        },
      })
    }

    // Add frequency field if it doesn't exist
    if (mainSection && !fields.some((f: any) => f.name === 'frequency')) {
      fields.push({
        name: 'frequency',
        label: 'Frequency',
        type: 'select',
        required: true,
        conditional: (formData: any) => formData.type === 'pm',
        selectOptions: [
          { value: '', label: 'Select Frequency' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'yearly', label: 'Yearly' },
        ],
        validation: {
          custom: (value: any, formData: any) => {
            if (formData.type === 'pm' && !value) {
              return 'Frequency is required for Preventive Maintenance'
            }
            return true
          },
        },
      })
    }

    // Filter fields based on visibility rules
    if (mainSection) {
      mainSection.fields = fields.map((field: any) => ({
        ...field,
        conditional: (formData: any) => {
          // First check the original conditional if it exists
          if (field.conditional && typeof field.conditional === 'function') {
            const originalResult = field.conditional(formData)
            if (!originalResult) return false
          }
          
          // Then check visibility based on type
          return isFieldVisible(field.name, formData.type)
        }
      }))
    }

    return sections
  }, [procedures, isFieldVisible])

  const {
    currentStep,
    completedSteps,
    stepsWithErrors,
    goToStep,
    nextStep,
    prevStep,
    canGoNext,
    canGoPrev,
    getCompletionPercentage,
  } = useFormProgress(dynamicWorkOrderFormSections, formData, errors)

  // Fetch initial data only once
  useEffect(() => {
    const fetchData = async () => {
      if (!isMounted.current) return
      
      try {
        console.log('🔄 Starting to fetch data...')
        const { fetchMachines } = useMachineStore.getState()
        const { fetchRooms } = useRoomStore.getState()
        const { fetchTechnicians } = useTechnicianStore.getState()

        await Promise.all([
          fetchMachines(),
          fetchRooms(), 
          fetchTechnicians(),
          topics.length === 0 && !topicsLoading ? fetchTopics() : Promise.resolve(),
          procedures.length === 0 && !proceduresLoading ? fetchProcedures() : Promise.resolve()
        ])
        
        if (isMounted.current) {
          console.log('✅ Data fetching completed')
        }
      } catch (error) {
        if (isMounted.current) {
          console.error('❌ Error fetching data:', error)
          toast.error('Failed to load required data')
        }
      }
    }

    fetchData()
  }, [])

  // Handle type changes and set priority accordingly
  useEffect(() => {
    if (!isMounted.current) return

    // Clear fields that are not visible for the selected type
    if (formData.type === 'workorder') {
      // Clear hidden fields for workorder
      setValue('procedure_id', '')
      setValue('machine_id', '')
      setValue('frequency', '')
      setValue('priority', 'High') // Set priority to High for workorder (will be hidden)
    } else if (formData.type === 'issue') {
      // Clear hidden fields for issue
      setValue('procedure_id', '')
      setValue('frequency', '')
      if (!formData.priority) {
        setValue('priority', 'High') // Set default priority for issue
      }
    } else if (formData.type === 'pm') {
      if (!formData.priority) {
        setValue('priority', 'Low') // Set default priority for PM
      }
    }

    // Handle has_pm based on type
    if (formData.type === 'pm' && !formData.has_pm) {
      console.log('🔧 Auto-setting has_pm to true because type is pm')
      setValue('has_pm', true)
    } else if (formData.type !== 'pm' && formData.has_pm) {
      console.log('🔧 Auto-unsetting has_pm because type is not pm')
      setValue('has_pm', false)
    }
  }, [formData.type, setValue])

  // Handle machine validation for PM
  useEffect(() => {
    if (!isMounted.current) return

    const selectedMachine = operationalMachines.find((machine) => machine.id === Number(formData.machine_id))
    
    if (formData.type === 'pm' && selectedMachine && !selectedMachine.has_pm) {
      console.log('🔧 Type changed to PM, clearing machine selection because it does not have PM capability')
      setValue('machine_id', '')
      toast.warning('Machine cleared because it does not support Preventive Maintenance')
    }
  }, [formData.type, formData.machine_id, operationalMachines, setValue])

  // Auto-select PM machine
  useEffect(() => {
    if (!isMounted.current) return

    if (formData.type === 'pm' && !formData.machine_id && operationalMachines.length > 0) {
      if (pmCapableMachines.length === 1) {
        console.log('🤖 Auto-selecting the only available PM machine')
        setValue('machine_id', pmCapableMachines[0].id.toString())
        toast.info(`Auto-selected ${pmCapableMachines[0].name} (only PM machine available)`)
      } else if (pmCapableMachines.length > 1) {
        toast.info(`${pmCapableMachines.length} machines support PM - please select one`)
      } else if (pmCapableMachines.length === 0 && !pmWarningShown.current) {
        toast.warning('No machines with PM capability found')
        pmWarningShown.current = true
      }
    }
    if (formData.type !== 'pm') {
      pmWarningShown.current = false
    }
  }, [formData.type, formData.machine_id, pmCapableMachines, setValue])

  // Auto-assign current user
  useEffect(() => {
    if (!isMounted.current) return

    if (user?.id && !formData.assigned_to_id && availableTechnicians.length > 0) {
      const currentUserAsTechnician = availableTechnicians.find((tech) => tech.id === user.id)
      if (currentUserAsTechnician) {
        console.log(`✅ Setting assigned_to_id to current user: ${user.id}`)
        setValue('assigned_to_id', user.id.toString())
      }
    }
  }, [user?.id, formData.assigned_to_id, availableTechnicians, setValue])

  // Fetch current user if needed
  useEffect(() => {
    if (!user) {
      const fetchUser = async () => {
        if (!isMounted.current) return
        
        try {
          await useAuthStore.getState().getCurrentUser()
          if (isMounted.current) {
            console.log('✅ User fetched successfully')
          }
        } catch (error) {
          if (isMounted.current) {
            console.error('❌ Failed to fetch user:', error)
            toast.error('Failed to authenticate user')
          }
        }
      }
      fetchUser()
    }
  }, [user])

  const getFilteredMachines = useCallback(() => {
    if (formData.type === 'pm') {
      return operationalMachines.filter((machine) => machine.has_pm)
    }
    return operationalMachines
  }, [formData.type, operationalMachines])

  // Fixed handleNext with proper error setting
  const handleNext = useCallback(() => {
    const currentSection = dynamicWorkOrderFormSections[currentStep]
    const sectionFields = currentSection.fields
    const newErrors: Record<string, string> = {}

    const sectionValid = sectionFields.every((field: any) => {
      if (!field.required && !field.conditional) return true
      if (field.conditional && !field.conditional(formData)) return true

      const value = formData[field.name]

      if (field.validation?.custom) {
        const customResult = field.validation.custom(value, formData)
        if (typeof customResult === 'string') {
          newErrors[field.name] = customResult
          return false
        }
        if (customResult === false) {
          newErrors[field.name] = `${field.label} is invalid`
          return false
        }
      }

      if (field.required) {
        if (field.type === 'image-upload') {
          if (!value || !Array.isArray(value) || value.length === 0) {
            newErrors[field.name] = `${field.label} is required`
            return false
          }
          const hasFailedUploads = value.some((img: any) => img.uploadStatus === 'error')
          const hasUploading = value.some((img: any) => img.uploadStatus === 'pending' || img.uploadStatus === 'uploading')
          if (hasFailedUploads || hasUploading) {
            toast.warning('Please wait for all images to upload successfully or fix failed uploads')
            return false
          }
          return true
        }
        if (!value && value !== 0) {
          newErrors[field.name] = `${field.label} is required`
          return false
        }
      }

      return true
    })

    // Set errors if any exist
    if (Object.keys(newErrors).length > 0) {
      setErrors((prev: any) => ({ ...prev, ...newErrors }))
      toast.warning('Please complete all required fields in this section')
      return
    }

    if (!sectionValid) {
      toast.warning('Please complete all required fields in this section')
      return
    }

    nextStep()
  }, [dynamicWorkOrderFormSections, currentStep, formData, setErrors, nextStep])

  const validateSubmissionData = useCallback(() => {
    const issues = []

    if (!formData.description?.trim()) issues.push('Description is required')
    if (!formData.room_id) issues.push('Room must be selected')
    if (!formData.assigned_to_id) issues.push('Technician must be assigned')
    if (!formData.status) issues.push('Status is required')

    // Type-specific validations
    if (formData.type === 'pm') {
      if (!formData.machine_id) issues.push('Machine is required for Preventive Maintenance')
      if (!formData.procedure_id) issues.push('Procedure is required for Preventive Maintenance')
      if (!formData.frequency) issues.push('Frequency is required for Preventive Maintenance')
      if (!formData.priority) issues.push('Priority is required for Preventive Maintenance')
    } else if (formData.type === 'issue') {
      if (!formData.priority) issues.push('Priority is required for Issue')
    }
    // For workorder, priority is set automatically to High

    if (formData.type === 'pm' && formData.machine_id) {
      const selectedMachine = operationalMachines.find((machine) => machine.id === Number(formData.machine_id))
      if (selectedMachine && !selectedMachine.has_pm) {
        issues.push('Selected machine does not support Preventive Maintenance')
      }
    }

    if (issues.length > 0) {
      toast.error(`Validation failed: ${issues.join(', ')}`)
      return false
    }

    return true
  }, [formData, operationalMachines])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isMounted.current) return

    if (!user) {
      toast.error('User authentication is required')
      return
    }

    const propertyId = user?.profile?.properties?.[0]?.id
    const numericPropertyId = propertyId ? Number(propertyId) : null
    if (!propertyId) {
      toast.error('No property ID associated with your account. Please contact support.')
      return
    }

    if (isNaN(numericPropertyId!)) {
      toast.error('Invalid property ID. Please contact support.')
      return
    }

    const allFields = dynamicWorkOrderFormSections.flatMap((section: any) => section.fields)
    
    if (!validateForm(allFields)) {
      toast.error('Please fix the errors in the form')
      return
    }

    if (!validateSubmissionData()) {
      return
    }

    if (!areAllImagesUploaded()) {
      toast.error('Please wait for all images to upload before submitting')
      return
    }

    try {
      console.log('📤 Starting form submission...')
      const beforeImageUrls = getUploadedImageUrls('beforePhotos') ?? []
      const afterImageUrls = getUploadedImageUrls('afterPhotos') ?? []

      // Determine priority based on type
      let finalPriority: AllowedPriority
      if (formData.type === 'workorder') {
        finalPriority = 'High' // Backend default for workorder
      } else {
        finalPriority = allowedPriorities.includes(formData.priority as AllowedPriority) 
          ? (formData.priority as AllowedPriority) 
          : (formData.type === 'pm' ? 'Low' : 'High')
      }

      const submitData: CreateWorkOrderData = {
        description: formData.description,
        status: allowedStatuses.includes(formData.status as AllowedStatus) ? (formData.status as AllowedStatus) : 'Pending',
        priority: finalPriority,
        due_date: formData.due_date || undefined,
        room_id: formData.room_id ? Number(formData.room_id) : undefined,
        machine_id: (formData.type !== 'workorder' && formData.machine_id) ? Number(formData.machine_id) : undefined,
        assigned_to_id: formData.assigned_to_id ? Number(formData.assigned_to_id) : undefined,
        before_image_path: beforeImageUrls.length > 0 ? beforeImageUrls[0] : undefined,
        after_image_path: afterImageUrls.length > 0 ? afterImageUrls[0] : undefined,
        before_images: beforeImageUrls,
        after_images: afterImageUrls,
        pdf_file_path: formData.pdf_file_path || undefined,
        property_id: numericPropertyId as number,
        type: allowedTypes.includes(formData.type as AllowedType) ? (formData.type as AllowedType) : 'pm',
        topic_id: formData.topic_id ? Number(formData.topic_id) : undefined,
        has_pm: formData.type === 'pm' ? true : false,
        has_issue: !!formData.has_issue,
        frequency: (formData.type === 'pm' && formData.frequency) ? formData.frequency : undefined,
        procedure_id: (formData.type === 'pm' && formData.procedure_id) ? Number(formData.procedure_id) : undefined,
      }

      console.log('📋 === FINAL SUBMIT DATA ===')
      console.log(`Type: ${submitData.type}`)
      console.log(`Priority: ${submitData.priority}`)
      console.log(`Machine ID: ${submitData.machine_id}`)
      console.log(`Procedure ID: ${submitData.procedure_id}`)
      console.log(`Frequency: ${submitData.frequency}`)
      Object.entries(submitData).forEach(([k, v]) => console.log(`${k}:`, v))
      console.log('🔍 === END SUBMIT DATA ===')

      if (!isMounted.current) return

      const newWorkOrder = await createWorkOrder(submitData)
      
      if (!isMounted.current) return

      toast.success('Work order created successfully!', {
        description: `Work order "${newWorkOrder.description}" has been created.`,
      })

      reset()
      router.push('/work-orders')
    } catch (error: any) {
      if (!isMounted.current) return

      console.error('❌ Error creating work order:', error)
      let errorMessage = 'Failed to create work order'
      if (error?.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => err.msg || err).join(', ')
        } else {
          errorMessage = error.response.data.detail
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    }
  }

  const getSelectOptions = useCallback((fieldName: string) => {
    switch (fieldName) {
      case 'assigned_to_id':
        return availableTechnicians.map((tech) => ({
          value: tech.id.toString(),
          label: `${tech.username} - ${tech.profile?.position || 'Technician'}`,
        }))
      case 'machine_id':
        const filteredMachines = getFilteredMachines()
        if (formData.type === 'pm') {
          return [
            { value: '', label: filteredMachines.length > 0 ? 'Select PM-Capable Machine' : 'No PM-Capable Machines Available' },
            ...filteredMachines.map((machine) => ({
              value: machine.id.toString(),
              label: `${machine.name} (PM Available)`,
            })),
          ]
        } else {
          return [
            { value: '', label: 'No Machine Selected (Optional)' },
            ...filteredMachines.map((machine) => ({
              value: machine.id.toString(),
              label: machine.name,
            })),
          ]
        }
      case 'room_id':
        return activeRooms.map((room) => ({
          value: room.id.toString(),
          label: `${room.name} (${room.number})`,
        }))
      case 'topic_id':
        if (topicsLoading) {
          return [{ value: '', label: 'Loading topics...' }]
        }
        if (topicsError) {
          return [{ value: '', label: 'Failed to load topics' }]
        }
        return [
          { value: '', label: 'No Topic Selected' },
          ...topics.map((topic) => ({ value: topic.id.toString(), label: topic.title })),
        ]
      case 'frequency':
        return [
          { value: '', label: 'Select Frequency' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'yearly', label: 'Yearly' },
        ]
      case 'procedure_id':
        if (proceduresLoading) {
          return [{ value: '', label: 'Loading procedures...' }]
        }
        if (proceduresError) {
          return [{ value: '', label: 'Failed to load procedures' }]
        }
        return [
          { value: '', label: 'Select a procedure...' },
          ...procedures.map((proc) => ({ value: proc.id.toString(), label: proc.title })),
        ]
      default:
        return []
    }
  }, [availableTechnicians, getFilteredMachines, formData.type, activeRooms, topicsLoading, topicsError, topics, procedures, proceduresLoading, proceduresError])

  const selectedRoom = activeRooms.find((room) => room.id === Number(formData.room_id))
  const selectedTechnician = availableTechnicians.find((tech) => tech.id === Number(formData.assigned_to_id))
  const selectedMachine = operationalMachines.find((machine) => machine.id === Number(formData.machine_id))
  const uploadStatus = getUploadStatus()
  const allFields = dynamicWorkOrderFormSections.flatMap((section: any) => section.fields)
  const currentSection = dynamicWorkOrderFormSections[currentStep]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Order Type</label>
          <select
            value={formData.type}
            onChange={(e) => setValue('type', e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="pm">Preventive Maintenance (PM)</option>
            <option value="issue">Issue</option>
            <option value="workorder">Work Order</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {formData.type === 'pm' && "Includes procedure, machine, frequency, and priority fields"}
            {formData.type === 'issue' && "Includes machine and priority fields"}
            {formData.type === 'workorder' && "Basic work order without machine-specific fields"}
          </p>
        </div>

        {/* Type-specific information display */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Current Configuration:</h4>
          <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
            <div>Type: <span className="font-medium">{formData.type.toUpperCase()}</span></div>
            <div>Priority: <span className="font-medium">{formData.priority || 'Not set'}</span></div>
            <div>Shows Machine: <span className="font-medium">{formData.type !== 'workorder' ? 'Yes' : 'No'}</span></div>
            <div>Shows Procedure: <span className="font-medium">{formData.type === 'pm' ? 'Yes' : 'No'}</span></div>
            <div>Shows Frequency: <span className="font-medium">{formData.type === 'pm' ? 'Yes' : 'No'}</span></div>
            <div>Shows Priority: <span className="font-medium">{formData.type !== 'workorder' ? 'Yes' : 'No'}</span></div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
          <select
            value={formData.topic_id || ''}
            onChange={(e) => setValue('topic_id', e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">No Topic Selected</option>
            {topics.map((topic: any) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-6 flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!formData.has_pm}
              onChange={(e) => setValue('has_pm', e.target.checked)}
              disabled={formData.type === 'pm'} // Auto-managed for PM type
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">Has PM {formData.type === 'pm' && '(auto-set)'}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!formData.has_issue}
              onChange={(e) => setValue('has_issue', e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">Has Issue</span>
          </label>
        </div>
      </div>

      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 rounded-md text-gray-400 hover:text-gray-600">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Create Work Order</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        <div className="hidden lg:block mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Create Work Order</h1>
          </div>
          <p className="text-gray-600">Fill out the form below to create a new work order</p>
        </div>

        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {dynamicWorkOrderFormSections.length}
            </span>
            <span className="text-sm text-gray-500">{getCompletionPercentage()}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getCompletionPercentage()}%` }}
            />
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl lg:text-2xl">{currentSection?.title}</CardTitle>
            <p className="text-gray-600 text-sm lg:text-base">Complete the {currentSection?.title?.toLowerCase()} information</p>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentSection?.fields?.map((field: any) => {
                  // Check if field should be shown based on conditional
                  if (field.conditional && !field.conditional(formData)) {
                    return null
                  }

                  return (
                    <div key={field.name} className="mb-6">
                      {field.name === 'machine_id' ? (
                        <div>
                          <DynamicFormRenderer
                            field={field}
                            value={formData[field.name]}
                            error={errors[field.name]}
                            onChange={(value) => setValue(field.name, value)}
                            selectOptions={getSelectOptions(field.name)}
                          />
                          {formData.type === 'pm' && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="flex items-start gap-2">
                                <div className="text-blue-600 mt-0.5">ℹ️</div>
                                <div>
                                  <p className="text-sm font-medium text-blue-800">Preventive Maintenance</p>
                                  <p className="text-sm text-blue-700">
                                    Only machines with PM capability are shown. {pmCapableMachines.length} of {operationalMachines.length} machines support PM.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          {selectedMachine && (
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Has PM:</span>
                                <Badge
                                  className={selectedMachine.has_pm ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                >
                                  {selectedMachine.has_pm ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Has Issue:</span>
                                <Badge
                                  className={selectedMachine.has_issue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}
                                >
                                  {selectedMachine.has_issue ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                              {formData.type === 'pm' && !selectedMachine.has_pm && (
                                <Badge className="bg-yellow-100 text-yellow-800">⚠️ No PM Support</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ) : field.name === 'priority' && formData.type === 'workorder' ? (
                        // Don't render priority field for workorder type since it's hidden
                        null
                      ) : (
                        <DynamicFormRenderer
                          field={field}
                          value={formData[field.name]}
                          error={errors[field.name]}
                          onChange={(value) => setValue(field.name, value)}
                          selectOptions={getSelectOptions(field.name)}
                        />
                      )}
                      {errors[field.name] && <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>}
                    </div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
          <Button onClick={prevStep} disabled={!canGoPrev} variant="secondary" className="flex-1 sm:flex-none sm:w-auto">
            <ChevronLeftIcon className="h-4 w-4 mr-2" />
            Previous
          </Button>
          {currentStep < dynamicWorkOrderFormSections.length - 1 ? (
            <Button onClick={handleNext} disabled={!canGoNext} className="flex-1 sm:flex-none sm:w-auto">
              Next
              <ChevronRightIcon className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || !canGoNext} className="flex-1 sm:flex-none sm:w-auto">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                  Create Work Order
                </>
              )}
            </Button>
          )}
        </div>

        {currentStep === dynamicWorkOrderFormSections.length - 1 && (
          <div className="mt-6">
            <ReviewSection
              formData={formData}
              activeRooms={activeRooms}
              availableTechnicians={availableTechnicians}
              operationalMachines={operationalMachines}
              getUploadedImageUrls={getUploadedImageUrls}
              uploadStatus={getUploadStatus()}
            />
            {formData.has_pm && formData.type === 'pm' && (
              <div className="mt-4">
                {formData.procedure_id && (
                  <div className="mb-2">
                    <span className="font-medium">Procedure:</span>{' '}
                    {procedures.find((p: any) => p.id === Number(formData.procedure_id))?.title || 'Not specified'}
                  </div>
                )}
                {formData.frequency && (
                  <div className="mb-2">
                    <span className="font-medium">Frequency:</span>{' '}
                    {formData.frequency.charAt(0).toUpperCase() + formData.frequency.slice(1)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="h-20 lg:hidden"></div>
      </div>
    </div>
  )
}