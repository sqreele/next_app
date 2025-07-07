// src/config/work-order-form-config.ts
import {
    ClockIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XMarkIcon,
    ClipboardDocumentListIcon,
    MapPinIcon,
    CogIcon,
    PhotoIcon
  } from '@heroicons/react/24/outline'
  
  export interface FormField {
    id: string
    name: string
    label: string
    type: 'text' | 'textarea' | 'select' | 'datetime-local' | 'date' | 'file' | 'checkbox' | 'radio' | 'autocomplete'
    required?: boolean
    placeholder?: string
    options?: Array<{
      value: string
      label: string
      icon?: React.ComponentType<{ className?: string }>
    }>
    validation?: {
      pattern?: string
      message?: string
    }
    step?: string
  }
  
  export const workOrderFormSections = [
    {
      id: 'basic-info',
      title: 'Basic Information',
      fields: [
        {
          id: 'title',
          name: 'title',
          label: 'Work Order Title',
          type: 'text' as const,
          required: true,
          placeholder: 'Enter a descriptive title for this work order',
          step: 'basic-info'
        },
        {
          id: 'description',
          name: 'description',
          label: 'Description',
          type: 'textarea' as const,
          required: true,
          placeholder: 'Provide detailed information about the work to be performed',
          step: 'basic-info'
        },
        {
          id: 'scheduledDate',
          name: 'scheduledDate',
          label: 'Scheduled Date & Time',
          type: 'datetime-local' as const,
          required: false,
          step: 'basic-info'
        },
        {
          id: 'date',
          name: 'date',
          label: 'Date',
          type: 'date' as const,
          required: true,
          placeholder: 'Select a date',
          step: 'basic-info'
        }
      ]
    },
    {
      id: 'assignment',
      title: 'Assignment Details',
      fields: [
        {
          id: 'location',
          name: 'location',
          label: 'Location',
          type: 'autocomplete' as const,
          required: true,
          placeholder: 'Search and select a room...',
          step: 'assignment'
        },
        {
          id: 'assignedTo',
          name: 'assignedTo',
          label: 'Assigned To',
          type: 'text' as const,
          required: true,
          placeholder: 'Current user will be automatically assigned',
          step: 'assignment'
        }
      ]
    },
    {
      id: 'settings',
      title: 'Settings & Configuration',
      fields: [
        {
          id: 'priority',
          name: 'priority',
          label: 'Priority Level',
          type: 'select' as const,
          required: true,
          options: [
            { 
              value: 'low', 
              label: 'Low Priority',
              icon: ClockIcon
            },
            { 
              value: 'medium', 
              label: 'Medium Priority',
              icon: ExclamationTriangleIcon
            },
            { 
              value: 'high', 
              label: 'High Priority',
              icon: ExclamationTriangleIcon
            },
            { 
              value: 'urgent', 
              label: 'Urgent',
              icon: ExclamationTriangleIcon
            }
          ],
          step: 'settings'
        },
        {
          id: 'status',
          name: 'status',
          label: 'Initial Status',
          type: 'select' as const,
          required: true,
          options: [
            { 
              value: 'pending', 
              label: 'Pending',
              icon: ClockIcon
            },
            { 
              value: 'scheduled', 
              label: 'Scheduled',
              icon: CheckCircleIcon
            },
            { 
              value: 'in-progress', 
              label: 'In Progress',
              icon: CogIcon
            },
            { 
              value: 'on-hold', 
              label: 'On Hold',
              icon: XMarkIcon
            }
          ],
          step: 'settings'
        },
        {
          id: 'recurring',
          name: 'recurring',
          label: 'Recurring Task',
          type: 'checkbox' as const,
          step: 'settings'
        },
        {
          id: 'recurringFrequency',
          name: 'recurringFrequency',
          label: 'Frequency',
          type: 'select' as const,
          options: [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
            { value: 'annually', label: 'Annually' }
          ],
          step: 'settings'
        }
      ]
    },
    {
      id: 'images',
      title: 'Images & Documentation',
      fields: [
        {
          id: 'beforePhotos',
          name: 'beforePhotos',
          label: 'Before Photos',
          type: 'file' as const,
          placeholder: 'Upload photos showing current condition',
          step: 'images'
        },
        {
          id: 'afterPhotos',
          name: 'afterPhotos',
          label: 'After Photos',
          type: 'file' as const,
          placeholder: 'Upload photos after work completion',
          step: 'images'
        },
        {
          id: 'attachments',
          name: 'attachments',
          label: 'Additional Attachments',
          type: 'file' as const,
          placeholder: 'Upload any relevant documents, diagrams, or files',
          step: 'images'
        }
      ]
    }
  ]
  
  export const progressSteps = [
    {
      id: 'basic-info',
      title: 'Basic Info',
      description: 'Task details & timing',
      icon: ClipboardDocumentListIcon,
      required: true
    },
    {
      id: 'assignment',
      title: 'Assignment',
      description: 'Location & personnel',
      icon: MapPinIcon,
      required: true
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Status & priority',
      icon: CogIcon,
      required: false
    },
    {
      id: 'images',
      title: 'Images',
      description: 'Before & after photos',
      icon: PhotoIcon,
      required: false
    }
  ] as const
  
  // Helper function to get fields for a specific step
  export const getFieldsForStep = (stepId: string): FormField[] => {
    return workOrderFormSections
      .find(section => section.id === stepId)
      ?.fields || []
  }
  
  // Helper function to get all required steps
  export const getRequiredSteps = () => {
    return progressSteps.filter(step => step.required)
  }
  
  // Helper function to validate if a step is complete
  export const isStepComplete = (stepId: string, formData: Record<string, any>): boolean => {
    const stepFields = getFieldsForStep(stepId)
    const requiredFields = stepFields.filter(field => field.required)
    
    return requiredFields.every(field => {
      const value = formData[field.name]
      return value !== undefined && value !== null && value !== ''
    })
  }