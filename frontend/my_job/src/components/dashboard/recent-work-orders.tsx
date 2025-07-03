// src/components/dashboard/recent-work-orders.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  EyeIcon,
  ClockIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

interface WorkOrder {
  id: string
  number: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in-progress' | 'completed' | 'cancelled'
  assignedTo?: {
    name: string
    avatar?: string
  }
  location: string
  createdAt: Date
  dueDate?: Date
  image?: string // Optional image URL
}

const recentWorkOrders: WorkOrder[] = [
  {
    id: '1',
    number: 'WO-2024-001',
    title: 'HVAC System Maintenance',
    description: 'Regular maintenance check for HVAC unit in Building A',
    priority: 'medium',
    status: 'in-progress',
    assignedTo: { name: 'John Smith' },
    location: 'Building A - Floor 3',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    image: '/file.svg',
  },
  {
    id: '2',
    number: 'WO-2024-002',
    title: 'Electrical Panel Inspection',
    description: 'Monthly electrical panel inspection and testing',
    priority: 'high',
    status: 'open',
    location: 'Building B - Basement',
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    image: '/globe.svg',
  },
  {
    id: '3',
    number: 'WO-2024-003',
    title: 'Water Leak Repair',
    description: 'Fix water leak in restroom facilities',
    priority: 'urgent',
    status: 'completed',
    assignedTo: { name: 'Mike Johnson' },
    location: 'Building C - Floor 2',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    image: '/window.svg',
  },
  {
    id: '4',
    number: 'WO-2024-004',
    title: 'Lighting Replacement',
    description: 'Replace fluorescent lights in office area',
    priority: 'low',
    status: 'open',
    location: 'Building A - Floor 1',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    image: '/next.svg',
  },
]

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

const statusColors = {
  open: 'bg-gray-100 text-gray-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function RecentWorkOrders() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Recent Work Orders</CardTitle>
        <Link href="/work-orders">
          <Button variant="secondary" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentWorkOrders.map((workOrder) => (
            <div
              key={workOrder.id}
              className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              {/* Work Order Image */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                {workOrder.image ? (
                  <img src={workOrder.image} alt={workOrder.title} className="object-contain w-10 h-10" />
                ) : (
                  <span className="text-gray-400 text-xs">No Image</span>
                )}
              </div>
              {/* Work Order Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900 truncate">
                      {workOrder.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-1">{workOrder.number}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Badge className={priorityColors[workOrder.priority]}>
                      {workOrder.priority}
                    </Badge>
                    <Badge className={statusColors[workOrder.status]}>
                      {workOrder.status.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {workOrder.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="h-3 w-3" />
                    {workOrder.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    Created {formatDistanceToNow(workOrder.createdAt, { addSuffix: true })}
                  </div>
                  {workOrder.dueDate && (
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      Due {formatDistanceToNow(workOrder.dueDate, { addSuffix: true })}
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Technician */}
              <div className="flex items-center gap-3">
                {workOrder.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {workOrder.assignedTo.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600 hidden sm:block">
                      {workOrder.assignedTo.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Unassigned</span>
                )}

                <Link href={`/work-orders/${workOrder.id}`}>
                  <Button variant="ghost" size="sm">
                    <EyeIcon className="h-4 w-4" />
                    <span className="sr-only">View work order</span>
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}