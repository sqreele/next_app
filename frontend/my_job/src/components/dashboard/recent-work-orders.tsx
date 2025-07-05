// src/components/dashboard/recent-work-orders.tsx
'use client'

import React, { useEffect } from 'react'
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
import { useWorkOrderStore } from '@/stores/work-orders-store'

const priorityColors = {
  Low: 'bg-gray-100 text-gray-800',
  Medium: 'bg-blue-100 text-blue-800',
  High: 'bg-orange-100 text-orange-800',
  Urgent: 'bg-red-100 text-red-800',
}

const statusColors = {
  Pending: 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
}

export function RecentWorkOrders() {
  const { workOrders, loading, fetchWorkOrders } = useWorkOrderStore()

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  // Get recent work orders (limit to 5)
  const recentWorkOrders = workOrders.slice(0, 5)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

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
          {recentWorkOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No work orders found</p>
              <p className="text-sm">Create your first work order to get started</p>
            </div>
          ) : (
            recentWorkOrders.map((workOrder) => (
              <div
                key={workOrder.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                {/* Work Order Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                  <span className="text-gray-400 text-xs">WO</span>
                </div>
                
                {/* Work Order Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900 truncate">
                        {workOrder.task}
                      </h4>
                      <p className="text-sm text-gray-600 mb-1">WO-{workOrder.id}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Badge className={priorityColors[workOrder.priority as keyof typeof priorityColors]}>
                        {workOrder.priority}
                      </Badge>
                      <Badge className={statusColors[workOrder.status as keyof typeof statusColors]}>
                        {workOrder.status}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {workOrder.description || 'No description provided'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      Created {formatDistanceToNow(new Date(workOrder.created_at), { addSuffix: true })}
                    </div>
                    {workOrder.due_date && (
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        Due {formatDistanceToNow(new Date(workOrder.due_date), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned Technician */}
                <div className="flex items-center gap-3">
                  {workOrder.assigned_to_id ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          T{workOrder.assigned_to_id}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600 hidden sm:block">
                        Technician {workOrder.assigned_to_id}
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}