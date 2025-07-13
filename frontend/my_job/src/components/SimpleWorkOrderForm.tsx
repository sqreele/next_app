import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/image-upload'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { 
  ClipboardDocumentListIcon, 
  MapPinIcon, 
  UserGroupIcon, 
  CameraIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface ImageFile {
  file: File
  preview: string
  id: string
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error'
  uploadProgress?: number
  uploadedUrl?: string
  error?: string
  isLocal?: boolean
  localUrl?: string
}

interface WorkOrderFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  property_id: number
  room_id: number
  machine_id: number
  assigned_to: number
  beforePhotos: ImageFile[]
  afterPhotos: ImageFile[]
}

interface SimpleWorkOrderFormProps {
  onSubmit?: (data: WorkOrderFormData) => void
  onCancel?: () => void
}

export function SimpleWorkOrderForm({ onSubmit, onCancel }: SimpleWorkOrderFormProps) {
  const [formData, setFormData] = useState<WorkOrderFormData>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    property_id: 0,
    room_id: 0,
    machine_id: 0,
    assigned_to: 0,
    beforePhotos: [],
    afterPhotos: []
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  // Load data on component mount
  React.useEffect(() => {
    loadFormData()
  }, [])

  const loadFormData = async () => {
    try {
      const authState = useAuthStore.getState()
      const token = authState.token

      if (!token) {
        toast.error('Please log in to create work orders')
        return
      }

      // Load properties
      const propertiesResponse = await fetch('/api/v1/properties', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json()
        setProperties(propertiesData)
      }

      // Load users
      const usersResponse = await fetch('/api/v1/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Error loading form data:', error)
      toast.error('Failed to load form data')
    }
  }

  const loadRooms = async (propertyId: number) => {
    try {
      const authState = useAuthStore.getState()
      const token = authState.token

      const response = await fetch(`/api/v1/properties/${propertyId}/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const roomsData = await response.json()
        setRooms(roomsData)
      }
    } catch (error) {
      console.error('Error loading rooms:', error)
    }
  }

  const loadMachines = async (roomId: number) => {
    try {
      const authState = useAuthStore.getState()
      const token = authState.token

      const response = await fetch(`/api/v1/rooms/${roomId}/machines`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const machinesData = await response.json()
        setMachines(machinesData)
      }
    } catch (error) {
      console.error('Error loading machines:', error)
    }
  }

  const handlePropertyChange = (propertyId: string) => {
    const id = parseInt(propertyId)
    setFormData(prev => ({ ...prev, property_id: id, room_id: 0, machine_id: 0 }))
    setRooms([])
    setMachines([])
    if (id > 0) {
      loadRooms(id)
    }
  }

  const handleRoomChange = (roomId: string) => {
    const id = parseInt(roomId)
    setFormData(prev => ({ ...prev, room_id: id, machine_id: 0 }))
    setMachines([])
    if (id > 0) {
      loadMachines(id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const authState = useAuthStore.getState()
      const token = authState.token

      if (!token) {
        toast.error('Please log in to create work orders')
        return
      }

      // Validate required fields
      if (!formData.title.trim()) {
        toast.error('Title is required')
        return
      }

      if (!formData.description.trim()) {
        toast.error('Description is required')
        return
      }

      if (formData.property_id === 0) {
        toast.error('Please select a property')
        return
      }

      // Prepare the work order data
      const workOrderData = {
        ...formData,
        before_photos: formData.beforePhotos.filter(img => img.uploadStatus === 'success').map(img => img.uploadedUrl),
        after_photos: formData.afterPhotos.filter(img => img.uploadStatus === 'success').map(img => img.uploadedUrl)
      }

      console.log('Submitting work order:', workOrderData)

      const response = await fetch('/api/v1/work_orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(workOrderData)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Work order created successfully!')
        console.log('Work order created:', result)
        
        if (onSubmit) {
          onSubmit(formData)
        }
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          status: 'pending',
          property_id: 0,
          room_id: 0,
          machine_id: 0,
          assigned_to: 0,
          beforePhotos: [],
          afterPhotos: []
        })
      } else {
        const errorData = await response.json()
        toast.error(errorData.detail || 'Failed to create work order')
      }
    } catch (error) {
      console.error('Error creating work order:', error)
      toast.error('Failed to create work order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-gray-600 bg-gray-100'
      case 'medium': return 'text-blue-600 bg-blue-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'urgent': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Work Order</h1>
                <p className="text-gray-600">Fill in the details below to create a new work order</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Card */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <ClipboardDocumentListIcon className="w-5 h-5 text-green-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                    Work Order Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter work order title"
                    required
                    minLength={5}
                    maxLength={100}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to" className="text-sm font-medium text-gray-700">
                    Assign To
                  </Label>
                  <Select
                    value={formData.assigned_to.toString()}
                    onValueChange={(value: string) => setFormData(prev => ({ ...prev, assigned_to: parseInt(value) }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex items-center gap-2">
                            <UserGroupIcon className="w-4 h-4 text-gray-400" />
                            {user.username} ({user.profile?.role || 'User'})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the work to be done..."
                  rows={4}
                  required
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium text-gray-700">
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          Low Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Medium Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                          High Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="urgent">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                          Urgent
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Information Card */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <MapPinIcon className="w-5 h-5 text-blue-600" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="property" className="text-sm font-medium text-gray-700">
                  Property *
                </Label>
                <Select
                  value={formData.property_id.toString()}
                  onValueChange={handlePropertyChange}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.property_id > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="room" className="text-sm font-medium text-gray-700">
                    Room
                  </Label>
                  <Select
                    value={formData.room_id.toString()}
                    onValueChange={handleRoomChange}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id.toString()}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.room_id > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="machine" className="text-sm font-medium text-gray-700">
                    Machine
                  </Label>
                  <Select
                    value={formData.machine_id.toString()}
                    onValueChange={(value: string) => setFormData(prev => ({ ...prev, machine_id: parseInt(value) }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id.toString()}>
                          {machine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images Card */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <CameraIcon className="w-5 h-5 text-purple-600" />
                Photo Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Before Photos
                  </Label>
                  <ImageUpload
                    value={formData.beforePhotos}
                    onChange={(value: ImageFile[] | ((current: ImageFile[]) => ImageFile[])) => {
                      if (typeof value === 'function') {
                        setFormData(prev => ({ ...prev, beforePhotos: value(prev.beforePhotos) }))
                      } else {
                        setFormData(prev => ({ ...prev, beforePhotos: value }))
                      }
                    }}
                    label="Before Photos"
                    uploadType="before"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    After Photos
                  </Label>
                  <ImageUpload
                    value={formData.afterPhotos}
                    onChange={(value: ImageFile[] | ((current: ImageFile[]) => ImageFile[])) => {
                      if (typeof value === 'function') {
                        setFormData(prev => ({ ...prev, afterPhotos: value(prev.afterPhotos) }))
                      } else {
                        setFormData(prev => ({ ...prev, afterPhotos: value }))
                      }
                    }}
                    label="After Photos"
                    uploadType="after"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Work Order...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" />
                  Create Work Order
                </div>
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={isSubmitting}
                className="h-12"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
} 