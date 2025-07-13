'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkOrderStore } from '@/stores/work-orders-store'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { useTechnicianStore } from '@/stores/technicians-store'
import { useAuthStore } from '@/stores/auth-store'
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
  title: '',
  description: '',
  scheduledDate: '',
  location: '',
  assignedTo: '',
  priority: '',
  status: '',
  has_pm: false,        // Add this
  has_issue: false,     // Add this
  recurring: false,
  recurringFrequency: '',
  beforePhotos: [],
  afterPhotos: [],
  attachments: [],
}

export function CreateWorkOrderForm() {
  const router = useRouter()
  const { createWorkOrder, loading } = useWorkOrderStore()
  const { getOperationalMachines } = useMachineStore()
  const { getActiveRooms } = useRoomStore()
  const { getAvailableTechnicians } = useTechnicianStore()
  const { user } = useAuthStore.getState()

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

  // Status and priority mappings
  const statusMap: Record<string, 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'> = {
    'pending': 'Pending',
    'scheduled': 'In Progress',
    'in-progress': 'In Progress',
    'on-hold': 'Pending',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  }

  const priorityMap: Record<string, 'Low' | 'Medium' | 'High' | 'Urgent'> = {
    'low': 'Low',
    'medium': 'Medium', 
    'high': 'High',
    'urgent': 'Urgent',
  }

  // Data from stores
  const operationalMachines = getOperationalMachines()
  const activeRooms = getActiveRooms()
  const availableTechnicians = getAvailableTechnicians()

  // Derived variables
  const selectedRoom = activeRooms.find(room => room.number === formData.location)
  const selectedTechnician = availableTechnicians.find(tech => tech.username === formData.assignedTo)
  
  // Debug technician loading
  useEffect(() => {
    console.log('🔍 [TechnicianDebug] Available technicians count:', availableTechnicians.length)
    console.log('🔍 [TechnicianDebug] Form assignedTo:', formData.assignedTo)
    console.log('🔍 [TechnicianDebug] Selected technician:', selectedTechnician)
    if (formData.assignedTo && !selectedTechnician) {
      console.warn('⚠️ [TechnicianDebug] AssignedTo is set but technician not found!')
      console.warn('⚠️ [TechnicianDebug] Available technicians:', availableTechnicians.map(t => t.username))
    }
  }, [availableTechnicians, formData.assignedTo, selectedTechnician])

  const allFields = workOrderFormSections.flatMap(section => section.fields)
  const currentSection = workOrderFormSections[currentStep]

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { fetchMachines } = useMachineStore.getState()
        const { fetchRooms } = useRoomStore.getState()
        const { fetchTechnicians } = useTechnicianStore.getState()

        await Promise.all([
          fetchMachines(),
          fetchRooms(),
          fetchTechnicians()
        ])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load required data')
      }
    }

    fetchData()
  }, [])

  // Set assignedTo to current user when available
  useEffect(() => {
    if (user?.username && !formData.assignedTo) {
      console.log(`🔍 Setting assignedTo to current user: ${user.username}`)
      setValue('assignedTo', user.username)
    }
  }, [user, setValue, formData.assignedTo])

  // Fetch user data if not already loaded
  useEffect(() => {
    if (!user) {
      const fetchUser = async () => {
        try {
          await useAuthStore.getState().getCurrentUser()
        } catch (error) {
          console.error('Failed to fetch user:', error)
          toast.error('Failed to authenticate user')
        }
      }
      fetchUser()
    }
  }, [user])

  // Debug user data
  useEffect(() => {
    console.log('🔍 User data changed:', user)
    if (user) {
      console.log('🔍 User profile:', user.profile)
      console.log('🔍 User properties:', user.profile?.properties)
    }
  }, [user])

  // Debug form data changes
  useEffect(() => {
    console.log('🔍 Form data changed:', formData)
    console.log('🔍 Before photos:', formData.beforePhotos?.length || 0)
    console.log('🔍 After photos:', formData.afterPhotos?.length || 0)
    console.log('🔍 Has PM:', formData.has_pm)
    console.log('🔍 Has Issue:', formData.has_issue)
    if (formData.beforePhotos?.length > 0) {
      console.log('🔍 Before photos details:', formData.beforePhotos.map((img: any) => ({
        id: img.id,
        fileName: img.file?.name,
        uploadStatus: img.uploadStatus,
        uploadedUrl: img.uploadedUrl
      })))
    }
    if (formData.afterPhotos?.length > 0) {
      console.log('🔍 After photos details:', formData.afterPhotos.map((img: any) => ({
        id: img.id,
        fileName: img.file?.name,
        uploadStatus: img.uploadStatus,
        uploadedUrl: img.uploadedUrl
      })))
    }
    if (formData.assignedTo) {
      console.log('🔍 Selected technician:', selectedTechnician)
      console.log('🔍 Available technicians:', availableTechnicians.map(t => ({ 
        username: t.username, 
        id: t.id,
        profile: t.profile,
        is_active: t.is_active
      })))
      console.log('🔍 Looking for technician with username:', formData.assignedTo)
      console.log('🔍 Technician found:', availableTechnicians.find(tech => tech.username === formData.assignedTo))
      console.log('🔍 Technician ID if found:', selectedTechnician?.id)
      console.log('🔍 Technician profile if found:', selectedTechnician?.profile)
    }
    if (formData.location) {
      console.log('🔍 Selected room:', selectedRoom)
    }
  }, [formData, selectedTechnician, selectedRoom, availableTechnicians])

  const handleRoomSelect = (room: any) => {
    setValue('location', room.number)
  }

  const handleNext = () => {
    const sectionFields = currentSection.fields
    
    const sectionValid = sectionFields.every(field => {
      if (!field.required) return true
      if (field.conditional && !formData[field.conditional]) return true
      
      const value = formData[field.name]
      
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
    
    if (!formData.title?.trim()) issues.push('Title is required')
    if (!formData.description?.trim()) issues.push('Description is required')
    if (!selectedRoom) issues.push('Location/Room must be selected')
    if (!selectedTechnician) issues.push('Technician must be assigned')
    
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

    // Ensure propertyId is a number
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
      // Upload local images first
      console.log('📤 Starting to upload local images...')
      
      // Get uploaded image URLs
      const beforeImageUrls = getUploadedImageUrls('beforePhotos')
      const afterImageUrls = getUploadedImageUrls('afterPhotos')
      
      console.log('📤 Local images will be uploaded during form submission')

      // Debug logging
      console.log('👷 Selected Technician:', selectedTechnician)
      console.log('👷 Technician ID:', selectedTechnician?.id)
      console.log('👷 Technician Profile User ID:', selectedTechnician?.profile?.user_id)
      console.log('👷 Technician Profile:', selectedTechnician?.profile)
      console.log('👷 Available Technicians:', availableTechnicians)
      console.log('👷 Form Data Assigned To:', formData.assignedTo)
      console.log('👤 User data:', user)
      console.log('🏢 User profile properties:', user?.profile?.properties)

      const submitData = {
        task: formData.title,
        description: formData.description,
        status: statusMap[formData.status] || 'Pending',
        priority: priorityMap[formData.priority] || 'Medium',
        due_date: formData.scheduledDate ? formData.scheduledDate.split('T')[0] : undefined,
        room_id: selectedRoom?.id ? Number(selectedRoom.id) : undefined,
        machine_id: undefined, // Set to undefined if no machine selected
        assigned_to_id: selectedTechnician?.id ? Number(selectedTechnician.id) : 
                       selectedTechnician?.profile?.user_id ? Number(selectedTechnician.profile.user_id) : undefined,
        before_image_path: beforeImageUrls.length > 0 ? beforeImageUrls[0] : null,
        after_image_path: afterImageUrls.length > 0 ? afterImageUrls[0] : null,
        before_images: beforeImageUrls,
        after_images: afterImageUrls,
        pdf_file_path: null,
        property_id: numericPropertyId!,
        has_pm: formData.has_pm || false,           
        has_issue: formData.has_issue || false, 
      }

      console.log('📋 === ACTUAL REQUEST DATA ===')
      console.log('Task:', submitData.task)
      console.log('Description:', submitData.description)
      console.log('Status:', submitData.status)
      console.log('Priority:', submitData.priority)
      console.log('Due Date:', submitData.due_date)
      console.log('Room ID:', submitData.room_id)
      console.log('Assigned To ID:', submitData.assigned_to_id)
      console.log('Property ID:', submitData.property_id)
      console.log('Has PM:', submitData.has_pm)           // Add debug logs
      console.log('Has Issue:', submitData.has_issue)     // Add debug logs
      console.log('Before Image Path:', submitData.before_image_path)
      console.log('After Image Path:', submitData.after_image_path)
      console.log('Before Images Array:', submitData.before_images)
      console.log('After Images Array:', submitData.after_images)
      console.log('PDF File Path:', submitData.pdf_file_path)
      console.log('🔍 === END REQUEST DATA ===')

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
      case 'assignedTo':
        console.log(`🔍 [getSelectOptions] Available technicians:`, availableTechnicians.map(t => ({ username: t.username, id: t.id })))
        const options = availableTechnicians.map(tech => ({
          value: tech.username,
          label: `${tech.username} - ${tech.profile?.position || 'Technician'}`
        }))
        console.log(`🔍 [getSelectOptions] Generated options:`, options)
        return options
      case 'machine_id':
        return operationalMachines.map(machine => ({
          value: machine.id,
          label: machine.name
        }))
      default:
        return []
    }
  }

  const uploadStatus = getUploadStatus()
  const propertyId = user?.profile?.properties?.[0]?.id
  const numericPropertyId = propertyId ? Number(propertyId) : null

  console.log(`🔍 Current step: ${currentStep} (${currentSection?.id})`)
  console.log(`🔍 Current section fields:`, currentSection?.fields?.map(f => ({ name: f.name, type: f.type })))

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
          <div className="w-10"></div> {/* Spacer for centering */}
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
                  <div key={field.name} className="mb-6">
                    {/* Only show label for non-enhanced-checkbox fields */}
                    {field.type !== 'enhanced-checkbox' && (
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    )}
                    <DynamicFormRenderer
                      field={field}
                      value={formData[field.name]}
                      error={errors[field.name]}
                      onChange={(value) => setValue(field.name, value)}
                      selectOptions={getSelectOptions(field.name)}
                      autocompleteItems={field.name === 'location' ? activeRooms : []}
                      onAutocompleteSelect={field.name === 'location' ? handleRoomSelect : undefined}
                    />
                    {errors[field.name] && (
                      <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
                    )}
                    {/* Show Has PM / Has Issue badges below the machine select */}
                    {field.name === 'machine_id' && (
                      (() => {
                        const selectedMachine = operationalMachines.find(m => m.id === Number(formData.machine_id))
                        return (
                          <div className="flex gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Has PM:</span>
                              <Badge className={
                                selectedMachine
                                  ? (selectedMachine.has_pm ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                                  : 'bg-gray-100 text-gray-800'
                              }>
                                {selectedMachine
                                  ? (selectedMachine.has_pm ? 'Yes' : 'No')
                                  : 'N/A'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Has Issue:</span>
                              <Badge className={
                                selectedMachine
                                  ? (selectedMachine.has_issue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800')
                                  : 'bg-gray-100 text-gray-800'
                              }>
                                {selectedMachine
                                  ? (selectedMachine.has_issue ? 'Yes' : 'No')
                                  : 'N/A'}
                              </Badge>
                            </div>
                          </div>
                        )
                      })()
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