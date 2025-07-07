// src/components/forms/CreateWorkOrderForm.tsx (Updated with Progress Bar)
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
  date: '',
  location: '',
  assignedTo: '', // Will be set to current user's username
  priority: '',
  status: '',
  recurring: false,
  recurringFrequency: '',
  beforePhotos: null,
  afterPhotos: null,
  attachments: null,
}

export function CreateWorkOrderForm() {
  const router = useRouter()
  const { createWorkOrder, loading } = useWorkOrderStore()
  const { machines, fetchMachines, getOperationalMachines } = useMachineStore()
  const { rooms, fetchRooms, getActiveRooms } = useRoomStore()
  const { technicians, fetchTechnicians, getAvailableTechnicians } = useTechnicianStore()
  const { user } = useAuthStore()
  
  const {
    formData,
    errors,
    imagePreviews,
    setValue,
    setImagePreview,
    validateForm,
    reset
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
    isFormComplete
  } = useFormProgress(workOrderFormSections, formData, errors)

  // State for room autocomplete
  const [roomSearchTerm, setRoomSearchTerm] = React.useState('')

  // Fetch data on component mount
  useEffect(() => {
    console.log('Fetching data...')
    fetchMachines()
    fetchRooms()
    fetchTechnicians()
  }, [fetchMachines, fetchRooms, fetchTechnicians])

  // Set assignedTo to current user when user is available
  useEffect(() => {
    if (user?.username) {
      setValue('assignedTo', user.username)
    }
  }, [user, setValue])

  // Get data with null checks - memoized to prevent unnecessary re-renders
  const operationalMachines = React.useMemo(() => 
    machines ? getOperationalMachines() : [], [machines]
  )
  const activeRooms = React.useMemo(() => 
    rooms ? getActiveRooms() : [], [rooms]
  )
  const availableTechnicians = React.useMemo(() => 
    technicians ? getAvailableTechnicians() : [], [technicians]
  )
  
  // Debug rooms data (only log once when data changes)
  useEffect(() => {
    if (rooms && rooms.length > 0) {
      console.log('Rooms loaded:', rooms.length, 'active rooms')
    }
  }, [rooms])

  // Flatten all fields for validation
  // @ts-ignore - TypeScript has issues with readonly types from const assertions
  const allFields = workOrderFormSections.flatMap(section => section.fields) as any
  const currentSection = workOrderFormSections[currentStep]

  const handleImageChange = (fieldName: string) => (file: File | null) => {
    setValue(fieldName, file)
    
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(fieldName, e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(fieldName, null)
    }
  }

  const handleRoomSelect = (room: any) => {
    setValue('location', room.number)
    setRoomSearchTerm(`${room.name} (${room.number})`)
  }

  const handleNext = () => {
    // Validate current section before moving to next
    const sectionFields = currentSection.fields
    
    const sectionValid = sectionFields.every(field => {
      if (!('required' in field) || !field.required) return true
      const value = formData[field.name]
      return value !== null && value !== undefined && value !== '' && value !== 0
    })

    if (!sectionValid) {
      toast.warning('Please complete all required fields in this section')
      return
    }

    nextStep()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm(allFields)) {
      toast.error('Please fix the errors in the form')
      return
    }

    try {
      // Get room ID from location (room number)
      const selectedRoom = activeRooms.find(room => room.number === formData.location)
      const roomId = selectedRoom?.id || 0

      // Get technician ID from assignedTo (username)
      const selectedTechnician = availableTechnicians.find(tech => tech.username === formData.assignedTo)
      const technicianId = selectedTechnician?.id || 0

      // Convert status and priority to proper case for API
      const statusMap: Record<string, 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'> = {
        'pending': 'Pending',
        'scheduled': 'In Progress', // Map scheduled to In Progress
        'in-progress': 'In Progress',
        'on-hold': 'Pending', // Map on-hold to Pending
      }

      const priorityMap: Record<string, 'Low' | 'Medium' | 'High' | 'Urgent'> = {
        'low': 'Low',
        'medium': 'Medium', 
        'high': 'High',
        'urgent': 'Urgent',
      }

      // Convert datetime to date format for API
      const dueDate = formData.scheduledDate ? 
        formData.scheduledDate.split('T')[0] : // Extract just the date part
        undefined

      const submitData = {
        task: formData.title,
        description: formData.description,
        status: statusMap[formData.status] || 'Pending',
        priority: priorityMap[formData.priority] || 'Low',
        due_date: dueDate,
        machine_id: undefined, // Don't send 0, send undefined for optional fields
        room_id: roomId || undefined,
        assigned_to_id: technicianId || undefined,
      }

      console.log('Submitting work order data:', submitData)

      const newWorkOrder = await createWorkOrder(submitData, 1)
      
      toast.success('Work order created successfully!', {
        description: `Work order "${newWorkOrder.task}" has been created.`
      })

      router.push('/work-orders')
      
    } catch (error: any) {
      console.error('Error creating work order:', error)
      
      // Log more details about the error
      if (error.response) {
        console.error('Error response:', error.response.data)
        console.error('Error status:', error.response.status)
      }
      
      toast.error('Failed to create work order')
    }
  }

  const getSelectOptions = (fieldName: string) => {
    switch (fieldName) {
      case 'machine_id':
        return operationalMachines.map(machine => ({
          value: machine.id,
          label: `${machine.name} - Room: ${activeRooms.find(r => r.id === machine.room_id)?.name}`
        }))
      case 'assigned_to_id':
        return availableTechnicians.map(tech => ({
          value: tech.id,
          label: `${tech.username} - ${tech.profile.position}`
        }))
      case 'priority':
        return [
          { value: 'low', label: 'Low Priority' },
          { value: 'medium', label: 'Medium Priority' },
          { value: 'high', label: 'High Priority' },
          { value: 'urgent', label: 'Urgent' }
        ]
      case 'status':
        return [
          { value: 'pending', label: 'Pending' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'in-progress', label: 'In Progress' },
          { value: 'on-hold', label: 'On Hold' }
        ]
      case 'recurringFrequency':
        return [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'annually', label: 'Annually' }
        ]
      default:
        return []
    }
  }

  async function uploadImage(file: File, workOrderId: number, type: "before" | "after") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_type", type);

    const res = await fetch(`/api/v1/work_orders/${workOrderId}/upload_file`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Image upload failed");
    return await res.json();
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
        steps={progressSteps as any}
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
                      💡 Tip: You can skip image uploads for now and add them later. Click "Next" to continue.
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
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
                    imagePreview={imagePreviews[field.name]}
                    onImageChange={handleImageChange(field.name)}
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
              disabled={loading || !isFormComplete()}
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

      {/* Quick Summary Sidebar */}
      <Card className="lg:fixed lg:top-4 lg:right-4 lg:w-80">
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
                {formData.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Priority:</span>
              <Badge className="bg-blue-100 text-blue-800">
                {formData.priority}
              </Badge>
            </div>
            {formData.due_date && (
              <div className="flex justify-between">
                <span className="text-gray-600">Due:</span>
                <span className="font-medium">{formData.due_date}</span>
              </div>
            )}
            {formData.beforePhotos && (
              <div className="flex justify-between">
                <span className="text-gray-600">Before Photos:</span>
                <Badge className="bg-green-100 text-green-800">Uploaded</Badge>
              </div>
            )}
            {formData.afterPhotos && (
              <div className="flex justify-between">
                <span className="text-gray-600">After Photos:</span>
                <Badge className="bg-green-100 text-green-800">Uploaded</Badge>
              </div>
            )}
            {formData.attachments && (
              <div className="flex justify-between">
                <span className="text-gray-600">Attachments:</span>
                <Badge className="bg-green-100 text-green-800">Uploaded</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}