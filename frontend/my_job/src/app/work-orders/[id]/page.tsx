'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Calendar, User, Building, MapPin, Clock, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

interface WorkOrder {
  id: number
  task: string
  description?: string
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  due_date?: string
  created_at: string
  completed_at?: string
  property_id: number
  room_id?: number
  machine_id?: number
  assigned_to_id?: number
  before_images?: string[]
  after_images?: string[]
  pdf_file_path?: string
  property?: {
    id: number
    name: string
  }
  room?: {
    id: number
    name: string
    room_type?: string
  }
  machine?: {
    id: number
    name: string
  }
  assigned_to?: {
    id: number
    username: string
  }
}

export default function WorkOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const { token } = useAuthStore()

  const workOrderId = params.id as string

  useEffect(() => {
    if (workOrderId) {
      fetchWorkOrder()
    }
  }, [workOrderId])

  const fetchWorkOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/work_orders/${workOrderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Work order not found')
          router.push('/work-orders')
          return
        }
        throw new Error('Failed to fetch work order')
      }

      const data = await response.json()
      setWorkOrder(data)
    } catch (error) {
      console.error('Error fetching work order:', error)
      toast.error('Failed to load work order')
    } finally {
      setLoading(false)
    }
  }

  const updateWorkOrderStatus = async (newStatus: WorkOrder['status']) => {
    if (!workOrder) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/v1/work_orders/${workOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          completed_at: newStatus === 'Completed' ? new Date().toISOString() : null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update work order')
      }

      const updatedWorkOrder = await response.json()
      setWorkOrder(updatedWorkOrder)
      toast.success(`Work order status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating work order:', error)
      toast.error('Failed to update work order status')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      case 'In Progress': return 'bg-blue-100 text-blue-800'
      case 'Completed': return 'bg-green-100 text-green-800'
      case 'Cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-gray-100 text-gray-800'
      case 'Medium': return 'bg-blue-100 text-blue-800'
      case 'High': return 'bg-orange-100 text-orange-800'
      case 'Urgent': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading work order...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Work Order Not Found</h1>
          <p className="text-gray-600 mb-4">The work order you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/work-orders')}>
            Back to Work Orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/work-orders')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Work Order #{workOrder.id}
            </h1>
            <p className="text-gray-600">{workOrder.task}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(workOrder.status)}>
            {workOrder.status}
          </Badge>
          <Badge className={getPriorityColor(workOrder.priority)}>
            {workOrder.priority}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Task Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {workOrder.description || 'No description provided'}
                </p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="text-sm text-gray-900">{formatDate(workOrder.created_at)}</p>
                </div>
                {workOrder.due_date && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Due Date</p>
                    <p className="text-sm text-gray-900">{formatDate(workOrder.due_date)}</p>
                  </div>
                )}
                {workOrder.completed_at && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Completed</p>
                    <p className="text-sm text-gray-900">{formatDate(workOrder.completed_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Location</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workOrder.property && (
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-900">{workOrder.property.name}</span>
                </div>
              )}
              {workOrder.room && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-900">{workOrder.room.name}</span>
                  {workOrder.room.room_type && (
                    <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {workOrder.room.room_type}
                    </span>
                  )}
                </div>
              )}
              {workOrder.machine && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-900">{workOrder.machine.name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          {(workOrder.before_images?.length || workOrder.after_images?.length) && (
            <Card>
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workOrder.before_images?.length && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Before Photos</h4>
                      <div className="flex flex-wrap gap-2">
                        {workOrder.before_images.map((image, index) => (
                          <img
                            key={index}
                            src={`/uploads/${image}`}
                            alt={`Before ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {workOrder.after_images?.length && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">After Photos</h4>
                      <div className="flex flex-wrap gap-2">
                        {workOrder.after_images.map((image, index) => (
                          <img
                            key={index}
                            src={`/uploads/${image}`}
                            alt={`After ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workOrder.status !== 'In Progress' && (
                <Button
                  onClick={() => updateWorkOrderStatus('In Progress')}
                  disabled={updating}
                  className="w-full"
                >
                  Start Work
                </Button>
              )}
              
              {workOrder.status === 'In Progress' && (
                <Button
                  onClick={() => updateWorkOrderStatus('Completed')}
                  disabled={updating}
                  className="w-full"
                >
                  Mark Complete
                </Button>
              )}
              
              {workOrder.status === 'Pending' && (
                <Button
                  variant="secondary"
                  onClick={() => updateWorkOrderStatus('Cancelled')}
                  disabled={updating}
                  className="w-full"
                >
                  Cancel Work Order
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Assignment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workOrder.assigned_to ? (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-900">{workOrder.assigned_to.username}</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No one assigned</p>
              )}
            </CardContent>
          </Card>

          {/* PDF Document */}
          {workOrder.pdf_file_path && (
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={`/uploads/${workOrder.pdf_file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">View PDF</span>
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
