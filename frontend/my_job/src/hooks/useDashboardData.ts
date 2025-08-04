'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { makeDashboardRequest, requestWithRetry, healthCheck, circuitBreaker } from '@/lib/api-client'
import apiClient from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

interface DashboardData {
  properties: any[]
  jobs: any[]
  workOrders: any[]
  technicians: any[]
  alerts: any[]
  stats: {
    totalWorkOrders: number
    completedToday: number
    pendingJobs: number
    activeAlerts: number
  }
}

interface UseDashboardDataReturn {
  data: DashboardData | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  isStale: boolean
  retry: () => Promise<void>
  refresh: () => Promise<void>
  healthStatus: 'healthy' | 'degraded' | 'unhealthy'
}

// Fallback data for when API is unavailable
const FALLBACK_DATA: DashboardData = {
  properties: [
    {
      id: 1,
      property_id: "FALLBACK001",
      name: "Sample Property",
      description: "Fallback data - please refresh when connection is restored",
      users: [],
      created_at: new Date().toISOString(),
      rooms: []
    }
  ],
  jobs: [],
  workOrders: [
    {
      id: 'fallback-1',
      title: 'Offline Mode - Limited Data Available',
      status: 'pending',
      priority: 'low',
      created_at: new Date().toISOString(),
      description: 'Real-time data unavailable. Please check your connection.'
    }
  ],
  technicians: [
    {
      id: 'fallback-tech-1',
      username: 'System',
      status: 'offline',
      role: 'Technician',
      utilization: 0,
      completedToday: 0,
      currentWorkOrder: null,
      location: 'Unknown'
    }
  ],
  alerts: [
    {
      id: 'connection-alert',
      type: 'warning',
      message: 'Connection issues detected. Some data may be outdated.',
      timestamp: new Date().toISOString(),
      severity: 'medium'
    }
  ],
  stats: {
    totalWorkOrders: 0,
    completedToday: 0,
    pendingJobs: 0,
    activeAlerts: 1
  }
}

const CACHE_KEY = 'dashboard-cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const STALE_DURATION = 10 * 60 * 1000 // 10 minutes
const RETRY_INTERVAL = 30 * 1000 // 30 seconds

