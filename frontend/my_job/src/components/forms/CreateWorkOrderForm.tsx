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
      console.log('🔍 Available technicians:', availableTechnicians.map(t => ({ username: t.username, id: t.id })))
      console.log('🔍 Looking for technician with username:', formData.assignedTo)
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

    const propertyId = user?.profile?.properties?.[0]?.id || user?.property_id
    if (!propertyId) {
      toast.error('No property ID associated with your account. Please contact support.')
      return
    }

    // Ensure propertyId is a number
    const numericPropertyId = Number(propertyId)
    if (isNaN(numericPropertyId)) {
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
      const uploadStatus = getUploadStatus()
      toast.error(`Please wait for all images to finish uploading. Status: ${uploadStatus.uploading} uploading, ${uploadStatus.failed} failed`)
      return
    }

    try {
      // Get uploaded image URLs
      const beforeImageUrls = getUploadedImageUrls('beforePhotos')
      const afterImageUrls = getUploadedImageUrls('afterPhotos')

      // Debug logging
      console.log('👷 Selected Technician:', selectedTechnician)
      console.log('👷 Technician ID:', selectedTechnician?.id)
      console.log('👷 Available Technicians:', availableTechnicians)
      console.log('👷 Form Data Assigned To:', formData.assignedTo)
      console.log('👤 User data:', user)
      console.log('🏢 User property_id:', user?.property_id)
      console.log('🏢 User profile properties:', user?.profile?.properties)

      const submitData = {
        task: formData.title,
        description: formData.description,
        status: statusMap[formData.status] || 'Pending',
        priority: priorityMap[formData.priority] || 'Medium',
        due_date: formData.scheduledDate ? formData.scheduledDate.split('T')[0] : undefined,
        room_id: selectedRoom?.id ? Number(selectedRoom.id) : undefined,
        machine_id: undefined, // Set to undefined if no machine selected
        assigned_to_id: selectedTechnician?.id ? Number(selectedTechnician.id) : undefined,
        before_image_path: beforeImageUrls.length > 0 ? beforeImageUrls[0] : "",
        after_image_path: afterImageUrls.length > 0 ? afterImageUrls[0] : "",
        before_images: beforeImageUrls,
        after_images: afterImageUrls,
        pdf_file_path: "",
        property_id: numericPropertyId,
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
      default:
        return []
    }
  }

  const uploadStatus = getUploadStatus()
  const propertyId = user?.profile?.properties?.[0]?.id || user?.property_id
  const numericPropertyId = propertyId ? Number(propertyId) : null

  console.log(`🔍 Current step: ${currentStep} (${currentSection?.id})`)
  console.log(`🔍 Current section fields:`, currentSection?.fields?.map(f => ({ name: f.name, type: f.type })))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      {/* Upload Status Alert */}
      {uploadStatus.total > 0 && (uploadStatus.uploading > 0 || uploadStatus.failed > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="text-yellow-800">
              <strong>Image Upload Status:</strong> {uploadStatus.uploaded} uploaded, {uploadStatus.uploading} uploading, {uploadStatus.failed} failed
            </div>
          </div>
          {uploadStatus.failed > 0 && (
            <p className="text-yellow-700 text-sm mt-1">
              Please retry failed uploads before submitting the form.
            </p>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <ProgressBar
        steps={progressSteps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        stepsWithErrors={stepsWithErrors}
        onStepClick={goToStep}
        showProgress={true}
        className="mb-8"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Section */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {progressSteps[currentStep]?.icon && (
                    React.createElement(progressSteps[currentStep].icon, { className: "h-5 w-5" })
                  )}
                  {currentSection.title}
                </CardTitle>
                {progressSteps[currentStep]?.description && (
                  <p className="text-sm text-gray-600">
                    {progressSteps[currentStep].description}
                  </p>
                )}
                {currentSection.id === 'images' && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-700">
                      💡 Images will be uploaded immediately when selected. Please wait for uploads to complete before proceeding.
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {currentSection.id === 'review' ? (
                  <ReviewSection
                    formData={formData}
                    activeRooms={activeRooms}
                    availableTechnicians={availableTechnicians}
                    getUploadedImageUrls={getUploadedImageUrls}
                    uploadStatus={uploadStatus}
                  />
                ) : (
                  currentSection.fields.map((field) => {
                    console.log(`🔍 Rendering field: ${field.name}`, {
                      type: field.type,
                      value: formData[field.name],
                      isImageUpload: field.type === 'image-upload'
                    })
                    return (
                      <DynamicFormRenderer
                        key={field.name}
                        field={field}
                        value={formData[field.name]}
                        error={errors[field.name]}
                        onChange={(value) => {
                          console.log(`🔧 Field ${field.name} onChange called with:`, value)
                          console.log(`🔧 Field ${field.name} onChange - isArray:`, Array.isArray(value))
                          console.log(`🔧 Field ${field.name} onChange - length:`, Array.isArray(value) ? value.length : 'not array')
                          if (Array.isArray(value) && value.length > 0) {
                            console.log(`🔧 Field ${field.name} onChange - first item:`, {
                              id: value[0].id,
                              fileName: value[0].file?.name,
                              uploadStatus: value[0].uploadStatus
                            })
                          }
                          console.log(`🔧 Field ${field.name} onChange - calling setValue`)
                          setValue(field.name, value)
                          console.log(`🔧 Field ${field.name} onChange - setValue called`)
                          
                          // Add a small delay to see if the form data is updated
                          setTimeout(() => {
                            console.log(`🔧 Field ${field.name} onChange - form data after setValue:`, formData[field.name])
                          }, 100)
                        }}
                        selectOptions={getSelectOptions(field.name)}
                        autocompleteItems={field.name === 'location' ? activeRooms : []}
                        onAutocompleteSelect={field.name === 'location' ? handleRoomSelect : undefined}
                      />
                    )
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={prevStep}
            disabled={!canGoPrev()}
            className="flex items-center gap-2"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Step {currentStep + 1} of {progressSteps.length}</span>
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <span>{getCompletionPercentage()}% Complete</span>
          </div>

          {canGoNext() ? (
            <Button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2"
              disabled={
                currentSection.id === 'images' && 
                (uploadStatus.uploading > 0 || uploadStatus.failed > 0)
              }
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading || !areAllImagesUploaded() || !propertyId}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : !areAllImagesUploaded() ? (
                <>
                  Waiting for uploads...
                </>
              ) : !propertyId ? (
                <>
                  Missing property ID
                </>
              ) : (
                'Create Work Order'
              )}
            </Button>
          )}
        </div>
      </form>

      {/* Summary Sidebar */}
      <Card className="lg:fixed lg:top-4 lg:right-4 lg:w-80 lg:max-h-[80vh] lg:overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Progress:</span>
              <span className="font-medium">{getCompletionPercentage()}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Title:</span>
              <span className="font-medium truncate">{formData.title || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <Badge className="bg-yellow-100 text-yellow-800">
                {formData.status || 'Not set'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Priority:</span>
              <Badge className="bg-blue-100 text-blue-800">
                {formData.priority || 'Not set'}
              </Badge>
            </div>
            {formData.scheduledDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Due:</span>
                <span className="font-medium">{new Date(formData.scheduledDate).toLocaleDateString()}</span>
              </div>
            )}
            {uploadStatus.total > 0 && (
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Images:</span>
                  <span className="font-medium">{uploadStatus.uploaded} / {uploadStatus.total} uploaded</span>
                </div>
                {uploadStatus.uploading > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 mt-1">
                    {uploadStatus.uploading} uploading
                  </Badge>
                )}
                {uploadStatus.failed > 0 && (
                  <Badge className="bg-red-100 text-red-800 mt-1">
                    {uploadStatus.failed} failed
                  </Badge>
                )}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Property ID:</span>
              <span className="font-medium">{numericPropertyId || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Room:</span>
              <span className="font-medium">{selectedRoom?.name || 'Not selected'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Technician:</span>
              <span className="font-medium">{selectedTechnician?.username || 'Not assigned'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}