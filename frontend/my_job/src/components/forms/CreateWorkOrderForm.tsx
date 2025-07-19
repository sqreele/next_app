'use client'

import React, { useEffect, useRef } from 'react'
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

  useEffect(() => {
    if (topics.length === 0 && !topicsLoading) {
      fetchTopics()
    }
  }, [topics.length, topicsLoading, fetchTopics])

  useEffect(() => {
    if (procedures.length === 0 && !proceduresLoading) {
      fetchProcedures()
    }
  }, [procedures.length, proceduresLoading, fetchProcedures])

  const {
    formData,
    errors,
    setValue,
    validateForm,
    getUploadedImageUrls,
    areAllImagesUploaded,
    getUploadStatus,
    reset,
  } = useWorkOrderForm(initialFormData)

  const dynamicWorkOrderFormSections = React.useMemo(() => {
    const sections = JSON.parse(JSON.stringify(baseWorkOrderFormSections))
    const mainSection = sections[0]
    const fields: any[] = mainSection?.fields || []
    if (mainSection && !fields.some((f: any) => f.name === 'procedure_id')) {
      fields.push({
        name: 'procedure_id',
        label: 'Procedure',
        type: 'select',
        required: true,
        conditional: (formData: any) => !!formData.has_pm,
        selectOptions: procedures.map((proc: any) => ({ value: proc.id, label: proc.title })),
        validation: {
          custom: (value: any, formData: any) => {
            if (formData.has_pm && !value) {
              return 'Procedure is required for Preventive Maintenance'
            }
            return true
          },
        },
      })
    }
    return sections
  }, [procedures])

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

  const operationalMachines = getOperationalMachines()
  const activeRooms = getActiveRooms()
  const availableTechnicians = getAvailableTechnicians()
  const selectedRoom = activeRooms.find((room) => room.id === Number(formData.room_id))
  const selectedTechnician = availableTechnicians.find((tech) => tech.id === Number(formData.assigned_to_id))
  const selectedMachine = operationalMachines.find((machine) => machine.id === Number(formData.machine_id))
  const pmCapableMachines = operationalMachines.filter((machine) => machine.has_pm)

  useEffect(() => {
    console.log('🔍 [TechnicianDebug] Available technicians count:', availableTechnicians.length)
    console.log('🔍 [TechnicianDebug] Form assigned_to_id:', formData.assigned_to_id)
    console.log('🔍 [TechnicianDebug] Selected technician:', selectedTechnician)
    console.log('🔍 [MachineDebug] Total machines:', operationalMachines.length)
    console.log('🔍 [MachineDebug] PM-capable machines:', pmCapableMachines.length)
    console.log('🔍 [MachineDebug] Selected machine:', selectedMachine)
  }, [availableTechnicians, formData.assigned_to_id, selectedTechnician, operationalMachines, pmCapableMachines, selectedMachine])

  useEffect(() => {
    console.log('🔍 Form data changed:', formData)
    console.log('🔍 Type:', formData.type)
    console.log('🔍 Has PM:', formData.has_pm)
    console.log('🔍 Has Issue:', formData.has_issue)
  }, [formData])

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 Starting to fetch data...')
        const { fetchMachines } = useMachineStore.getState()
        const { fetchRooms } = useRoomStore.getState()
        const { fetchTechnicians } = useTechnicianStore.getState()

        console.log('🔄 Fetching machines, rooms, and technicians...')
        await Promise.all([fetchMachines(), fetchRooms(), fetchTechnicians()])
        console.log('✅ Data fetching completed')
      } catch (error) {
        console.error('❌ Error fetching data:', error)
        toast.error('Failed to load required data')
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (formData.type === 'pm' && !formData.has_pm) {
      console.log('🔧 Auto-setting has_pm to true because type is pm')
      setValue('has_pm', true)
    } else if (formData.type !== 'pm' && formData.has_pm && formData.type !== '') {
      console.log('🔧 Auto-unsetting has_pm because type is not pm')
      setValue('has_pm', false)
    }
  }, [formData.type, formData.has_pm, setValue])

  useEffect(() => {
    if (formData.type === 'pm' && selectedMachine && !selectedMachine.has_pm) {
      console.log('🔧 Type changed to PM, clearing machine selection because it does not have PM capability')
      setValue('machine_id', '')
      toast.warning('Machine cleared because it does not support Preventive Maintenance')
    }
  }, [formData.type, selectedMachine, setValue])

  const pmWarningShown = useRef(false)

  useEffect(() => {
    if (formData.type === 'pm' && !formData.machine_id && operationalMachines.length > 0) {
      const pmMachines = operationalMachines.filter((machine) => machine.has_pm)
      if (pmMachines.length === 1) {
        console.log('🤖 Auto-selecting the only available PM machine')
        setValue('machine_id', pmMachines[0].id.toString())
        toast.info(`Auto-selected ${pmMachines[0].name} (only PM machine available)`)
      } else if (pmMachines.length > 1) {
        toast.info(`${pmMachines.length} machines support PM - please select one`)
      } else if (pmMachines.length === 0 && !pmWarningShown.current) {
        toast.warning('No machines with PM capability found')
        pmWarningShown.current = true
      }
    }
    if (formData.type !== 'pm') {
      pmWarningShown.current = false
    }
  }, [formData.type, formData.machine_id, operationalMachines, setValue])

  useEffect(() => {
    if (user?.id && !formData.assigned_to_id && availableTechnicians.length > 0) {
      const currentUserAsTechnician = availableTechnicians.find((tech) => tech.id === user.id)
      if (currentUserAsTechnician) {
        console.log(`✅ Setting assigned_to_id to current user: ${user.id}`)
        setValue('assigned_to_id', user.id.toString())
      }
    }
  }, [user, setValue, formData.assigned_to_id, availableTechnicians])

  useEffect(() => {
    if (!user) {
      const fetchUser = async () => {
        try {
          console.log('🔄 Fetching current user...')
          await useAuthStore.getState().getCurrentUser()
          console.log('✅ User fetched successfully')
        } catch (error) {
          console.error('❌ Failed to fetch user:', error)
          toast.error('Failed to authenticate user')
        }
      }
      fetchUser()
    }
  }, [user])

  useEffect(() => {
    if (formData.type === 'pm' && !formData.priority) {
      setValue('priority', 'Low')
    } else if ((formData.type === 'issue' || formData.type === 'workorder') && !formData.priority) {
      setValue('priority', 'High')
    }
  }, [formData.type, formData.priority, setValue])

  const getFilteredMachines = () => {
    if (formData.type === 'pm') {
      return operationalMachines.filter((machine) => machine.has_pm)
    } else if (formData.type === 'issue' || formData.type === 'workorder') {
      return operationalMachines
    }
    return operationalMachines
  }

  const handleNext = () => {
    const sectionFields = currentSection.fields

    const sectionValid = sectionFields.every((field: any) => {
      if (!field.required && !field.conditional) return true
      if (field.conditional && !field.conditional(formData)) return true

      const value = formData[field.name]

      if (field.validation?.custom) {
        const customResult = field.validation.custom(value, formData)
        if (typeof customResult === 'string') {
          // setErrors((prev: any) => ({ ...prev, [field.name]: customResult })) // This line was removed
          return false
        }
        if (customResult === false) {
          // setErrors((prev: any) => ({ ...prev, [field.name]: `${field.label} is invalid` })) // This line was removed
          return false
        }
      }

      if (field.required) {
        if (field.type === 'image-upload') {
          if (!value || !Array.isArray(value) || value.length === 0) {
            // setErrors((prev: any) => ({ ...prev, [field.name]: `${field.label} is required` })) // This line was removed
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
          // setErrors((prev: any) => ({ ...prev, [field.name]: `${field.label} is required` })) // This line was removed
          return false
        }
      }

      return true
    })

    if (!sectionValid) {
      toast.warning('Please complete all required fields in this section')
      return
    }

    nextStep()
  }

  const validateSubmissionData = () => {
    const issues = []

    if (!formData.description?.trim()) issues.push('Description is required')
    if (!formData.room_id) issues.push('Room must be selected')
    if (!formData.assigned_to_id) issues.push('Technician must be assigned')
    if (!formData.priority) issues.push('Priority is required')
    if (!formData.status) issues.push('Status is required')

    if (formData.type === 'pm') {
      if (!formData.machine_id) issues.push('Machine is required for Preventive Maintenance')
      if (!formData.procedure_id) issues.push('Procedure is required for Preventive Maintenance')
      if (!formData.frequency) issues.push('Frequency is required for Preventive Maintenance')
    }

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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

      const submitData: CreateWorkOrderData = {
        description: formData.description,
        status: allowedStatuses.includes(formData.status as AllowedStatus) ? (formData.status as AllowedStatus) : 'Pending',
        priority: allowedPriorities.includes(formData.priority as AllowedPriority) ? (formData.priority as AllowedPriority) : 'Low',
        due_date: formData.due_date || undefined,
        room_id: formData.room_id ? Number(formData.room_id) : undefined,
        machine_id: formData.machine_id ? Number(formData.machine_id) : undefined,
        assigned_to_id: formData.assigned_to_id ? Number(formData.assigned_to_id) : undefined,
        before_image_path: beforeImageUrls.length > 0 ? beforeImageUrls[0] : undefined,
        after_image_path: afterImageUrls.length > 0 ? afterImageUrls[0] : undefined,
        before_images: beforeImageUrls,
        after_images: afterImageUrls,
        pdf_file_path: formData.pdf_file_path || undefined,
        property_id: numericPropertyId as number,
        type: allowedTypes.includes(formData.type as AllowedType) ? (formData.type as AllowedType) : 'pm',
        topic_id: formData.topic_id ? Number(formData.topic_id) : undefined,
        has_pm: !!formData.has_pm,
        has_issue: !!formData.has_issue,
        frequency: formData.frequency || undefined,
        procedure_id: formData.procedure_id ? Number(formData.procedure_id) : undefined,
      }

      console.log('📋 === FINAL SUBMIT DATA ===')
      Object.entries(submitData).forEach(([k, v]) => console.log(`${k}:`, v))
      console.log('🔍 === END SUBMIT DATA ===')

      const newWorkOrder = await createWorkOrder(submitData)
      toast.success('Work order created successfully!', {
        description: `Work order "${newWorkOrder.description}" has been created.`,
      })

      reset()
      router.push('/work-orders')
    } catch (error: any) {
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

  const getSelectOptions = (fieldName: string) => {
    switch (fieldName) {
      case 'assigned_to_id':
        const techOptions = availableTechnicians.map((tech) => ({
          value: tech.id.toString(),
          label: `${tech.username} - ${tech.profile?.position || 'Technician'}`,
        }))
        return techOptions
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
      default:
        return []
    }
  }

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
            className="block w-full border-gray-300 rounded-md shadow-sm"
          >
            {allowedTypes.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
          <select
            value={formData.topic_id || ''}
            onChange={(e) => setValue('topic_id', e.target.value)}
            className="block w-full border-gray-300 rounded-md shadow-sm"
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
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">Has PM</span>
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
        {formData.has_pm && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Procedure Title</label>
            <select
              value={formData.procedure_id || ''}
              onChange={(e) => setValue('procedure_id', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value="">Select a procedure...</option>
              {procedures.map((proc: any) => (
                <option key={proc.id} value={proc.id}>
                  {proc.title}
                </option>
              ))}
            </select>
          </div>
        )}
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
          <div className="lg:hidden mt-4">
            <div className="flex justify-between text-xs text-gray-500">
              {dynamicWorkOrderFormSections.map((section: any, index: number) => (
                <div
                  key={index}
                  className={`flex flex-col items-center ${
                    index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                      index < currentStep
                        ? 'bg-green-500 text-white'
                        : index === currentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <span className="text-center">{section.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl lg:text-2xl">{currentSection.title}</CardTitle>
            <p className="text-gray-600 text-sm lg:text-base">Complete the {currentSection.title.toLowerCase()} information</p>
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
                {currentSection.fields.map((field: any) => (
                  <div key={field.name}>
                    {field.name === 'machine_id' ? (
                      <div className="mb-6">
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
                        {errors[field.name] && <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>}
                      </div>
                    ) : (
                      <div className="mb-6">
                        {field.name === 'priority' && (formData.type === 'pm' || formData.type === 'issue' || formData.type === 'workorder') ? (
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <input
                              type="text"
                              value={formData.priority}
                              readOnly
                              className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                            />
                          </div>
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
                    )}
                  </div>
                ))}
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
            {formData.has_pm && (
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