export function useDashboardData(): UseDashboardDataReturn {
  const { token } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy')
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const failureCountRef = useRef(0)

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached)
          const age = Date.now() - timestamp
          
          if (age < STALE_DURATION) {
            setData(cachedData)
            setLastUpdated(new Date(timestamp))
            setLoading(false)
            
            // Mark as stale if older than cache duration
            if (age > CACHE_DURATION) {
              console.log('Using stale cached data')
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load cached dashboard data:', error)
      }
    }

    loadCachedData()
  }, [])

  // Cache data whenever it updates
  const cacheData = useCallback((newData: DashboardData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: newData,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.warn('Failed to cache dashboard data:', error)
    }
  }, [])

  // Check if data is stale
  const isStale = lastUpdated ? Date.now() - lastUpdated.getTime() > CACHE_DURATION : true

  // Fetch individual data sources with error handling
  const fetchProperties = async (): Promise<any[]> => {
    try {
      const response = await requestWithRetry(
        () => apiClient.get('/api/properties/'),
        { maxRetries: 2 }
      )
      return response || []
    } catch (error) {
      console.warn('Failed to fetch properties:', error)
      return data?.properties || FALLBACK_DATA.properties
    }
  }

  const fetchJobs = async (propertyId?: string): Promise<any[]> => {
    try {
      const url = propertyId ? `/api/jobs/?property=${propertyId}` : '/api/jobs/'
      const response = await requestWithRetry(
        () => apiClient.get(url),
        { maxRetries: 2 }
      )
      return response || []
    } catch (error) {
      console.warn('Failed to fetch jobs:', error)
      return data?.jobs || FALLBACK_DATA.jobs
    }
  }

  const fetchWorkOrders = async (): Promise<any[]> => {
    try {
      const response = await requestWithRetry(
        () => apiClient.get('/api/v1/work-orders/'),
        { maxRetries: 2 }
      )
      return response || []
    } catch (error) {
      console.warn('Failed to fetch work orders:', error)
      return data?.workOrders || FALLBACK_DATA.workOrders
    }
  }

  const fetchTechnicians = async (): Promise<any[]> => {
    try {
      const response = await requestWithRetry(
        () => apiClient.get('/api/v1/users?role=Technician'),
        { maxRetries: 2 }
      )
      return response || []
    } catch (error) {
      console.warn('Failed to fetch technicians:', error)
      return data?.technicians || FALLBACK_DATA.technicians
    }
  }

  const calculateStats = (workOrders: any[], jobs: any[], alerts: any[]) => {
    const today = new Date().toDateString()
    return {
      totalWorkOrders: workOrders.length,
      completedToday: workOrders.filter(wo => 
        wo.status === 'completed' && 
        new Date(wo.updated_at || wo.created_at).toDateString() === today
      ).length,
      pendingJobs: jobs.filter(job => job.status === 'pending').length,
      activeAlerts: alerts.filter(alert => alert.severity !== 'low').length
    }
  }

  // Main data fetching function
  const fetchDashboardData = useCallback(async (): Promise<void> => {
    if (!token) {
      setError('No authentication token available')
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      // Check API health first
      const isHealthy = await healthCheck()
      setHealthStatus(isHealthy ? 'healthy' : 'degraded')

      // Fetch data in parallel with graceful degradation
      const [properties, workOrders, technicians] = await Promise.allSettled([
        fetchProperties(),
        fetchWorkOrders(),
        fetchTechnicians()
      ])

      // Extract successful results
      const propertiesData = properties.status === 'fulfilled' ? properties.value : FALLBACK_DATA.properties
      const workOrdersData = workOrders.status === 'fulfilled' ? workOrders.value : FALLBACK_DATA.workOrders
      const techniciansData = technicians.status === 'fulfilled' ? technicians.value : FALLBACK_DATA.technicians

      // Fetch jobs for first property if available
      let jobsData: any[] = []
      if (propertiesData.length > 0) {
        const firstProperty = propertiesData[0]
        if (firstProperty?.property_id) {
          jobsData = await fetchJobs(firstProperty.property_id)
        }
      }

      // Generate alerts based on circuit breaker states and failures
      const alerts = []
      if (!isHealthy) {
        alerts.push({
          id: 'api-health-warning',
          type: 'warning',
          message: 'API service is experiencing issues. Some data may be limited.',
          timestamp: new Date().toISOString(),
          severity: 'medium'
        })
      }

      // Check circuit breaker states
      const circuitStates = ['properties', 'jobs', 'work-orders', 'users'].map(endpoint => ({
        endpoint,
        state: circuitBreaker.getCircuitState(`/api/${endpoint}/`)
      }))

      circuitStates.forEach(({ endpoint, state }) => {
        if (state === 'OPEN') {
          alerts.push({
            id: `circuit-breaker-${endpoint}`,
            type: 'error',
            message: `${endpoint} service is temporarily unavailable`,
            timestamp: new Date().toISOString(),
            severity: 'high'
          })
        }
      })

      const stats = calculateStats(workOrdersData, jobsData, alerts)

      const newData: DashboardData = {
        properties: propertiesData,
        jobs: jobsData,
        workOrders: workOrdersData,
        technicians: techniciansData,
        alerts,
        stats
      }

      setData(newData)
      setLastUpdated(new Date())
      cacheData(newData)
      failureCountRef.current = 0
      
      // Update health status based on data freshness
      if (properties.status === 'rejected' || workOrders.status === 'rejected') {
        setHealthStatus('degraded')
      }

    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error)
      failureCountRef.current++
      
      // Use fallback data if no cached data is available
      if (!data) {
        setData(FALLBACK_DATA)
        setLastUpdated(new Date())
      }
      
      setError(error.message || 'Failed to load dashboard data')
      setHealthStatus('unhealthy')
      
      // Schedule retry with exponential backoff
      if (failureCountRef.current < 5) {
        const retryDelay = Math.min(RETRY_INTERVAL * Math.pow(2, failureCountRef.current - 1), 300000) // Max 5 minutes
        retryTimeoutRef.current = setTimeout(() => {
          console.log(`Retrying dashboard data fetch (attempt ${failureCountRef.current + 1})`)
          fetchDashboardData()
        }, retryDelay)
      }
    } finally {
      setLoading(false)
    }
  }, [token, data, cacheData])

  // Retry function for manual retries
  const retry = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    failureCountRef.current = 0
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    
    await fetchDashboardData()
  }, [fetchDashboardData])

  // Refresh function for force refresh
  const refresh = useCallback(async (): Promise<void> => {
    // Clear cache and force fresh data
    localStorage.removeItem(CACHE_KEY)
    await retry()
  }, [retry])

  // Initial data fetch and periodic refresh
  useEffect(() => {
    fetchDashboardData()

    // Set up periodic refresh for healthy connections
    const interval = setInterval(() => {
      if (healthStatus === 'healthy' && !loading) {
        fetchDashboardData()
      }
    }, CACHE_DURATION)

    return () => {
      clearInterval(interval)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [fetchDashboardData, healthStatus, loading])

  return {
    data,
    loading,
    error,
    lastUpdated,
    isStale,
    retry,
    refresh,
    healthStatus
  }
}