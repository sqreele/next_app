// src/components/machines/MachinesList.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  CogIcon
} from '@heroicons/react/24/outline'

export function MachinesList() {
  const {
    machines,
    loading,
    error,
    filters,
    stats,
    setFilters,
    clearFilters,
    fetchMachines,
    fetchMachinesByProperty,
    updateMachineStatus,
    removeMachine,
    getFilteredMachines,
  } = useMachineStore()

  const { rooms, fetchRooms } = useRoomStore()
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null)

  // Fetch initial data
  useEffect(() => {
    fetchMachines()
    if (rooms.length === 0) {
      fetchRooms()
    }
  }, [fetchMachines, fetchRooms, rooms.length])

  const filteredMachines = getFilteredMachines()

  const handleSearch = (search: string) => {
    setFilters({ search })
  }

  const handleStatusFilter = (status: string) => {
    setFilters({ status: status as any || undefined })
  }

  const handleRoomFilter = (room_id: string) => {
    setFilters({ room_id: parseInt(room_id) || undefined })
  }

  const handlePropertyFilter = async (property_id: string) => {
    const propId = parseInt(property_id)
    setSelectedProperty(propId || null)
    
    if (propId) {
      await fetchMachinesByProperty(propId)
    } else {
      await fetchMachines()
    }
  }

  const handleStatusToggle = async (id: number, currentStatus: string) => {
    const statusCycle = {
      'Operational': 'Maintenance',
      'Maintenance': 'Offline', 
      'Offline': 'Operational',
      'Decommissioned': 'Operational'
    }
    
    const newStatus = statusCycle[currentStatus as keyof typeof statusCycle] as any
    
    try {
      await updateMachineStatus(id, newStatus)
      toast.success('Machine status updated successfully')
    } catch (error) {
      console.error('Error updating machine status:', error)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete machine "${name}"?`)) {
      try {
        await removeMachine(id)
        toast.success('Machine deleted successfully')
      } catch (error) {
        console.error('Error deleting machine:', error)
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

  if (loading) {
