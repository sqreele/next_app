'use client'
//components/[id]/page//
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
// ... other imports

export default function MachineDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  
  // Safely parse the machine ID
  const machineId = React.useMemo(() => {
    const id = params?.id
    if (!id) return null
    const parsed = parseInt(Array.isArray(id) ? id[0] : id, 10)
    return isNaN(parsed) ? null : parsed
  }, [params?.id])

  const {
    selectedMachine,
    loading,
    error,
    fetchMachine,
    updateMachineStatus,
    removeMachine,
  } = useMachineStore()

  const { rooms, fetchRooms } = useRoomStore()

  // Initialize data fetching
  useEffect(() => {
    setIsReady(true)
  }, [])

  useEffect(() => {
    if (!isReady || !machineId) return

    console.log('Fetching machine with ID:', machineId)
    
    const loadData = async () => {
      try {
        await Promise.all([
          fetchMachine(machineId),
          rooms.length === 0 ? fetchRooms() : Promise.resolve(),
        ])
      } catch (error) {
        console.error('Error loading machine data:', error)
      }
    }

    loadData()
  }, [isReady, machineId, fetchMachine, fetchRooms, rooms.length])

  // Early return for invalid ID
  if (isReady && !machineId) {
    return (
      <div className="text-center py-8">
        <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Invalid machine ID</p>
        <Link href="/machines">
          <Button variant="secondary" className="mt-4">
            Back to Machines
          </Button>
        </Link>
      </div>
    )
  }

  // Loading state
  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2">Loading machine...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => fetchMachine(machineId!)} variant="secondary">
            Retry
          </Button>
          <Link href="/machines">
            <Button variant="secondary">Back to Machines</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Machine not found state
  if (!selectedMachine) {
    return (
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
    )
  }

  // Rest of your component logic...
}
