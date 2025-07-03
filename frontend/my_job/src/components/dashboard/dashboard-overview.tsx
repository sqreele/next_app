// src/components/dashboard/dashboard-overview.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { 
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

const overviewData = {
  workOrdersToday: {
    total: 15,
    completed: 8,
    inProgress: 5,
    pending: 2,
  },
  techniciansOnDuty: {
    total: 12,
    active: 9,
    available: 3,
  },
  upcomingMaintenance: 7,
  averageResolutionTime: '4.2 hours',
}

export function DashboardOverview() {
  const completionRate = (overviewData.workOrdersToday.completed / overviewData.workOrdersToday.total) * 100
  const technicianUtilization = (overviewData.techniciansOnDuty.active / overviewData.techniciansOnDuty.total) * 100

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Today's Overview</CardTitle>
        <Link href="/reports">
          <Button variant="secondary" size="sm">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Work Orders Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Work Orders Today</span>
            </div>
            <span className="text-sm text-gray-500">
              {overviewData.workOrdersToday.completed}/{overviewData.workOrdersToday.total} completed
            </span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Completed: {overviewData.workOrdersToday.completed}</span>
            <span>In Progress: {overviewData.workOrdersToday.inProgress}</span>
            <span>Pending: {overviewData.workOrdersToday.pending}</span>
          </div>
        </div>

        {/* Technician Utilization */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-green-600" />
              <span className="font-medium">Technician Utilization</span>
            </div>
            <span className="text-sm text-gray-500">
              {overviewData.techniciansOnDuty.active}/{overviewData.techniciansOnDuty.total} active
            </span>
          </div>
          <Progress value={technicianUtilization} className="h-2" />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Active: {overviewData.techniciansOnDuty.active}</span>
            <span>Available: {overviewData.techniciansOnDuty.available}</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ClockIcon className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Avg Resolution</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{overviewData.averageResolutionTime}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CalendarIcon className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Upcoming</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{overviewData.upcomingMaintenance}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}