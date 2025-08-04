// src/components/dashboard/dashboard-overview.tsx
"use client";

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { 
  UsersIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  WiFiIcon
} from '@heroicons/react/24/outline'
import { useApiData } from '@/hooks/use-api-state'
import apiClient from '@/lib/api-client'
import { Skeleton } from '@/components/ui/skeleton'

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

interface Technician {
  id: number
  name: string
  username: string
  role: string
  status: 'available' | 'busy' | 'offline'
  currentWorkOrder?: string
  location?: string
  utilization: number
  completedToday: number
}

// Loading skeleton component
function TechnicianSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  )
}

// Error display component
function TechnicianError({ 
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
            <span>{error?.message || 'Failed to load technician data'}</span>
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
  )
}

export function TechnicianStatus() {
  const {
    data: technicians,
    loading,
    error,
    retry,
    retryCount,
    isOffline
  } = useApiData<Technician[]>(
    () => apiClient.get('/api/v1/users?role=Technician'),
    [], // dependencies
    {
      showErrorToast: false, // We'll handle errors in the UI
      maxRetries: 3,
      autoRetryOnNetworkRestore: true
    }
  )

  const availableCount = technicians?.filter(t => t.role === 'Technician' && t.status === 'available').length || 0
  const busyCount = technicians?.filter(t => t.role === 'Technician' && t.status === 'busy').length || 0

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
        {loading && <TechnicianSkeleton />}
        
        {error && (
          <TechnicianError 
            error={error}
            onRetry={retry}
            retryCount={retryCount}
            isOffline={isOffline}
          />
        )}
        
        {!loading && !error && technicians && (
          <>
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
            {technicians.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No technicians found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {technicians.map((technician) => (
                  <div key={technician.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {typeof technician.username === 'string'
                            ? technician.username.split(' ').map((n: string) => n[0]).join('')
                            : technician.name?.split(' ').map((n: string) => n[0]).join('') || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${statusDots[technician.status]} rounded-full border-2 border-white`}></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {technician.name || technician.username}
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
                          <span className="font-medium">{technician.utilization || 0}%</span>
                        </div>
                        <Progress value={technician.utilization || 0} className="h-1" />
                      </div>

                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Completed today: {technician.completedToday || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Network status indicator */}
        {isOffline && (
          <div className="mt-4 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700 text-sm">
              <WiFiIcon className="h-4 w-4" />
              <span>You're offline. Data will refresh when connection is restored.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}