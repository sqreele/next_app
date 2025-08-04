// src/components/dashboard/quick-stats.tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  WiFiIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { useApiData } from '@/hooks/use-api-state'
import apiClient from '@/lib/api-client'

interface StatCard {
  title: string
  value: string | number
  change: {
    value: string
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'yellow' | 'green' | 'red'
  description: string
}

interface WorkOrderStats {
  pending: number
  inProgress: number
  completed: number
  overdue: number
  total: number
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'border-blue-200',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    border: 'border-yellow-200',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    border: 'border-green-200',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    border: 'border-red-200',
  },
}

// Loading skeleton for stats
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse">
          <Skeleton className="h-32 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

// Error display for stats
function StatsError({ 
  error, 
  onRetry, 
  retryCount,
  isOffline 
}: {
  error: any
  onRetry: () => void
  retryCount: number
  isOffline: boolean
}) {
  return (
    <div className="grid gap-4 md:grid-cols-1">
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            {isOffline ? (
              <div className="flex items-center gap-2">
                <WiFiIcon className="h-4 w-4" />
                <span>No internet connection</span>
              </div>
            ) : (
              <span>{error?.message || 'Failed to load statistics'}</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isOffline}
            className="ml-2"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Retry {retryCount > 0 && `(${retryCount})`}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}

export function QuickStats() {
  const {
    data: stats,
    loading,
    error,
    retry,
    retryCount,
    isOffline
  } = useApiData<WorkOrderStats>(
    () => apiClient.get('/api/v1/work-orders/stats'),
    [], // dependencies
    {
      showErrorToast: false, // We'll handle errors in the UI
      maxRetries: 3,
      autoRetryOnNetworkRestore: true
    }
  )

  // Default stats when no data is available
  const defaultStats: WorkOrderStats = {
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    total: 0
  }

  const currentStats = stats || defaultStats

  const statCards: StatCard[] = [
    {
      title: 'Open Work Orders',
      value: currentStats.pending,
      change: { value: '+0%', type: 'neutral' },
      icon: ClipboardDocumentListIcon,
      color: 'blue',
      description: 'Active work orders requiring attention',
    },
    {
      title: 'In Progress',
      value: currentStats.inProgress,
      change: { value: '+0%', type: 'neutral' },
      icon: ClockIcon,
      color: 'yellow',
      description: 'Work orders currently being worked on',
    },
    {
      title: 'Completed Today',
      value: currentStats.completed,
      change: { value: '+0%', type: 'neutral' },
      icon: CheckCircleIcon,
      color: 'green',
      description: 'Work orders completed in the last 24 hours',
    },
    {
      title: 'Overdue',
      value: currentStats.overdue,
      change: { value: '-0%', type: 'neutral' },
      icon: ExclamationTriangleIcon,
      color: 'red',
      description: 'Work orders past their due date',
    },
  ]

  if (loading) {
    return <StatsSkeleton />
  }

  if (error) {
    return (
      <StatsError 
        error={error}
        onRetry={retry}
        retryCount={retryCount}
        isOffline={isOffline}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className={cn('border-l-4', colorClasses[stat.color].border)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={cn(
                    'rounded-full p-3',
                    colorClasses[stat.color].bg
                  )}>
                    <stat.icon className={cn('h-6 w-6', colorClasses[stat.color].icon)} />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <div className="flex items-center">
                    {stat.change.type === 'increase' ? (
                      <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                    ) : stat.change.type === 'decrease' ? (
                      <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                    <span className={cn(
                      'text-sm font-medium ml-1',
                      stat.change.type === 'increase' && 'text-green-600',
                      stat.change.type === 'decrease' && 'text-red-600',
                      stat.change.type === 'neutral' && 'text-gray-600'
                    )}>
                      {stat.change.value}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">from last week</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {/* Network status indicator */}
      {isOffline && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 text-orange-700 text-sm">
            <WiFiIcon className="h-4 w-4" />
            <span>You're offline. Statistics will refresh when connection is restored.</span>
          </div>
        </div>
      )}
    </div>
  )
}