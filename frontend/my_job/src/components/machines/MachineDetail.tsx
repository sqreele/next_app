// frontend/my_job/src/components/machines/MachineDetail.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { Machine } from '@/stores/machines-store'
import { Room } from '@/stores/rooms-store'

interface MachineDetailProps {
  machine: Machine
  rooms: Room[]
  isUpdating: boolean
  onStatusToggle: () => void
  onDelete: () => void
}

export function MachineDetail({
  machine,
  rooms,
  isUpdating,
  onStatusToggle,
  onDelete,
}: MachineDetailProps) {
  const getRoomName = (roomId: number) => {
    const room = rooms.find((r) => r.id === roomId)
    return room ? `${room.name} (${room.number})` : `Room ${roomId}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Operational':
        return CheckCircleIcon
      case 'Maintenance':
        return WrenchScrewdriverIcon
      case 'Offline':
        return XMarkIcon
      case 'Decommissioned':
        return ExclamationTriangleIcon
      default:
        return CogIcon
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Operational':
        return 'bg-green-100 text-green-800'
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'Offline':
        return 'bg-red-100 text-red-800'
      case 'Decommissioned':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const StatusIcon = getStatusIcon(machine.status)

  return (
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
            <h1 className="text-2xl font-bold text-gray-900">{machine.name}</h1>
            <p className="text-gray-600">Machine Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/pm/create?machine_id=${machine.id}`}>
            <Button variant="secondary">
              <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
              Create PM
            </Button>
          </Link>
          <Link href={`/issues/create?machine_id=${machine.id}`}>
            <Button variant="secondary">
              <ExclamationCircleIcon className="h-4 w-4 mr-2" />
              Create Issue
            </Button>
          </Link>
          <Link href={`/machines/${machine.id}/edit`}>
            <Button variant="secondary">
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="secondary"
            onClick={onDelete}
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
                <label className="text-sm font-medium text-gray-500">
                  Machine ID
                </label>
                <p className="text-lg font-semibold">{machine.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Name
                </label>
                <p className="text-lg font-semibold">{machine.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Room
                </label>
                <p className="text-lg">{getRoomName(machine.room_id)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Property
                </label>
                <p className="text-lg">Property {machine.property_id}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Status
              </label>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${getStatusColor(machine.status)}`}>
                  <StatusIcon className="h-4 w-4 mr-1" />
                  {machine.status}
                </Badge>
                <Button
                  onClick={onStatusToggle}
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
            <Link href={`/work-orders/create?machine_id=${machine.id}`}>
              <Button className="w-full justify-start">
                <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                Create Work Order
              </Button>
            </Link>
            <Link href={`/pm/create?machine_id=${machine.id}`}>
              <Button variant="secondary" className="w-full justify-start">
                <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                Schedule PM
              </Button>
            </Link>
            <Link href={`/issues/create?machine_id=${machine.id}`}>
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
              <label className="text-sm font-medium text-gray-500">
                Created
              </label>
              <p className="text-sm text-gray-900">
                {machine.created_at
                  ? new Date(machine.created_at).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Last Updated
              </label>
              <p className="text-sm text-gray-900">
                {machine.updated_at
                  ? new Date(machine.updated_at).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
