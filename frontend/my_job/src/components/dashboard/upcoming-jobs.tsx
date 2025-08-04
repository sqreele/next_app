// src/components/dashboard/upcoming-jobs.tsx
'use client'

import React, { useEffect, useState } from 'react'
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
import { jobsAPI, Job } from '@/services/jobs-api'

const priorityColors = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
}

export function UpcomingJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true)
        // Get pending and in-progress jobs
        const pendingJobs = await jobsAPI.getJobsByStatus('PENDING')
        const inProgressJobs = await jobsAPI.getJobsByStatus('IN_PROGRESS')
        
        // Combine and sort by creation date
        const allJobs = [...pendingJobs, ...inProgressJobs]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .slice(0, 5) // Show only first 5
        
        setJobs(allJobs)
      } catch (err) {
        console.error('Error fetching jobs:', err)
        setError('Failed to load jobs')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Upcoming Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Upcoming Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            <p>{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

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
          {jobs.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <p>No upcoming jobs</p>
            </div>
          ) : (
            jobs.map((job) => (
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
                      <p className="text-xs text-gray-500">Job #{job.id}</p>
                    </div>
                    <Badge className={`${priorityColors[job.status]} text-xs`}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(job.created_at), 'MMM d, h:mm a')}
                    </div>
                    {job.property && (
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3" />
                        {job.property.name}
                      </div>
                    )}
                    {job.room && (
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        Room {job.room.name}
                      </div>
                    )}
                  </div>

                  {job.user && (
                    <div className="flex items-center gap-2 mt-3">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {job.user.first_name[0]}{job.user.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-600">
                        {job.user.first_name} {job.user.last_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
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