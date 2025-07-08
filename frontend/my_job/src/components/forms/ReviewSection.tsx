// src/components/forms/ReviewSection.tsx - Updated to show upload status
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ClipboardDocumentListIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface ReviewSectionProps {
  formData: any
  activeRooms: any[]
  availableTechnicians: any[]
  getUploadedImageUrls: (fieldName: string) => string[]
  uploadStatus: {
    total: number
    uploaded: number
    uploading: number
    failed: number
    pending: number
  }
}

export function ReviewSection({ 
  formData, 
  activeRooms, 
  availableTechnicians,
  getUploadedImageUrls,
  uploadStatus
}: ReviewSectionProps) {
  const selectedRoom = activeRooms.find(room => room.number === formData.location)
  const selectedTechnician = availableTechnicians.find(tech => tech.username === formData.assignedTo)
  const beforeImageUrls = getUploadedImageUrls('beforePhotos')
  const afterImageUrls = getUploadedImageUrls('afterPhotos')

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

      {/* Upload Status Warning */}
      {uploadStatus.total > 0 && (uploadStatus.uploading > 0 || uploadStatus.failed > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Image Upload Status</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {uploadStatus.uploading > 0 && `${uploadStatus.uploading} images are still uploading. `}
                  {uploadStatus.failed > 0 && `${uploadStatus.failed} images failed to upload. `}
                  Please wait for uploads to complete or fix failed uploads before submitting.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Images & Documentation */}
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
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">
                {beforeImageUrls.length} uploaded
              </Badge>
              {beforeImageUrls.length > 0 && (
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">After Photos:</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">
                {afterImageUrls.length} uploaded
              </Badge>
              {afterImageUrls.length > 0 && (
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
              )}
            </div>
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

      {/* Summary Status */}
      <div className={`border rounded-lg p-4 ${
        uploadStatus.uploading > 0 || uploadStatus.failed > 0 
          ? 'bg-yellow-50 border-yellow-200' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {uploadStatus.uploading > 0 || uploadStatus.failed > 0 ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
            ) : (
              <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            )}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              uploadStatus.uploading > 0 || uploadStatus.failed > 0 
                ? 'text-yellow-800' 
                : 'text-blue-800'
            }`}>
              {uploadStatus.uploading > 0 || uploadStatus.failed > 0 
                ? 'Please Complete Uploads' 
                : 'Ready to Submit'
              }
            </h3>
            <p className={`text-sm mt-1 ${
              uploadStatus.uploading > 0 || uploadStatus.failed > 0 
                ? 'text-yellow-700' 
                : 'text-blue-700'
            }`}>
              {uploadStatus.uploading > 0 || uploadStatus.failed > 0 
                ? 'Some images are still uploading or failed. Please wait for completion or fix errors before submitting.'
                : 'All information has been reviewed and images are uploaded. You can now submit the work order.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
