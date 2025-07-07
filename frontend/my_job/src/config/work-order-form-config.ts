// src/config/work-order-form-config.ts
import {
  ClipboardDocumentListIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  PhotoIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline'

export interface FormFieldOption {
  value: string
  label: string
}

export interface FormField {
  name: string
  label: string
  type: string
  required?: boolean
  placeholder?: string
  accept?: string
  conditional?: string
  options?: FormFieldOption[]
  multiple?: boolean
  maxFiles?: number
  maxSize?: number // in MB
}

export interface FormSection {
  id: string
  title: string
  fields: FormField[]
}

export interface ProgressStep {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}

export const progressSteps: ProgressStep[] = [
  {
    id: 'basic',
    label: 'Basic Info',
    description: 'Work order title and description',
    icon: ClipboardDocumentListIcon,
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    description: 'Due date and priority',
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
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the work to be done...',
      },
    ],
  },
  {
    id: 'scheduling',
    title: 'Scheduling & Priority',
    fields: [
      {
        name: 'scheduledDate',
        label: 'Scheduled Date',
        type: 'datetime-local',
        required: true,
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
        maxSize: 10, // 10MB
      },
      {
        name: 'afterPhotos',
        label: 'After Photos',
        type: 'image-upload',
        accept: 'image/*',
        required: false,
        multiple: true,
        maxFiles: 5,
        maxSize: 10, // 10MB
      },
      {
        name: 'attachments',
        label: 'Additional Documents',
        type: 'file',
        accept: '.pdf,.doc,.docx,.txt',
        required: false,
        multiple: true,
        maxFiles: 3,
        maxSize: 20, // 20MB
      },
    ],
  },
]