//machine[id]/page.tsx//

'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  WrenchScrewdriverIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

export default function MachineDetailPage() {
  const params = useParams()
  const router = useRouter()
  
  // ✅ Safe parsing with validation
  const machineId = React.useMemo(() => {
    if (!params?.id) return null
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const parsed = parseInt(id, 10)
    return isNaN(parsed) ? null : parsed
  }, [params?.id])
  
  const { 
    selectedMachine, 
    loading, 
    error, 
    fetchMachine, 
    updateMachineStatus,
    removeMachine 
  } = useMachineStore()
  
  const { rooms, fetchRooms } = useRoomStore()
  const [isUpdating, setIsUpdating] = useState(false)

  // ✅ Fixed useEffect with proper validation
  useEffect(() => {
    if (machineId !== null) { // ✅ Now checks for valid number
      console.log('Fetching machine with ID:', machineId) // Debug log
      fetchMachine(machineId)
    }
    if (rooms.length === 0) {
      fetchRooms()
    }
  }, [machineId, fetchMachine, fetchRooms, rooms.length])

  // ✅ Handle invalid machine ID
  if (machineId === null && params?.id) {
    return (
      <ProtectedRoute>
        <div className="text-center py-8">
          <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Invalid machine ID: {params.id}</p>
          <Link href="/machines">
            <Button variant="secondary" className="mt-4">
              Back to Machines
            </Button>
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  // ✅ Handle loading state for params
  if (!params?.id) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </ProtectedRoute>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2">Loading machine details...</span>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={() => machineId && fetchMachine(machineId)} 
              variant="secondary"
            >
              Retry
            </Button>
            <Link href="/machines">
              <Button variant="secondary">Back to Machines</Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!selectedMachine) {
    return (
      <ProtectedRoute>
        <div className="text-center py-8">
          <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Machine not found</p>
          <p className="text-sm text-gray-400 mt-2">
            Machine with ID {machineId} does not exist
          </p>
          <Link href="/machines">
            <Button variant="secondary" className="mt-4">
              Back to Machines
            </Button>
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  // Rest of your existing component code...
  const handleStatusToggle = async () => {
    if (!selectedMachine || !machineId) return
    
    setIsUpdating(true)
    try {
      const statusCycle = {
        'Operational': 'Maintenance',
        'Maintenance': 'Offline', 
        'Offline': 'Operational',
        'Decommissioned': 'Operational'
      }
      
      const newStatus = statusCycle[selectedMachine.status as keyof typeof statusCycle] as any
      await updateMachineStatus(machineId, newStatus)
      toast.success('Machine status updated successfully')
    } catch (error) {
      console.error('Error updating machine status:', error)
      toast.error('Failed to update machine status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedMachine || !machineId) return
    
    if (window.confirm(`Are you sure you want to delete machine "${selectedMachine.name}"?`)) {
      try {
        await removeMachine(machineId)
        toast.success('Machine deleted successfully')
        router.push('/machines')
      } catch (error) {
        console.error('Error deleting machine:', error)
        toast.error('Failed to delete machine')
      }
    }
  }

  const getRoomName = (room_id: number) => {
    const room = rooms.find(r => r.id === room_id)
    return room ? `${room.name} (${room.number})` : `Room ${room_id}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Operational': return CheckCircleIcon
      case 'Maintenance': return WrenchScrewdriverIcon
      case 'Offline': return XMarkIcon
      case 'Decommissioned': return ExclamationTriangleIcon
      default: return CogIcon
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Operational': return 'bg-green-100 text-green-800'
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'Offline': return 'bg-red-100 text-red-800'
      case 'Decommissioned': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const StatusIcon = getStatusIcon(selectedMachine.status)

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/machines">
              <Button variant="secondary" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedMachine.name}</h1>
              <p className="text-gray-600">Machine Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/pm/create?machine_id=${selectedMachine.id}`}>
              <Button variant="secondary">
                <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                Create PM
              </Button>
            </Link>
            <Link href={`/issues/create?machine_id=${selectedMachine.id}`}>
              <Button variant="secondary">
                <ExclamationCircleIcon className="h-4 w-4 mr-2" />
                Create Issue
              </Button>
            </Link>
            <Link href={`/machines/${selectedMachine.id}/edit`}>
              <Button variant="secondary">
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button 
              variant="secondary" 
              onClick={handleDelete}
              className="text-red-600 hover:text-red-900"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Machine Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Machine Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Machine ID</label>
                  <p className="text-lg font-semibold">{selectedMachine.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-lg font-semibold">{selectedMachine.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Room</label>
                  <p className="text-lg">{getRoomName(selectedMachine.room_id)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Property</label>
                  <p className="text-lg">Property {selectedMachine.property_id}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${getStatusColor(selectedMachine.status)}`}>
                    <StatusIcon className="h-4 w-4 mr-1" />
                    {selectedMachine.status}
                  </Badge>
                  <Button 
                    onClick={handleStatusToggle}
                    disabled={isUpdating}
                    variant="secondary"
                    size="sm"
                  >
                    {isUpdating ? 'Updating...' : 'Change Status'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/work-orders/create?machine_id=${selectedMachine.id}`}>
                <Button className="w-full justify-start">
                  <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                  Create Work Order
                </Button>
              </Link>
              <Link href={`/pm/create?machine_id=${selectedMachine.id}`}>
                <Button variant="secondary" className="w-full justify-start">
                  <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                  Schedule PM
                </Button>
              </Link>
              <Link href={`/issues/create?machine_id=${selectedMachine.id}`}>
                <Button variant="secondary" className="w-full justify-start">
                  <ExclamationCircleIcon className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">
                  {selectedMachine.created_at ? new Date(selectedMachine.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900">
                  {selectedMachine.updated_at ? new Date(selectedMachine.updated_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
