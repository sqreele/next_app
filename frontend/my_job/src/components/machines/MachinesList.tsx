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
   return (
     <div className="flex items-center justify-center p-8">
       <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
       <span className="ml-2">Loading machines...</span>
     </div>
   )
 }

 if (error) {
   return (
     <div className="bg-red-50 border border-red-200 rounded-lg p-4">
       <p className="text-red-800">Error: {error}</p>
       <Button 
         onClick={() => fetchMachines()} 
         variant="secondary" 
         className="mt-2"
       >
         Retry
       </Button>
     </div>
   )
 }

 return (
   <div className="space-y-6">
     {/* Header */}
     <div className="flex items-center justify-between">
       <div>
         <h1 className="text-2xl font-bold text-gray-900">Machines</h1>
         <p className="text-gray-600">Manage your equipment and machinery</p>
       </div>
       <Link href="/machines/create">
         <Button>
           <PlusIcon className="h-4 w-4 mr-2" />
           Add Machine
         </Button>
       </Link>
     </div>

     {/* Statistics Cards */}
     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
       <Card>
         <CardContent className="p-4">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-gray-600">Total</p>
               <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
             </div>
             <CogIcon className="h-8 w-8 text-blue-600" />
           </div>
         </CardContent>
       </Card>

       <Card>
         <CardContent className="p-4">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-gray-600">Operational</p>
               <p className="text-2xl font-bold text-green-600">{stats.operational}</p>
             </div>
             <CheckCircleIcon className="h-8 w-8 text-green-600" />
           </div>
         </CardContent>
       </Card>

       <Card>
         <CardContent className="p-4">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-gray-600">Maintenance</p>
               <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
             </div>
             <WrenchScrewdriverIcon className="h-8 w-8 text-yellow-600" />
           </div>
         </CardContent>
       </Card>

       <Card>
         <CardContent className="p-4">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-gray-600">Offline</p>
               <p className="text-2xl font-bold text-red-600">{stats.offline}</p>
             </div>
             <XMarkIcon className="h-8 w-8 text-red-600" />
           </div>
         </CardContent>
       </Card>
     </div>

     {/* Search and Filters */}
     <Card>
       <CardHeader>
         <CardTitle>Filters</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <Input
             placeholder="Search machines..."
             value={filters.search || ''}
             onChange={(e) => handleSearch(e.target.value)}
           />
           
           <select
             value={filters.status || ''}
             onChange={(e) => handleStatusFilter(e.target.value)}
             className="border rounded-md px-3 py-2"
           >
             <option value="">All Status</option>
             <option value="Operational">Operational</option>
             <option value="Maintenance">Maintenance</option>
             <option value="Offline">Offline</option>
             <option value="Decommissioned">Decommissioned</option>
           </select>

           <select
             value={filters.room_id || ''}
             onChange={(e) => handleRoomFilter(e.target.value)}
             className="border rounded-md px-3 py-2"
           >
             <option value="">All Rooms</option>
             {rooms.map(room => (
               <option key={room.id} value={room.id}>
                 {room.name} ({room.number})
               </option>
             ))}
           </select>

           <select
             value={selectedProperty || ''}
             onChange={(e) => handlePropertyFilter(e.target.value)}
             className="border rounded-md px-3 py-2"
           >
             <option value="">All Properties</option>
             <option value="1">Property 1</option>
             <option value="2">Property 2</option>
           </select>
         </div>

         <div className="flex gap-2 mt-4">
           <Button onClick={clearFilters} variant="secondary" size="sm">
             Clear Filters
           </Button>
           <Button onClick={() => fetchMachines()} variant="secondary" size="sm">
             Refresh
           </Button>
         </div>
       </CardContent>
     </Card>

     {/* Machines Table */}
     <Card>
       <CardHeader>
         <CardTitle>
           Machines ({filteredMachines.length})
         </CardTitle>
       </CardHeader>
       <CardContent>
         <div className="overflow-x-auto">
           <table className="min-w-full">
             <thead className="bg-gray-50">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Machine
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Room
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Status
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Property
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Actions
                 </th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {filteredMachines.map((machine) => {
                 const StatusIcon = getStatusIcon(machine.status)
                 
                 return (
                   <tr key={machine.id} className="hover:bg-gray-50">
                     <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center">
                         <div className="p-2 bg-gray-100 rounded-lg mr-3">
                           <CogIcon className="h-5 w-5 text-gray-600" />
                         </div>
                         <div>
                           <div className="text-sm font-medium text-gray-900">
                             {machine.name}
                           </div>
                           <div className="text-sm text-gray-500">
                             ID: {machine.id}
                           </div>
                         </div>
                       </div>
                     </td>
                     
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {getRoomName(machine.room_id)}
                     </td>
                     
                     <td className="px-6 py-4 whitespace-nowrap">
                       <button
                         onClick={() => handleStatusToggle(machine.id, machine.status)}
                         className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors hover:opacity-80 ${getStatusColor(machine.status)}`}
                       >
                         <StatusIcon className="h-3 w-3" />
                         {machine.status}
                       </button>
                     </td>
                     
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       Property {machine.property_id}
                     </td>
                     
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                       <div className="flex gap-2">
                         <Link href={`/machines/${machine.id}`}>
                           <Button variant="secondary" size="sm">
                             View
                           </Button>
                         </Link>
                         <Link href={`/machines/${machine.id}/edit`}>
                           <Button variant="secondary" size="sm">
                             Edit
                           </Button>
                         </Link>
                         <Button 
                           variant="secondary" 
                           size="sm"
                           onClick={() => handleDelete(machine.id, machine.name)}
                           className="text-red-600 hover:text-red-900"
                         >
                           Delete
                         </Button>
                       </div>
                     </td>
                   </tr>
                 )
               })}
             </tbody>
           </table>

           {filteredMachines.length === 0 && (
             <div className="text-center py-8">
               <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
               <p className="text-gray-500">No machines found</p>
               <p className="text-sm text-gray-400 mt-1">
                 {filters.search || filters.status || filters.room_id 
                   ? 'Try adjusting your filters' 
                   : 'Get started by adding your first machine'
                 }
               </p>
             </div>
           )}
         </div>
       </CardContent>
     </Card>
   </div>
 )
}
