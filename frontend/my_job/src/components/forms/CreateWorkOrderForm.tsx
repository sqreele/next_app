'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkOrderStore } from '@/stores/work-orders-store'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { useTechnicianStore } from '@/stores/technicians-store'
import { useAuthStore } from '@/stores/auth-store'
import { useTopicsStore } from '@/stores/topics-store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ClipboardDocumentListIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { workOrderFormSections, progressSteps } from '@/config/work-order-form-config'
import { useWorkOrderForm } from '@/hooks/use-work-order-form'
import { useFormProgress } from '@/hooks/use-form-progress'
import { DynamicFormRenderer } from './dynamic-form-renderer'
import { ReviewSection } from './ReviewSection'
import { ProgressBar } from '@/components/ui/progress-bar'
import { motion, AnimatePresence } from 'framer-motion'

const initialFormData = {
  task: '',
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
}

export function CreateWorkOrderForm() {
  const router = useRouter()
  const { createWorkOrder, loading } = useWorkOrderStore()
  const { getOperationalMachines } = useMachineStore()
  const { getActiveRooms } = useRoomStore()
  const { getAvailableTechnicians } = useTechnicianStore()
  const { user } = useAuthStore.getState()
  const { topics, fetchTopics, loading: topicsLoading, error: topicsError } = useTopicsStore()

  useEffect(() => {
    if (topics.length === 0 && !topicsLoading) {
      fetchTopics()
    }
  }, [topics.length, topicsLoading, fetchTopics])

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
  } = useFormProgress(workOrderFormSections, formData, errors)

  // Data from stores
  const operationalMachines = getOperationalMachines()
  const activeRooms = getActiveRooms()
  const availableTechnicians = getAvailableTechnicians()

  // Derived variables
  const selectedRoom = activeRooms.find(room => room.id === Number(formData.room_id))
  const selectedTechnician = availableTechnicians.find(tech => tech.id === Number(formData.assigned_to_id))
  const selectedMachine = operationalMachines.find(machine => machine.id === Number(formData.machine_id))
  
  // PM-capable machines for filtering
  const pmCapableMachines = operationalMachines.filter(machine => machine.has_pm)

  // Debug logs
  useEffect(() => {
    console.log('🔍 [TechnicianDebug] Available technicians count:', availableTechnicians.length)
    console.log('🔍 [TechnicianDebug] Form assigned_to_id:', formData.assigned_to_id)
    console.log('🔍 [TechnicianDebug] Selected technician:', selectedTechnician)
    console.log('🔍 [MachineDebug] Total machines:', operationalMachines.length)
    console.log('🔍 [MachineDebug] PM-capable machines:', pmCapableMachines.length)
    console.log('🔍 [MachineDebug] Selected machine:', selectedMachine)
  }, [availableTechnicians, formData.assigned_to_id, selectedTechnician, operationalMachines, pmCapableMachines, selectedMachine])

  // Debug form data
  useEffect(() => {
    console.log('🔍 Form data changed:', formData)
    console.log('🔍 Type:', formData.type)
    console.log('🔍 Has PM:', formData.has_pm)
    console.log('🔍 Has Issue:', formData.has_issue)
  }, [formData])

  const allFields = workOrderFormSections.flatMap(section => section.fields)
  const currentSection = workOrderFormSections[currentStep]

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 Starting to fetch data...')
        
        const { fetchMachines } = useMachineStore.getState()
        const { fetchRooms } = useRoomStore.getState()
        const { fetchTechnicians } = useTechnicianStore.getState()

        console.log('🔄 Fetching machines, rooms, and technicians...')
        await Promise.all([
          fetchMachines(),
          fetchRooms(),
          fetchTechnicians()
        ])
        
        console.log('✅ Data fetching completed')
        
      } catch (error) {
        console.error('❌ Error fetching data:', error)
        toast.error('Failed to load required data')
      }
    }

    fetchData()
  }, [])

  // Auto-set has_pm when type is "pm"
  useEffect(() => {
    if (formData.type === 'pm' && !formData.has_pm) {
      console.log('🔧 Auto-setting has_pm to true because type is pm')
      setValue('has_pm', true)
    }
    // Optionally auto-unset has_pm when type is not pm
    else if (formData.type !== 'pm' && formData.has_pm && formData.type !== '') {
      console.log('🔧 Auto-unsetting has_pm because type is not pm')
      setValue('has_pm', false)
    }
  }, [formData.type, formData.has_pm, setValue])

  // Handle type changes and machine validation
  useEffect(() => {
    // When type changes to PM, check if selected machine supports PM
    if (formData.type === 'pm' && selectedMachine && !selectedMachine.has_pm) {
      console.log('🔧 Type changed to PM, clearing machine selection because it does not have PM capability')
      setValue('machine_id', '')
      toast.warning('Machine cleared because it does not support Preventive Maintenance')
    }
    
    // When type changes from PM, the machine restriction is lifted automatically
    if (formData.type !== 'pm' && formData.type !== '') {
      console.log('🔧 Type changed from PM, machine restrictions lifted')
    }
  }, [formData.type, selectedMachine, setValue])

  // Smart defaults for PM work orders
  useEffect(() => {
    // When user selects PM type, provide smart suggestions
    if (formData.type === 'pm' && !formData.machine_id && operationalMachines.length > 0) {
      const pmMachines = operationalMachines.filter(machine => machine.has_pm)
      
      if (pmMachines.length === 1) {
        // Auto-select if only one PM machine available
        console.log('🤖 Auto-selecting the only available PM machine')
        setValue('machine_id', pmMachines[0].id.toString())
        toast.info(`Auto-selected ${pmMachines[0].name} (only PM machine available)`)
      } else if (pmMachines.length > 1) {
        // Show helpful message if multiple PM machines available
        toast.info(`${pmMachines.length} machines support PM - please select one`)
      } else if (pmMachines.length === 0) {
        // Warn if no PM machines available
        toast.warning('No machines with PM capability found')
      }
    }
  }, [formData.type, formData.machine_id, operationalMachines, setValue])

  // Set assigned_to_id to current user when available and technicians are loaded
  useEffect(() => {
    if (user?.id && !formData.assigned_to_id && availableTechnicians.length > 0) {
      const currentUserAsTechnician = availableTechnicians.find(tech => tech.id === user.id)
      
      if (currentUserAsTechnician) {
        console.log(`✅ Setting assigned_to_id to current user: ${user.id}`)
        setValue('assigned_to_id', user.id.toString())
      }
    }
  }, [user, setValue, formData.assigned_to_id, availableTechnicians])

  // Fetch user data if not already loaded
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

  const handleNext = () => {
    const sectionFields = currentSection.fields
    
    const sectionValid = sectionFields.every(field => {
      if (!field.required) return true
      if (field.conditional && !formData[field.conditional]) return true
      
      const value = formData[field.name]
      
      // Custom validation for fields
      if (field.validation?.custom) {
        const customResult = field.validation.custom(value, formData)
        if (typeof customResult === 'string') {
          return false // Has error
        }
        if (customResult === false) {
          return false // Has error
        }
      }
      
      if (field.type === 'image-upload') {
        if (!field.required) return true
        
        if (!value || !Array.isArray(value) || value.length === 0) {
          return false
        }
        
        const hasFailedUploads = value.some(img => img.uploadStatus === 'error')
        const hasUploading = value.some(img => 
          img.uploadStatus === 'pending' || img.uploadStatus === 'uploading'
        )
        
        if (hasFailedUploads || hasUploading) {
          toast.warning('Please wait for all images to upload successfully or fix failed uploads')
          return false
        }
        
        return true
      }
      
      return value !== null && value !== undefined && value !== '' && value !== 0
    })

    if (!sectionValid) {
      toast.warning('Please complete all required fields in this section')
      return
    }

    nextStep()
  }

  const validateSubmissionData = () => {
    const issues = []
    
    if (!formData.task?.trim()) issues.push('Task is required')
    if (!formData.description?.trim()) issues.push('Description is required')
    if (!selectedRoom) issues.push('Room must be selected')
    if (!selectedTechnician) issues.push('Technician must be assigned')
    
    // Require machine for PM work orders
    if (formData.type === 'pm' && !selectedMachine) {
      issues.push('Machine selection is required for Preventive Maintenance work orders')
    }
    
    // Validate that selected machine supports PM if type is PM
    if (formData.type === 'pm' && selectedMachine && !selectedMachine.has_pm) {
      issues.push('Selected machine does not support Preventive Maintenance')
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
      
      const beforeImageUrls = getUploadedImageUrls('beforePhotos')
      const afterImageUrls = getUploadedImageUrls('afterPhotos')

      const submitData = {
        task: formData.task,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date ? formData.due_date.split('T')[0] : undefined,
        room_id: formData.room_id ? Number(formData.room_id) : undefined,
        machine_id: formData.machine_id ? Number(formData.machine_id) : null,
        assigned_to_id: formData.assigned_to_id ? Number(formData.assigned_to_id) : undefined,
        before_image_path: beforeImageUrls.length > 0 ? beforeImageUrls[0] : null,
        after_image_path: afterImageUrls.length > 0 ? afterImageUrls[0] : null,
        before_images: beforeImageUrls,
        after_images: afterImageUrls,
        pdf_file_path: formData.pdf_file_path,
        property_id: numericPropertyId!,
        type: formData.type,
        topic_id: formData.topic_id ? Number(formData.topic_id) : null,
        has_pm: formData.has_pm || false,
        has_issue: formData.has_issue || false,
      }

      console.log('📋 === FINAL SUBMIT DATA ===')
      console.log('Task:', submitData.task)
      console.log('Type:', submitData.type)
      console.log('Has PM:', submitData.has_pm)
      console.log('Has Issue:', submitData.has_issue)
      console.log('Machine ID:', submitData.machine_id)
      console.log('Room ID:', submitData.room_id)
      console.log('Assigned To ID:', submitData.assigned_to_id)
      console.log('🔍 === END SUBMIT DATA ===')

      const newWorkOrder = await createWorkOrder(submitData)
      
      toast.success('Work order created successfully!', {
        description: `Work order "${newWorkOrder.task}" has been created.`
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
        const techOptions = availableTechnicians.map(tech => ({
          value: tech.id.toString(),
          label: `${tech.username} - ${tech.profile?.position || 'Technician'}`
        }))
        return techOptions
        
      case 'machine_id':
        let machineOptions = []
        
        // If work order type is PM, only show machines that have PM
        if (formData.type === 'pm') {
          const pmMachines = operationalMachines.filter(machine => machine.has_pm)
          machineOptions = [
            { 
              value: '', 
              label: pmMachines.length > 0 
                ? 'Select PM-Capable Machine' 
                : 'No PM-Capable Machines Available' 
            },
            ...pmMachines.map(machine => ({
              value: machine.id.toString(),
              label: `${machine.name} (PM Available)`
            }))
          ]
        } else {
          // For other types, show all operational machines
          machineOptions = [
            { value: '', label: 'No Machine Selected (Optional)' },
            ...operationalMachines.map(machine => ({
              value: machine.id.toString(),
              label: machine.name
            }))
          ]
        }
        
        console.log(`🔍 Machine options for type "${formData.type}":`, machineOptions.length, 'options')
        return machineOptions
        
      case 'room_id':
        return activeRooms.map(room => ({
          value: room.id.toString(),
          label: `${room.name} (${room.number})`
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
          ...topics.map(topic => ({ value: topic.id.toString(), label: topic.title }))
        ]
      default:
        return []
    }
  }

  const uploadStatus = getUploadStatus()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Create Work Order</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Create Work Order</h1>
          </div>
          <p className="text-gray-600">Fill out the form below to create a new work order</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {workOrderFormSections.length}
            </span>
            <span className="text-sm text-gray-500">
              {getCompletionPercentage()}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getCompletionPercentage()}%` }}
            />
          </div>
          
          {/* Mobile Step Indicator */}
          <div className="lg:hidden mt-4">
            <div className="flex justify-between text-xs text-gray-500">
              {workOrderFormSections.map((section, index) => (
                <div
                  key={index}
                  className={`flex flex-col items-center ${
                    index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                    index < currentStep 
                      ? 'bg-green-500 text-white' 
                      : index === currentStep 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <span className="text-center">{section.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Container */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl lg:text-2xl">
              {currentSection.title}
            </CardTitle>
            <p className="text-gray-600 text-sm lg:text-base">
              Complete the {currentSection.title.toLowerCase()} information
            </p>
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
                {currentSection.fields.map((field) => (
                  <div key={field.name}>
                    {/* Enhanced Machine selection with PM info */}
                    {field.name === 'machine_id' ? (
                      <div className="mb-6">
                        <DynamicFormRenderer
                          field={field}
                          value={formData[field.name]}
                          error={errors[field.name]}
                          onChange={(value) => setValue(field.name, value)}
                          selectOptions={getSelectOptions(field.name)}
                        />
                        
                        {/* Show PM-specific warnings/info */}
                        {formData.type === 'pm' && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-start gap-2">
                              <div className="text-blue-600 mt-0.5">ℹ️</div>
                              <div>
                                <p className="text-sm font-medium text-blue-800">Preventive Maintenance</p>
                                <p className="text-sm text-blue-700">
                                  Only machines with PM capability are shown. 
                                  {pmCapableMachines.length} of {operationalMachines.length} machines support PM.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Show selected machine details */}
                        {selectedMachine && (
                          <div className="flex gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Has PM:</span>
                              <Badge className={
                                selectedMachine.has_pm ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }>
                                {selectedMachine.has_pm ? 'Yes' : 'No'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Has Issue:</span>
                              <Badge className={
                                selectedMachine.has_issue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                              }>
                                {selectedMachine.has_issue ? 'Yes' : 'No'}
                              </Badge>
                            </div>
                            
                            {/* Warning if PM type but machine doesn't support PM */}
                            {formData.type === 'pm' && !selectedMachine.has_pm && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                ⚠️ No PM Support
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {errors[field.name] && (
                          <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
                        )}
                      </div>
                    ) : (
                      // Regular field rendering
                      <div className="mb-6">
                        <DynamicFormRenderer
                          field={field}
                          value={formData[field.name]}
                          error={errors[field.name]}
                          onChange={(value) => setValue(field.name, value)}
                          selectOptions={getSelectOptions(field.name)}
                        />
                        {errors[field.name] && (
                          <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
          <Button
            onClick={prevStep}
            disabled={!canGoPrev}
            variant="secondary"
            className="flex-1 sm:flex-none sm:w-auto"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < workOrderFormSections.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canGoNext}
              className="flex-1 sm:flex-none sm:w-auto"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !canGoNext}
              className="flex-1 sm:flex-none sm:w-auto"
            >
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

        {/* Review Section */}
        {currentStep === workOrderFormSections.length - 1 && (
          <div className="mt-6">
            <ReviewSection 
              formData={formData}
              activeRooms={activeRooms}
              availableTechnicians={availableTechnicians}
              operationalMachines={operationalMachines}
              getUploadedImageUrls={getUploadedImageUrls}
              uploadStatus={getUploadStatus()}
            />
          </div>
        )}

        {/* Mobile Bottom Spacing */}
        <div className="h-20 lg:hidden"></div>
      </div>
    </div>
  )
}
