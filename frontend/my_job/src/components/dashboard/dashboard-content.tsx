'use client'

import React from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { DashboardErrorBoundary, NetworkErrorFallback } from '@/components/ErrorBoundary'
import { QuickStats } from '@/components/dashboard/quick-stats'
import { TechnicianStatus } from '@/components/dashboard/dashboard-overview'
import { RecentWorkOrders } from '@/components/dashboard/recent-work-orders'
import { UpcomingJobs } from '@/components/dashboard/upcoming-jobs'
import { AssetAlerts } from '@/components/dashboard/asset-alerts'
import { PerformanceCharts } from '@/components/dashboard/performance-charts'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { InventoryStatus } from '@/components/dashboard/inventory-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ChartBarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  CogIcon,
  ArrowPathIcon,
  WifiIcon,
  SignalIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline'

// Health status indicator component
const HealthStatusBadge: React.FC<{ 
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastUpdated: Date | null 
}> = ({ status, lastUpdated }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          icon: SignalIcon,
          color: 'bg-green-100 text-green-800',
          label: 'Healthy'
        }
      case 'degraded':
        return {
          icon: WifiIcon,
          color: 'bg-yellow-100 text-yellow-800',
          label: 'Degraded'
        }
      case 'unhealthy':
        return {
          icon: SignalSlashIcon,
          color: 'bg-red-100 text-red-800',
          label: 'Offline'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      {lastUpdated && (
        <span className="text-gray-500">
          Updated {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}

// Loading skeleton component
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-8 animate-pulse">
    {/* Quick Stats Skeleton */}
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    </div>

    {/* Main Content Grid Skeleton */}
    <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const DashboardContent: React.FC = () => {
  const { 
    data, 
    loading, 
    error, 
    lastUpdated, 
    isStale, 
    retry, 
    refresh, 
    healthStatus 
  } = useDashboardData()

  // Show loading skeleton on initial load
  if (loading && !data) {
    return <DashboardSkeleton />
  }

  // Show network error if no data is available
  if (error && !data) {
    return (
      <NetworkErrorFallback 
        onRetry={retry}
        title="Dashboard Unavailable"
        description="Unable to load dashboard data. This may be due to network issues or server maintenance."
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Connection Status Bar */}
      {(error || isStale || healthStatus !== 'healthy') && (
        <Alert className={`${
          healthStatus === 'unhealthy' ? 'border-red-200 bg-red-50' :
          healthStatus === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
          'border-blue-200 bg-blue-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HealthStatusBadge status={healthStatus} lastUpdated={lastUpdated} />
              <AlertDescription className="m-0">
                {error && 'Connection issues detected. Some data may be limited or outdated.'}
                {!error && isStale && 'Dashboard data is stale. Consider refreshing for latest information.'}
                {!error && !isStale && healthStatus === 'degraded' && 'Some services are experiencing issues.'}
              </AlertDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={retry} 
                variant="outline" 
                size="sm"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Retry
              </Button>
              <Button 
                onClick={refresh} 
                variant="secondary" 
                size="sm"
                disabled={loading}
              >
                Refresh All
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* Header Actions */}
      <div className="flex justify-end">
        <QuickActions />
      </div>

      {/* Quick Stats */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
        <DashboardErrorBoundary componentName="Quick Stats">
          <QuickStats dashboardData={data} />
        </DashboardErrorBoundary>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Left/Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Overview Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
            <div className="flex items-center gap-2 mb-6">
              <ChartBarIcon className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800">Overview</h2>
            </div>
            <DashboardErrorBoundary componentName="Technician Status">
              <TechnicianStatus data={data?.technicians} />
            </DashboardErrorBoundary>
          </div>

          {/* Performance Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
            <div className="flex items-center gap-2 mb-6">
              <CogIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Performance</h2>
            </div>
            <DashboardErrorBoundary componentName="Performance Charts">
              <PerformanceCharts data={data?.workOrders} />
            </DashboardErrorBoundary>
          </div>

          {/* Recent Work Orders Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
            <div className="flex items-center gap-2 mb-6">
              <ClockIcon className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-800">Recent Work Orders</h2>
            </div>
            <DashboardErrorBoundary componentName="Recent Work Orders">
              <RecentWorkOrders data={data?.workOrders} />
            </DashboardErrorBoundary>
          </div>
        </div>

        {/* Right/Sidebar */}
        <div className="space-y-8">
          {/* Upcoming Jobs */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClockIcon className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-700">Upcoming Jobs</h2>
            </div>
            <DashboardErrorBoundary componentName="Upcoming Jobs">
              <UpcomingJobs data={data?.jobs} />
            </DashboardErrorBoundary>
          </div>

          {/* Asset Alerts */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-700">System Alerts</h2>
            </div>
            <DashboardErrorBoundary componentName="System Alerts">
              <AssetAlerts data={data?.alerts} />
            </DashboardErrorBoundary>
          </div>

          {/* Inventory Status */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-700">Inventory Status</h2>
            </div>
            <DashboardErrorBoundary componentName="Inventory Status">
              <InventoryStatus />
            </DashboardErrorBoundary>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      {lastUpdated && (
        <div className="text-center text-sm text-gray-500 py-4">
          Dashboard last updated: {lastUpdated.toLocaleString()}
          {isStale && (
            <span className="text-yellow-600 ml-2">
              (Data may be stale - consider refreshing)
            </span>
          )}
        </div>
      )}
    </div>
  )
}