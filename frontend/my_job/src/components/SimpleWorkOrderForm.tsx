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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Create New Work Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter work order title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the work to be done"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
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
            </div>

            {/* Location Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location</h3>
              
              <div>
                <Label htmlFor="property">Property *</Label>
                <Select
                  value={formData.property_id.toString()}
                  onValueChange={handlePropertyChange}
                >
                  <SelectTrigger>
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
                <div>
                  <Label htmlFor="room">Room</Label>
                  <Select
                    value={formData.room_id.toString()}
                    onValueChange={handleRoomChange}
                  >
                    <SelectTrigger>
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
                <div>
                  <Label htmlFor="machine">Machine</Label>
                  <Select
                    value={formData.machine_id.toString()}
                    onValueChange={(value: string) => setFormData(prev => ({ ...prev, machine_id: parseInt(value) }))}
                  >
                    <SelectTrigger>
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
            </div>

            {/* Assignment */}
            <div>
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select
                value={formData.assigned_to.toString()}
                                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, assigned_to: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.username} ({user.profile?.role || 'User'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Images</h3>
              
              <div>
                <Label>Before Photos</Label>
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

              <div>
                <Label>After Photos</Label>
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

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Creating...' : 'Create Work Order'}
              </Button>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 