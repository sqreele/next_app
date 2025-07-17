// frontend/my_job/src/app/machines/[id]/page.tsx
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMachineStore, Machine } from '@/stores/machines-store'
import { useRoomStore, Room } from '@/stores/rooms-store'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { CogIcon } from '@heroicons/react/24/outline'
import { MachineDetail } from '@/components/machines/MachineDetail'

export default function MachineDetailPage() {
  const params = useParams()
  const router = useRouter()

  // Safe parsing of machineId from URL
  const machineId = React.useMemo(() => {
    if (!params?.id) return null
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const parsed = parseInt(id, 10)
    return isNaN(parsed) ? null : parsed
  }, [params?.id])

  // State and actions from Zustand stores
  const {
    selectedMachine,
    loading,
    error,
    fetchMachine,
    updateMachineStatus,
    removeMachine,
  } = useMachineStore()
  const { rooms, fetchRooms } = useRoomStore()
  const [isUpdating, setIsUpdating] = useState(false)

  // Effect to fetch machine data based on machineId
  useEffect(() => {
    if (machineId !== null) {
      fetchMachine(machineId)
    }
  }, [machineId, fetchMachine])

  // Effect to fetch rooms data if not already present
  useEffect(() => {
    if (rooms.length === 0) {
      fetchRooms()
    }
  }, [rooms.length, fetchRooms])

  // Callback to handle toggling machine status
  const handleStatusToggle = useCallback(async () => {
    if (!selectedMachine || !machineId) return

    setIsUpdating(true)
    try {
      const statusCycle: Record<Machine['status'], Machine['status']> = {
        Operational: 'Maintenance',
        Maintenance: 'Offline',
        Offline: 'Operational',
        Decommissioned: 'Operational',
      }

      const newStatus = statusCycle[selectedMachine.status]
      if (!newStatus) {
        throw new Error(`Invalid status transition from: ${selectedMachine.status}`)
      }

      await updateMachineStatus(machineId, newStatus)
      toast.success('Machine status updated successfully')
    } catch (err) {
      console.error('Error updating machine status:', err)
      toast.error('Failed to update machine status')
    } finally {
      setIsUpdating(false)
    }
  }, [selectedMachine, machineId, updateMachineStatus])

  // Callback to handle deleting a machine
  const handleDelete = useCallback(async () => {
    if (!selectedMachine || !machineId) return

    if (
      window.confirm(
        `Are you sure you want to delete machine "${selectedMachine.name}"?`
      )
    ) {
      try {
        await removeMachine(machineId)
        toast.success('Machine deleted successfully')
        router.push('/machines')
      } catch (err) {
        console.error('Error deleting machine:', err)
        toast.error('Failed to delete machine')
      }
    }
  }, [selectedMachine, machineId, removeMachine, router])

  // Render loading state
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

  // Render error state
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

  // Render "not found" or invalid ID state
  if (!selectedMachine) {
    return (
      <ProtectedRoute>
        <div className="text-center py-8">
          <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {machineId === null ? `Invalid machine ID: ${params?.id}` : 'Machine not found'}
          </p>
          {machineId !== null && (
             <p className="text-sm text-gray-400 mt-2">
                Machine with ID {machineId} does not exist
             </p>
          )}
          <Link href="/machines">
            <Button variant="secondary" className="mt-4">
              Back to Machines
            </Button>
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  // Render the MachineDetail component with all required data and handlers
  return (
    <ProtectedRoute>
      <MachineDetail
        machine={selectedMachine}
        rooms={rooms}
        isUpdating={isUpdating}
        onStatusToggle={handleStatusToggle}
        onDelete={handleDelete}
      />
    </ProtectedRoute>
  )
}
