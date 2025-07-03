// src/components/dashboard/asset-alerts.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ExclamationTriangleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

interface AssetAlert {
  id: string
  assetName: string
  assetId: string
  alertType: 'maintenance-due' | 'overdue' | 'warning' | 'critical'
  message: string
  dueDate?: Date
  location: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

const assetAlerts: AssetAlert[] = [
  {
    id: '1',
    assetName: 'HVAC Unit #3',
    assetId: 'HVAC-003',
    alertType: 'maintenance-due',
    message: 'Monthly filter replacement due',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    location: 'Building A - Roof',
    priority: 'medium',
  },
  {
    id: '2',
    assetName: 'Generator #1',
    assetId: 'GEN-001',
    alertType: 'overdue',
    message: 'Quarterly inspection overdue',
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    location: 'Building B - Basement',
    priority: 'high',
  },
  {
    id: '3',
    assetName: 'Elevator #2',
    assetId: 'ELEV-002',
    alertType: 'critical',
    message: 'Safety inspection required immediately',
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    location: 'Building C',
    priority: 'critical',
  },
  {
    id: '4',
    assetName: 'Boiler System',
    assetId: 'BOIL-001',
    alertType: 'warning',
    message: 'Efficiency monitoring shows declining performance',
    location: 'Building A - Basement',
    priority: 'medium',
  },
]

const alertTypeIcons = {
  'maintenance-due': ClockIcon,
  'overdue': ExclamationTriangleIcon,
  'warning': ExclamationTriangleIcon,
  'critical': ExclamationTriangleIcon,
}

const alertTypeColors = {
  'maintenance-due': 'text-blue-600 bg-blue-50',
  'overdue': 'text-orange-600 bg-orange-50',
  'warning': 'text-yellow-600 bg-yellow-50',
  'critical': 'text-red-600 bg-red-50',
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export function AssetAlerts() {
  const criticalCount = assetAlerts.filter(alert => alert.priority === 'critical').length
  const highCount = assetAlerts.filter(alert => alert.priority === 'high').length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Asset Alerts</CardTitle>
        <Link href="/assets">
          <Button variant="secondary" size="sm">
            <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
            View Assets
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {/* Alert Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-2 xs:grid-cols-1">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <div className="text-sm text-red-700">Critical</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{highCount}</div>
            <div className="text-sm text-orange-700">High Priority</div>
          </div>
        </div>

        {/* Alert List */}
        <div className="space-y-3">
          {assetAlerts.map((alert) => {
            const IconComponent = alertTypeIcons[alert.alertType]
            
            return (
              <div
                key={alert.id}
                className="flex flex-col sm:flex-row items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className={`p-2 rounded-lg ${alertTypeColors[alert.alertType]} flex-shrink-0`}>
                  <IconComponent className="h-5 w-5 sm:h-4 sm:w-4" />
                </div>

                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-1 gap-1 sm:gap-0">
                    <div>
                      <h4 className="text-base sm:text-sm font-medium text-gray-900 truncate">
                        {alert.assetName}
                      </h4>
                      <p className="text-xs text-gray-500">{alert.assetId}</p>
                    </div>
                    <Badge className={`${priorityColors[alert.priority]} text-xs ml-0 sm:ml-2 mt-1 sm:mt-0`}>
                      {alert.priority}
                    </Badge>
                  </div>

                  <p className="text-sm sm:text-xs text-gray-600 mb-2">{alert.message}</p>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-gray-500 gap-1 sm:gap-0">
                    <span>{alert.location}</span>
                    {alert.dueDate && (
                      <span>
                        {alert.dueDate < new Date() ? 'Overdue by' : 'Due'}{' '}
                        {formatDistanceToNow(alert.dueDate, { addSuffix: !alert.dueDate || alert.dueDate < new Date() })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Link href="/assets/maintenance">
            <Button variant="secondary" className="w-full text-base sm:text-sm py-3 sm:py-2">
              View All Alerts
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}