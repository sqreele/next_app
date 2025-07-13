'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Calendar, User, Building, MapPin, Clock, FileText, PlayCircle, CheckCircle, XCircle, Eye } from 'lucide-react'
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
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'Medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Urgent': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <span className="text-white font-bold text-lg">PM</span>
            </div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-2xl animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading work order...</h2>
          <p className="text-gray-600">Please wait while we fetch the details</p>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <XCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Work Order Not Found</h1>
          <p className="text-gray-600 mb-6">The work order you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/work-orders')} className="bg-green-600 hover:bg-green-700">
            Back to Work Orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 py-8 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/work-orders')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Work Order #{workOrder.id}
                </h1>
                <p className="text-gray-600">{workOrder.task}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge className={`${getStatusColor(workOrder.status)} border`}>
              {workOrder.status}
            </Badge>
            <Badge className={`${getPriorityColor(workOrder.priority)} border`}>
              {workOrder.priority}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Details */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <FileText className="w-5 h-5 text-green-600" />
                  Task Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {workOrder.description || 'No description provided'}
                  </p>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Created</p>
                    <p className="text-sm text-gray-900 font-medium">{formatDate(workOrder.created_at)}</p>
                  </div>
                  {workOrder.due_date && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Due Date</p>
                      <p className="text-sm text-gray-900 font-medium">{formatDate(workOrder.due_date)}</p>
                    </div>
                  )}
                  {workOrder.completed_at && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Completed</p>
                      <p className="text-sm text-gray-900 font-medium">{formatDate(workOrder.completed_at)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {workOrder.property && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building className="h-5 w-5 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{workOrder.property.name}</span>
                      <p className="text-xs text-gray-500">Property</p>
                    </div>
                  </div>
                )}
                {workOrder.room && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">{workOrder.room.name}</span>
                      <p className="text-xs text-gray-500">Room</p>
                    </div>
                    {workOrder.room.room_type && (
                      <Badge variant="secondary" className="text-xs">
                        {workOrder.room.room_type}
                      </Badge>
                    )}
                  </div>
                )}
                {workOrder.machine && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{workOrder.machine.name}</span>
                      <p className="text-xs text-gray-500">Machine</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Images */}
            {(workOrder.before_images?.length || workOrder.after_images?.length) && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Eye className="w-5 h-5 text-purple-600" />
                    Photo Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {workOrder.before_images?.length && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                          Before Photos
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {workOrder.before_images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={`/uploads/${image}`}
                                alt={`Before ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-green-300 transition-colors"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {workOrder.after_images?.length && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          After Photos
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {workOrder.after_images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={`/uploads/${image}`}
                                alt={`After ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-green-300 transition-colors"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
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
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workOrder.status !== 'In Progress' && (
                  <Button
                    onClick={() => updateWorkOrderStatus('In Progress')}
                    disabled={updating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start Work
                  </Button>
                )}
                
                {workOrder.status === 'In Progress' && (
                  <Button
                    onClick={() => updateWorkOrderStatus('Completed')}
                    disabled={updating}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                
                {workOrder.status === 'Pending' && (
                  <Button
                    variant="secondary"
                    onClick={() => updateWorkOrderStatus('Cancelled')}
                    disabled={updating}
                    className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Work Order
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <User className="w-5 h-5 text-blue-600" />
                  Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workOrder.assigned_to ? (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <User className="h-5 w-5 text-blue-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{workOrder.assigned_to.username}</span>
                      <p className="text-xs text-gray-500">Assigned Technician</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No one assigned</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PDF Document */}
            {workOrder.pdf_file_path && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`/uploads/${workOrder.pdf_file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">View PDF</span>
                      <p className="text-xs text-gray-500">Work order document</p>
                    </div>
                  </a>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
