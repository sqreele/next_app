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
  WrenchScrewdriverIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline'

interface ReviewSectionProps {
  formData: any
  activeRooms: any[]
  availableTechnicians: any[]
  operationalMachines: any[]
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
  operationalMachines,
  getUploadedImageUrls,
  uploadStatus,
}: ReviewSectionProps) {
  const selectedRoom = activeRooms.find((room) => room.id === Number(formData.room_id))
  const selectedTechnician = availableTechnicians.find((tech) => tech.id === Number(formData.assigned_to_id))
  const selectedMachine = operationalMachines.find((machine) => machine.id === Number(formData.machine_id))
  const beforeImageUrls = getUploadedImageUrls('beforePhotos')
  const afterImageUrls = getUploadedImageUrls('afterPhotos')

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low':
        return 'bg-gray-100 text-gray-800'
      case 'Medium':
        return 'bg-blue-100 text-blue-800'
      case 'High':
        return 'bg-orange-100 text-orange-800'
      case 'Urgent':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'In Progress':
        return 'bg-blue-100 text-blue-800'
      case 'Completed':
        return 'bg-green-100 text-green-800'
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pm':
        return 'bg-green-100 text-green-800'
      case 'cm':
        return 'bg-orange-100 text-orange-800'
      case 'inspection':
        return 'bg-blue-100 text-blue-800'
      case 'repair':
        return 'bg-red-100 text-red-800'
      case 'emergency':
        return 'bg-red-200 text-red-900'
      case 'upgrade':
        return 'bg-purple-100 text-purple-800'
      case 'other':
        return 'bg-gray-100 text-gray-800'
      case 'issue':
        return 'bg-red-100 text-red-800'
      case 'workorder':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pm':
        return 'Preventive Maintenance'
      case 'cm':
        return 'Corrective Maintenance'
      case 'inspection':
        return 'Inspection'
      case 'repair':
        return 'Repair'
      case 'emergency':
        return 'Emergency'
      case 'upgrade':
        return 'Upgrade'
      case 'other':
        return 'Other'
      case 'issue':
        return 'Issue'
      case 'workorder':
        return 'Work Order'
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Review Your Work Order</h2>
        <p className="text-gray-600 mt-2">Please review all information before submitting</p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardDocumentListIcon className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-600">Task:</span>
            <p className="text-gray-900">{formData.task || 'Not specified'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Description:</span>
            <p className="text-gray-900">{formData.description || 'Not specified'}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Type:</span>
            <Badge className={getTypeColor(formData.type)}>{getTypeLabel(formData.type) || 'Not specified'}</Badge>
          </div>
          {formData.topic_id && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Topic:</span>
              <span className="text-gray-900">Topic #{formData.topic_id}</span>
            </div>
          )}
          {formData.has_pm && formData.frequency && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Frequency:</span>
              <span className="text-gray-900">{formData.frequency.charAt(0).toUpperCase() + formData.frequency.slice(1)}</span>
            </div>
          )}
        </CardContent>
      </Card>

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
              {formData.due_date ? new Date(formData.due_date).toLocaleDateString() : 'Not specified'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Priority:</span>
            <Badge className={getPriorityColor(formData.priority)}>{formData.priority || 'Not specified'}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <Badge className={getStatusColor(formData.status)}>{formData.status || 'Not specified'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UsersIcon className="h-5 w-5" />
            Assignment & Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Room:</span>
            <span className="text-gray-900">{selectedRoom ? `${selectedRoom.name} (${selectedRoom.number})` : 'Not specified'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Machine:</span>
            <span className="text-gray-900">{selectedMachine ? selectedMachine.name : 'No machine selected'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Assigned To:</span>
            <span className="text-gray-900">{selectedTechnician ? selectedTechnician.username : 'Not specified'}</span>
          </div>
        </CardContent>
      </Card>

      {selectedMachine && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <WrenchScrewdriverIcon className="h-5 w-5" />
              Machine Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Machine Name:</span>
              <span className="text-gray-900">{selectedMachine.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Has Preventive Maintenance:</span>
              <Badge className={selectedMachine.has_pm ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {selectedMachine.has_pm ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Has Issue/Problem:</span>
              <Badge className={selectedMachine.has_issue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                {selectedMachine.has_issue ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

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
              <Badge className="bg-blue-100 text-blue-800">{beforeImageUrls.length} uploaded</Badge>
              {beforeImageUrls.length > 0 && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">After Photos:</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">{afterImageUrls.length} uploaded</Badge>
              {afterImageUrls.length > 0 && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
            </div>
          </div>
          {formData.pdf_file_path && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">PDF Document:</span>
              <div className="flex items-center gap-2">
                <DocumentIcon className="h-4 w-4 text-blue-500" />
                <Badge className="bg-purple-100 text-purple-800">PDF attached</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div
        className={`border rounded-lg p-4 ${
          uploadStatus.uploading > 0 || uploadStatus.failed > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
        }`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {uploadStatus.uploading > 0 || uploadStatus.failed > 0 ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
            ) : (
              <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            )}
          </div>
          <div className="ml-3">
            <h3
              className={`text-sm font-medium ${
                uploadStatus.uploading > 0 || uploadStatus.failed > 0 ? 'text-yellow-800' : 'text-blue-800'
              }`}
            >
              {uploadStatus.uploading > 0 || uploadStatus.failed > 0 ? 'Please Complete Uploads' : 'Ready to Submit'}
            </h3>
            <p
              className={`text-sm mt-1 ${uploadStatus.uploading > 0 || uploadStatus.failed > 0 ? 'text-yellow-700' : 'text-blue-700'}`}
            >
              {uploadStatus.uploading > 0 || uploadStatus.failed > 0
                ? 'Some images are still uploading or failed. Please wait for completion or fix errors before submitting.'
                : 'All information has been reviewed and images are uploaded. You can now submit the work order.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}