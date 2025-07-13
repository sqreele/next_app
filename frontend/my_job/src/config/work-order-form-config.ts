// src/config/work-order-form-config.ts

import {
  ClipboardDocumentListIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  PhotoIcon,
  DocumentIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon, // Add this import
} from '@heroicons/react/24/outline'

export interface ProgressStep {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface FormFieldOption {
  value: string | number
  label: string
}

export interface FormField {
  name: string
  label?: string // Made optional to allow fields without a label
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'enhanced-checkbox' | 'date' | 'datetime-local' | 'image-upload' | 'file' | 'autocomplete' | 'number' | 'tel' | 'url'
  required?: boolean
  placeholder?: string
  description?: string // Add description field for enhanced checkboxes
  options?: FormFieldOption[]
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number
  minSize?: number
  maxTotalSize?: number
  allowedFormats?: string[]
  maxWidth?: number
  maxHeight?: number
  minWidth?: number
  minHeight?: number
  conditional?: string
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: RegExp
    custom?: (value: any) => boolean | string
  }
}

export interface FormSection {
  id: string
  title: string
  fields: FormField[]
}

export const progressSteps: ProgressStep[] = [
  {
    id: 'basic',
    label: 'Basic Info',
    description: 'Work order title and description',
    icon: ClipboardDocumentListIcon,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    description: 'Maintenance type and priority',
    icon: WrenchScrewdriverIcon,
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    description: 'Due date and assignment',
    icon: CalendarIcon,
  },
  {
    id: 'assignment',
    label: 'Assignment',
    description: 'Location and technician',
    icon: UsersIcon,
  },
  {
    id: 'images',
    label: 'Images',
    description: 'Upload before and after photos',
    icon: PhotoIcon,
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Review and submit work order',
    icon: CheckCircleIcon,
  },
]

export const workOrderFormSections: FormSection[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    fields: [
      {
        name: 'title',
        label: 'Work Order Title',
        type: 'text',
        required: true,
        placeholder: 'Enter work order title...',
        validation: {
          minLength: 5,
          maxLength: 100,
        },
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the work to be done...',
        validation: {
          minLength: 10,
          maxLength: 1000,
        },
      },
    ],
  },
  {
    id: 'maintenance',
    title: 'Maintenance Details',
    fields: [
      {
        name: 'has_pm',
        label: 'Has Preventive Maintenance',
        type: 'enhanced-checkbox',
        description: 'This work order includes preventive maintenance tasks',
        required: false,
      },
      {
        name: 'has_issue',
        label: 'Has Issue/Problem',
        type: 'enhanced-checkbox',
        description: 'This work order addresses a specific issue or problem',
        required: false,
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        required: true,
        options: [
          { value: 'low', label: 'Low Priority' },
          { value: 'medium', label: 'Medium Priority' },
          { value: 'high', label: 'High Priority' },
          { value: 'urgent', label: 'Urgent' },
        ],
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'in-progress', label: 'In Progress' },
          { value: 'on-hold', label: 'On Hold' },
        ],
      },
    ],
  },
  {
    id: 'scheduling',
    title: 'Scheduling & Assignment',
    fields: [
      {
        name: 'scheduledDate',
        label: 'Scheduled Date',
        type: 'datetime-local',
        required: true,
        validation: {
          custom: (value: string) => {
            const selectedDate = new Date(value)
            const now = new Date()
            return selectedDate > now || 'Scheduled date must be in the future'
          },
        },
      },
      {
        name: 'recurring',
        label: 'Recurring Work Order',
        type: 'checkbox',
        required: false,
      },
      {
        name: 'recurringFrequency',
        label: 'Frequency',
        type: 'select',
        required: false,
        conditional: 'recurring',
        options: [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'annually', label: 'Annually' },
        ],
      },
    ],
  },
  {
    id: 'assignment',
    title: 'Assignment & Location',
    fields: [
      {
        name: 'location',
        label: 'Room/Location',
        type: 'autocomplete',
        required: true,
        placeholder: 'Search for a room...',
      },
      {
        name: 'assignedTo',
        label: 'Assigned To',
        type: 'select',
        required: true,
      },
    ],
  },
  {
    id: 'images',
    title: 'Images & Documentation',
    fields: [
      {
        name: 'beforePhotos',
        label: 'Before Photos',
        type: 'image-upload',
        accept: 'image/*',
        required: false,
        multiple: true,
        maxFiles: 5,
        maxSize: 10,
        minSize: 0.01,
        maxTotalSize: 25,
        allowedFormats: ['jpeg', 'jpg', 'png', 'webp'],
        maxWidth: 4096,
        maxHeight: 4096,
        minWidth: 200,
        minHeight: 200,
      },
      {
        name: 'afterPhotos',
        label: 'After Photos',
        type: 'image-upload',
        accept: 'image/*',
        required: false,
        multiple: true,
        maxFiles: 5,
        maxSize: 10,
        minSize: 0.01,
        maxTotalSize: 25,
        allowedFormats: ['jpeg', 'jpg', 'png', 'webp'],
        maxWidth: 4096,
        maxHeight: 4096,
        minWidth: 200,
        minHeight: 200,
      },
      {
        name: 'attachments',
        label: 'Additional Documents',
        type: 'file',
        accept: '.pdf,.doc,.docx,.txt',
        required: false,
        multiple: true,
        maxFiles: 3,
        maxSize: 20,
      },
    ],
  },
  {
    id: 'review',
    title: 'Review & Submit',
    fields: [],
  },
]