// src/components/forms/ReviewSection.tsx - New component for review step
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ClipboardDocumentListIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'

interface ReviewSectionProps {
  formData: any
  activeRooms: any[]
  availableTechnicians: any[]
  getImageFiles: (fieldName: string) => File[]
}

export function ReviewSection({ 
  formData, 
  activeRooms, 
  availableTechnicians,
  getImageFiles 
}: ReviewSectionProps) {
  const selectedRoom = activeRooms.find(room => room.number === formData.location)
  const selectedTechnician = availableTechnicians.find(tech => tech.username === formData.assignedTo)
  const beforeFiles = getImageFiles('beforePhotos')
  const afterFiles = getImageFiles('afterPhotos')

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800'
      case 'medium': return 'bg-blue-100 text-blue-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'urgent': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in-progress': return 'bg-green-100 text-green-800'
      case 'on-hold': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Review Your Work Order</h2>
        <p className="text-gray-600 mt-2">Please review all information before submitting</p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardDocumentListIcon className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-600">Title:</span>
            <p className="text-gray-900">{formData.title || 'Not specified'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Description:</span>
            <p className="text-gray-900">{formData.description || 'Not specified'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling & Priority */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5" />
            Scheduling & Priority
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Due Date:</span>
            <span className="text-gray-900">
              {formData.scheduledDate ? new Date(formData.scheduledDate).toLocaleDateString() : 'Not specified'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Priority:</span>
            <Badge className={getPriorityColor(formData.priority)}>
              {formData.priority || 'Not specified'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <Badge className={getStatusColor(formData.status)}>
              {formData.status || 'Not specified'}
            </Badge>
          </div>
          {formData.recurring && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Recurring:</span>
              <span className="text-gray-900">{formData.recurringFrequency || 'Yes'}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment & Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UsersIcon className="h-5 w-5" />
            Assignment & Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Location:</span>
            <span className="text-gray-900">
              {selectedRoom ? `${selectedRoom.name} (${selectedRoom.number})` : formData.location || 'Not specified'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Assigned To:</span>
            <span className="text-gray-900">
              {selectedTechnician ? selectedTechnician.username : formData.assignedTo || 'Not specified'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Images & Files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PhotoIcon className="h-5 w-5" />
            Images & Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Before Photos:</span>
            <Badge className="bg-blue-100 text-blue-800">
              {beforeFiles.length} file(s)
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">After Photos:</span>
            <Badge className="bg-green-100 text-green-800">
              {afterFiles.length} file(s)
            </Badge>
          </div>
          {formData.attachments && formData.attachments.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Documents:</span>
              <Badge className="bg-purple-100 text-purple-800">
                {formData.attachments.length} file(s)
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Warning */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Ready to Submit</h3>
            <p className="text-sm text-blue-700 mt-1">
              Please review all information above. Once submitted, you can make changes by editing the work order.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
