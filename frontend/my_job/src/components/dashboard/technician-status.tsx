// src/components/dashboard/technician-status.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { UsersIcon } from '@heroicons/react/24/outline'

interface Technician {
  id: string
  name: string
  status: 'available' | 'busy' | 'offline'
  currentWorkOrder?: string
  completedToday: number
  utilization: number
  location?: string
}

const technicians: Technician[] = [
  {
    id: '1',
    name: 'John Smith',
    status: 'busy',
    currentWorkOrder: 'WO-2024-001',
    completedToday: 3,
    utilization: 85,
    location: 'Building A',
  },
  {
    id: '2',
    name: 'Mike Johnson',
    status: 'available',
    completedToday: 5,
    utilization: 75,
  },
  {
    id: '3',
    name: 'Sarah Wilson',
    status: 'busy',
    currentWorkOrder: 'WO-2024-008',
    completedToday: 2,
    utilization: 90,
    location: 'Building C',
  },
  {
    id: '4',
    name: 'David Brown',
    status: 'offline',
    completedToday: 4,
    utilization: 60,
  },
]

const statusColors = {
  available: 'bg-green-100 text-green-800',
  busy: 'bg-yellow-100 text-yellow-800',
  offline: 'bg-gray-100 text-gray-800',
}

const statusDots = {
  available: 'bg-green-500',
  busy: 'bg-yellow-500',
  offline: 'bg-gray-400',
}

export function TechnicianStatus() {
  const availableCount = technicians.filter(t => t.status === 'available').length
  const busyCount = technicians.filter(t => t.status === 'busy').length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Team Status</CardTitle>
        <Link href="/technicians">
          <Button variant="secondary" size="sm">
            <UsersIcon className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{availableCount}</div>
            <div className="text-sm text-green-700">Available</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{busyCount}</div>
            <div className="text-sm text-yellow-700">Busy</div>
          </div>
        </div>

        {/* Technician List */}
        <div className="space-y-4">
          {technicians.map((technician) => (
            <div key={technician.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {technician.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${statusDots[technician.status]} rounded-full border-2 border-white`}></div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {technician.name}
                  </h4>
                  <Badge className={`${statusColors[technician.status]} text-xs`}>
                    {technician.status}
                  </Badge>
                </div>

                {technician.currentWorkOrder && (
                  <p className="text-xs text-gray-600 mb-1">
                    Working on: {technician.currentWorkOrder}
                  </p>
                )}

                {technician.location && (
                  <p className="text-xs text-gray-500 mb-2">{technician.location}</p>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Utilization</span>
                    <span className="font-medium">{technician.utilization}%</span>
                  </div>
                  <Progress value={technician.utilization} className="h-1" />
                </div>

                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Completed today: {technician.completedToday}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}