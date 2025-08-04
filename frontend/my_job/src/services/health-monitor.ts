'use client'

import React from 'react'
import { healthCheck, circuitBreaker } from '@/lib/api-client'

export interface HealthMetrics {
  apiHealth: boolean
  lastChecked: Date
  uptime: number
  responseTime: number
  circuitBreakerStates: Record<string, string>
  errorRate: number
  consecutiveFailures: number
}

export interface HealthEvent {
  timestamp: Date
  type: 'health_check' | 'api_error' | 'circuit_breaker_open' | 'recovery'
  endpoint?: string
  status?: number
  responseTime?: number
  message?: string
}

class HealthMonitor {
  private static instance: HealthMonitor
  private metrics: HealthMetrics
  private events: HealthEvent[] = []
  private listeners: ((metrics: HealthMetrics) => void)[] = []
  private intervalId: NodeJS.Timeout | null = null
  private startTime: Date
  private requestTimes: number[] = []
  private errorCount = 0
  private totalRequests = 0
  private consecutiveFailures = 0

  private constructor() {
    this.startTime = new Date()
    this.metrics = {
      apiHealth: true,
      lastChecked: new Date(),
      uptime: 0,
      responseTime: 0,
      circuitBreakerStates: {},
      errorRate: 0,
      consecutiveFailures: 0
    }
  }

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor()
    }
    return HealthMonitor.instance
  }

  start(interval: number = 30000): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }

    this.performHealthCheck()
    this.intervalId = setInterval(() => {
      this.performHealthCheck()
    }, interval)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = performance.now()
    let isHealthy = false
    
    try {
      isHealthy = await healthCheck()
      const responseTime = performance.now() - startTime
      
      this.recordRequestTime(responseTime)
      this.totalRequests++
      
      if (isHealthy) {
        this.consecutiveFailures = 0
        if (!this.metrics.apiHealth) {
          // Recovery detected
          this.addEvent({
            timestamp: new Date(),
            type: 'recovery',
            message: 'API health restored',
            responseTime
          })
        }
      } else {
        this.consecutiveFailures++
        this.errorCount++
      }

    } catch (error) {
      this.consecutiveFailures++
      this.errorCount++
      this.addEvent({
        timestamp: new Date(),
        type: 'api_error',
        message: error instanceof Error ? error.message : 'Health check failed'
      })
    }

    // Update circuit breaker states
    const endpoints = ['/api/properties/', '/api/jobs/', '/api/v1/work-orders/', '/api/v1/users']
    const circuitStates: Record<string, string> = {}
    
    endpoints.forEach(endpoint => {
      const state = circuitBreaker.getCircuitState(endpoint)
      circuitStates[endpoint] = state
      
      if (state === 'OPEN') {
        this.addEvent({
          timestamp: new Date(),
          type: 'circuit_breaker_open',
          endpoint,
          message: `Circuit breaker opened for ${endpoint}`
        })
      }
    })

    this.metrics = {
      apiHealth: isHealthy,
      lastChecked: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      responseTime: this.getAverageResponseTime(),
      circuitBreakerStates: circuitStates,
      errorRate: this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0,
      consecutiveFailures: this.consecutiveFailures
    }

    this.addEvent({
      timestamp: new Date(),
      type: 'health_check',
      responseTime: performance.now() - startTime
    })

    // Notify listeners
    this.notifyListeners()
  }

  private recordRequestTime(time: number): void {
    this.requestTimes.push(time)
    // Keep only last 50 measurements
    if (this.requestTimes.length > 50) {
      this.requestTimes.shift()
    }
  }

  private getAverageResponseTime(): number {
    if (this.requestTimes.length === 0) return 0
    return this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length
  }

  private addEvent(event: HealthEvent): void {
    this.events.unshift(event)
    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events.pop()
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.metrics)
      } catch (error) {
        console.error('Error notifying health listener:', error)
      }
    })
  }

  getMetrics(): HealthMetrics {
    return { ...this.metrics }
  }

  getEvents(): HealthEvent[] {
    return [...this.events]
  }

  getRecentEvents(count: number = 10): HealthEvent[] {
    return this.events.slice(0, count)
  }

  subscribe(listener: (metrics: HealthMetrics) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Record external API errors
  recordApiError(endpoint: string, status?: number, responseTime?: number): void {
    this.errorCount++
    this.totalRequests++
    this.consecutiveFailures++
    
    this.addEvent({
      timestamp: new Date(),
      type: 'api_error',
      endpoint,
      status,
      responseTime,
      message: `API error on ${endpoint}${status ? ` (${status})` : ''}`
    })

    // Update metrics
    this.metrics.errorRate = (this.errorCount / this.totalRequests) * 100
    this.metrics.consecutiveFailures = this.consecutiveFailures
    
    this.notifyListeners()
  }

  // Record successful API calls
  recordApiSuccess(endpoint: string, responseTime?: number): void {
    this.totalRequests++
    this.consecutiveFailures = 0
    
    if (responseTime) {
      this.recordRequestTime(responseTime)
      this.metrics.responseTime = this.getAverageResponseTime()
    }

    // Update error rate
    this.metrics.errorRate = this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0
    this.metrics.consecutiveFailures = 0
    
    this.notifyListeners()
  }

  getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const { apiHealth, errorRate, consecutiveFailures, circuitBreakerStates } = this.metrics
    
    // Check if any circuit breakers are open
    const openCircuits = Object.values(circuitBreakerStates).filter(state => state === 'OPEN').length
    
    if (!apiHealth || consecutiveFailures >= 5 || openCircuits > 2) {
      return 'unhealthy'
    }
    
    if (errorRate > 20 || consecutiveFailures >= 2 || openCircuits > 0) {
      return 'degraded'
    }
    
    return 'healthy'
  }

  // Get uptime in a human-readable format
  getUptimeString(): string {
    const uptimeMs = this.metrics.uptime
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60))
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  // Reset error tracking (useful after recovery)
  reset(): void {
    this.errorCount = 0
    this.totalRequests = 0
    this.consecutiveFailures = 0
    this.requestTimes = []
    this.events = []
    this.startTime = new Date()
    
    this.metrics = {
      ...this.metrics,
      uptime: 0,
      errorRate: 0,
      consecutiveFailures: 0,
      responseTime: 0
    }
    
    this.notifyListeners()
  }

  // Export metrics for debugging
  exportMetrics(): {
    metrics: HealthMetrics
    events: HealthEvent[]
    healthStatus: string
    uptime: string
  } {
    return {
      metrics: this.getMetrics(),
      events: this.getEvents(),
      healthStatus: this.getHealthStatus(),
      uptime: this.getUptimeString()
    }
  }
}

// Export singleton instance
export const healthMonitor = HealthMonitor.getInstance()

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  healthMonitor.start()
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    healthMonitor.stop()
  })
}

  // Hook for React components
export const useHealthMonitor = () => {
  const [metrics, setMetrics] = React.useState<HealthMetrics>(healthMonitor.getMetrics())
  
  React.useEffect(() => {
    const unsubscribe = healthMonitor.subscribe(setMetrics)
    return unsubscribe
  }, [])
  
  return {
    metrics,
    healthStatus: healthMonitor.getHealthStatus(),
    events: healthMonitor.getRecentEvents(),
    uptime: healthMonitor.getUptimeString()
  }
}

export default healthMonitor