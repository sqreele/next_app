// src/components/work-orders/WorkOrdersList.tsx
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useWorkOrderStore } from '@/stores/work-orders-store'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { useTechnicianStore } from '@/stores/technicians-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow, format } from 'date-fns'

export function WorkOrdersList() {
  const {
    workOrders,
    loading,
    error,
    filters,
    stats,
    setFilters,
    clearFilters,
    fetchWorkOrders,
    removeWorkOrder,
    updateWorkOrderStatus,
    getFilteredWorkOrders,
  } = useWorkOrderStore()

  const { machines, fetchMachines } = useMachineStore()
  const { rooms, fetchRooms } = useRoomStore()
  const { technicians, fetchTechnicians } = useTechnicianStore()

  // Fetch initial data
  useEffect(() => {
    fetchWorkOrders()
    fetchMachines()
    fetchRooms()
    fetchTechnicians()
  }, [])

  const filteredWorkOrders = getFilteredWorkOrders()

  const handleSearch = (search: string) => {
    setFilters({ search })
  }

  const handleStatusFilter = (status: string) => {
    setFilters({ status: status as any || undefined })
  }

  const handlePriorityFilter = (priority: string) => {
    setFilters({ priority: priority as any || undefined })
  }

  const handleStatusToggle = async (id: number, currentStatus: string) => {
    const statusCycle = {
      'Pending': 'In Progress',
      'In Progress': 'Completed',
      'Completed': 'Pending',
      'Cancelled': 'Pending'
    }
    
    const newStatus = statusCycle[currentStatus as keyof typeof statusCycle] as any
    
    try {
      await updateWorkOrderStatus(id, newStatus)
      toast.success('Work order status updated successfully')
    } catch (error) {
      console.error('Error updating work order status:', error)
    }
  }

  const handleDelete = async (id: number, task: string) => {
    if (window.confirm(`Are you sure you want to delete work order "${task}"?`)) {
      try {
        await removeWorkOrder(id)
        toast.success('Work order deleted successfully')
      } catch (error) {
        console.error('Error deleting work order:', error)
      }
    }
  }

  const getMachineName = (machine_id: number) => {
    const machine = (machines ?? []).find(m => m.id === machine_id)
    return machine ? machine.name : `Machine ${machine_id}`
  }

  const getRoomName = (room_id: number) => {
    const room = (rooms ?? []).find(r => r.id === room_id)
    return room ? `${room.name} (${room.number})` : `Room ${room_id}`
  }

  const getTechnicianName = (assigned_to_id: number) => {
    const technician = (technicians ?? []).find(t => t.id === assigned_to_id)
    return technician ? technician.username : `User ${assigned_to_id}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return ClockIcon
      case 'In Progress': return ExclamationTriangleIcon
      case 'Completed': return CheckCircleIcon
      case 'Cancelled': return XMarkIcon
      default: return ClipboardDocumentListIcon
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2">Loading work orders...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <Button 
          onClick={() => fetchWorkOrders()} 
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
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-600">Manage maintenance and repair requests</p>
        </div>
        <Link href="/work-orders/create">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Work Order
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
              <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search work orders..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={filters.status || ''}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={filters.priority || ''}
              onChange={(e) => handlePriorityFilter(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="">All Priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={clearFilters} variant="secondary" size="sm">
              Clear Filters
            </Button>
            <Button onClick={() => fetchWorkOrders()} variant="secondary" size="sm">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Work Orders ({filteredWorkOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorkOrders.map((workOrder) => {
                  const StatusIcon = getStatusIcon(workOrder.status)
                  const isOverdue = new Date(workOrder.due_date) < new Date() && 
                                   workOrder.status !== 'Completed' && 
                                   workOrder.status !== 'Cancelled'
                  
                  return (
                    <tr key={workOrder.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 rounded-lg mr-3">
                            <ClipboardDocumentListIcon className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {workOrder.task}
                            </div>
                            <div className="text-sm text-gray-500">
                              {workOrder.description}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Machine: {getMachineName(workOrder.machine_id)} | 
                              Room: {getRoomName(workOrder.room_id)}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getPriorityColor(workOrder.priority)}>
                          {workOrder.priority}
                        </Badge>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleStatusToggle(workOrder.id, workOrder.status)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors hover:opacity-80 ${getStatusColor(workOrder.status)}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {workOrder.status}
                        </button>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback>
                              {getTechnicianName(workOrder.assigned_to_id).substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-900">
                            {getTechnicianName(workOrder.assigned_to_id)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {format(new Date(workOrder.due_date), 'MMM d, yyyy')}
                          <div className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(workOrder.due_date), { addSuffix: true })}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Link href={`/work-orders/${workOrder.id}`}>
                            <Button variant="secondary" size="sm">
                              View
                            </Button>
                          </Link>
                          <Link href={`/work-orders/${workOrder.id}/edit`}>
                            <Button variant="secondary" size="sm">
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleDelete(workOrder.id, workOrder.task)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredWorkOrders.length === 0 && (
              <div className="text-center py-8">
                <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No work orders found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {filters.search || filters.status || filters.priority
                    ? 'Try adjusting your filters' 
                    : 'Get started by creating your first work order'
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
