import {
  ClipboardDocumentListIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  PhotoIcon,
  DocumentIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
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
  label?: string
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'enhanced-checkbox' | 'date' | 'datetime-local' | 'image-upload' | 'file' | 'autocomplete' | 'number' | 'tel' | 'url'
  required?: boolean
  placeholder?: string
  description?: string
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
    description: 'Work order details and type',
    icon: ClipboardDocumentListIcon,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    description: 'Priority and status settings',
    icon: WrenchScrewdriverIcon,
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    description: 'Due date settings',
    icon: CalendarIcon,
  },
  {
    id: 'assignment',
    label: 'Assignment',
    description: 'Location, machine, and technician',
    icon: UsersIcon,
  },
  {
    id: 'images',
    label: 'Documentation',
    description: 'Upload photos and documents',
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
        name: 'task',
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
      {
        name: 'type',
        label: 'Work Order Type',
        type: 'select',
        required: true,
        options: [
          { value: 'pm', label: 'Preventive Maintenance' },
          { value: 'cm', label: 'Corrective Maintenance' },
          { value: 'inspection', label: 'Inspection' },
          { value: 'repair', label: 'Repair' },
          { value: 'emergency', label: 'Emergency' },
          { value: 'upgrade', label: 'Upgrade' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        name: 'topic_id',
        label: 'Topic Category (Optional)',
        type: 'select',
        required: false,
        // Options will be populated dynamically from topics API
      },
    ],
  },
  {
    id: 'maintenance',
    title: 'Maintenance Details',
    fields: [
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        required: true,
        options: [
          { value: 'Low', label: 'Low Priority' },
          { value: 'Medium', label: 'Medium Priority' },
          { value: 'High', label: 'High Priority' },
          { value: 'Urgent', label: 'Urgent' },
        ],
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'Pending', label: 'Pending' },
          { value: 'In Progress', label: 'In Progress' },
          { value: 'Completed', label: 'Completed' },
          { value: 'Cancelled', label: 'Cancelled' },
        ],
      },
    ],
  },
  {
    id: 'scheduling',
    title: 'Scheduling',
    fields: [
      {
        name: 'due_date',
        label: 'Due Date',
        type: 'datetime-local',
        required: true,
        validation: {
          custom: (value: string) => {
            const selectedDate = new Date(value)
            const now = new Date()
            return selectedDate > now || 'Due date must be in the future'
          },
        },
      },
    ],
  },
  {
    id: 'assignment',
    title: 'Assignment & Location',
    fields: [
      {
        name: 'room_id',
        label: 'Room/Location',
        type: 'select',
        required: true,
      },
      {
        name: 'machine_id',
        label: 'Machine (Optional)',
        type: 'select',
        required: false,
      },
      {
        name: 'assigned_to_id',
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
        name: 'pdf_file_path',
        label: 'PDF Documents',
        type: 'file',
        accept: '.pdf',
        required: false,
        multiple: false,
        maxFiles: 1,
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
