// src/components/dashboard/upcoming-jobs.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { format, formatDistanceToNow } from 'date-fns'

interface Job {
  id: string
  title: string
  workOrderNumber: string
  scheduledFor: Date
  estimatedDuration: string
  assignedTo: {
    name: string
    avatar?: string
  }
  location: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

const upcomingJobs: Job[] = [
  {
    id: '1',
    title: 'HVAC Filter Replacement',
    workOrderNumber: 'WO-2024-005',
    scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    estimatedDuration: '2 hours',
    assignedTo: { name: 'John Smith' },
    location: 'Building A',
    priority: 'medium',
  },
  {
    id: '2',
    title: 'Emergency Generator Test',
    workOrderNumber: 'WO-2024-006',
    scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    estimatedDuration: '1 hour',
    assignedTo: { name: 'Mike Johnson' },
    location: 'Building B',
    priority: 'high',
  },
  {
    id: '3',
    title: 'Plumbing Inspection',
    workOrderNumber: 'WO-2024-007',
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    estimatedDuration: '3 hours',
    assignedTo: { name: 'Sarah Wilson' },
    location: 'Building C',
    priority: 'low',
  },
]

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

export function UpcomingJobs() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Upcoming Jobs</CardTitle>
        <Link href="/jobs/calendar">
          <Button variant="secondary" size="sm">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingJobs.map((job) => (
            <div
              key={job.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {job.title}
                    </h4>
                    <p className="text-xs text-gray-500">{job.workOrderNumber}</p>
                  </div>
                  <Badge className={`${priorityColors[job.priority]} text-xs`}>
                    {job.priority}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {format(job.scheduledFor, 'MMM d, h:mm a')}
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {job.estimatedDuration}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="h-3 w-3" />
                    {job.location}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {job.assignedTo.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-600">{job.assignedTo.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Link href="/jobs">
            <Button variant="secondary" className="w-full">
              View All Jobs
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}