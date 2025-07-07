// src/components/forms/CreateWorkOrderForm.tsx
'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkOrderStore } from '@/stores/work-orders-store'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { useTechnicianStore } from '@/stores/technicians-store'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ClipboardDocumentListIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { workOrderFormSections, progressSteps } from '@/config/work-order-form-config'
import { useWorkOrderForm } from '@/hooks/use-work-order-form'
import { useFormProgress } from '@/hooks/use-form-progress'
import { DynamicFormRenderer } from './dynamic-form-renderer'
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
  const { user } = useAuthStore()
  
  const {
    formData,
    errors,
    setValue,
    validateForm,
    getImageFiles,
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
      }
    }

    fetchData()
  }, [])

  // Set assignedTo to current user when available
  useEffect(() => {
    if (user?.username && !formData.assignedTo) {
      setValue('assignedTo', user.username)
    }
  }, [user, setValue, formData.assignedTo])

  const operationalMachines = getOperationalMachines()
  const activeRooms = getActiveRooms()
  const availableTechnicians = getAvailableTechnicians()

  const allFields = workOrderFormSections.flatMap(section => section.fields)
  const currentSection = workOrderFormSections[currentStep]

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
        return !field.required || (Array.isArray(value) && value.length > 0)
      }
      
      return value !== null && value !== undefined && value !== '' && value !== 0
    })

    if (!sectionValid) {
      toast.warning('Please complete all required fields in this section')
      return
    }

    nextStep()
  }

  // Upload images to server
  const uploadImages = async (workOrderId: number, fieldName: string, files: File[]) => {
    if (files.length === 0) return []

    const uploadPromises = files.map(async (file, index) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_type', fieldName === 'beforePhotos' ? 'before' : 'after')
      formData.append('order', index.toString())

      try {
        const response = await fetch(`/api/v1/work_orders/${workOrderId}/upload_file`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        return await response.json()
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error)
        toast.error(`Failed to upload ${file.name}`)
        throw error
      }
    })

    return Promise.all(uploadPromises)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm(allFields)) {
      toast.error('Please fix the errors in the form')
      return
    }

    try {
      const selectedRoom = activeRooms.find(room => room.number === formData.location)
      const selectedTechnician = availableTechnicians.find(tech => tech.username === formData.assignedTo)

      const statusMap: Record<string, 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'> = {
        'pending': 'Pending',
        'scheduled': 'In Progress',
        'in-progress': 'In Progress',
        'on-hold': 'Pending',
      }

      const priorityMap: Record<string, 'Low' | 'Medium' | 'High' | 'Urgent'> = {
        'low': 'Low',
        'medium': 'Medium', 
        'high': 'High',
        'urgent': 'Urgent',
      }

      const dueDate = formData.scheduledDate ? 
        formData.scheduledDate.split('T')[0] : 
        undefined

      const submitData = {
        task: formData.title,
        description: formData.description,
        status: statusMap[formData.status] || 'Pending',
        priority: priorityMap[formData.priority] || 'Medium',
        due_date: dueDate,
        room_id: selectedRoom?.id,
        assigned_to_id: selectedTechnician?.id,
      }

      // Create work order first
      const newWorkOrder = await createWorkOrder(submitData, 1)
      
      // Upload images if any
      const beforeFiles = getImageFiles('beforePhotos')
      const afterFiles = getImageFiles('afterPhotos')

      if (beforeFiles.length > 0 || afterFiles.length > 0) {
        toast.info('Uploading images...')
        
        try {
          if (beforeFiles.length > 0) {
            await uploadImages(newWorkOrder.id, 'beforePhotos', beforeFiles)
          }
          
          if (afterFiles.length > 0) {
            await uploadImages(newWorkOrder.id, 'afterPhotos', afterFiles)
          }
          
          toast.success('Images uploaded successfully!')
        } catch (error) {
          toast.warning('Work order created, but some images failed to upload')
        }
      }
      
      toast.success('Work order created successfully!', {
        description: `Work order "${newWorkOrder.task}" has been created.`
      })

      // Clean up and redirect
      reset()
      router.push('/work-orders')
      
    } catch (error: any) {
      console.error('Error creating work order:', error)
      toast.error('Failed to create work order')
    }
  }

  const getSelectOptions = (fieldName: string) => {
    switch (fieldName) {
      case 'assignedTo':
        return availableTechnicians.map(tech => ({
          value: tech.username,
          label: `${tech.username} - ${tech.profile.position}`
        }))
      default:
        return []
    }
  }

  const getImageCount = (fieldName: string) => {
    const value = formData[fieldName]
    return Array.isArray(value) ? value.length : 0
  }

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
                      💡 Add before and after photos to document the work. Images help track progress and maintain quality records.
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {currentSection.fields.map((field) => (
                  <DynamicFormRenderer
                    key={field.name}
                    field={field}
                    value={formData[field.name]}
                    error={errors[field.name]}
                    onChange={(value) => setValue(field.name, value)}
                    selectOptions={getSelectOptions(field.name)}
                    autocompleteItems={field.name === 'location' ? activeRooms : []}
                    onAutocompleteSelect={field.name === 'location' ? handleRoomSelect : undefined}
                  />
                ))}
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
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
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
            {getImageCount('beforePhotos') > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Before Photos:</span>
                <Badge className="bg-green-100 text-green-800">
                  {getImageCount('beforePhotos')} files
                </Badge>
              </div>
            )}
            {getImageCount('afterPhotos') > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">After Photos:</span>
                <Badge className="bg-green-100 text-green-800">
                  {getImageCount('afterPhotos')} files
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}