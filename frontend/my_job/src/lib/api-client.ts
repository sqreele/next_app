// frontend/my_job/src/lib/api-client.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { toast } from 'sonner'

// Enhanced error types for better type safety
interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

// Circuit breaker state management
class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private readonly threshold: number = 5
  private readonly timeout: number = 60000 // 1 minute
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  canExecute(): boolean {
    if (this.state === 'CLOSED') return true
    
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = 'HALF_OPEN'
        return true
      }
      return false
    }
    
    // HALF_OPEN state
    return true
  }

  onSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }

  onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
    }
  }

  getState(): string {
    return this.state
  }
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker()

// Network status tracking
class NetworkMonitor {
  private isOnline: boolean = true
  private listeners: Array<(online: boolean) => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      window.addEventListener('online', () => this.setOnline(true))
      window.addEventListener('offline', () => this.setOnline(false))
    }
  }

  private setOnline(online: boolean): void {
    this.isOnline = online
    this.listeners.forEach(listener => listener(online))
  }

  public isNetworkOnline(): boolean {
    return this.isOnline
  }

  public onNetworkChange(listener: (online: boolean) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) this.listeners.splice(index, 1)
    }
  }
}

const networkMonitor = new NetworkMonitor()

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  // For Docker setup, use relative URLs (no baseURL needed)
  timeout: 30000, // Increased timeout for slow connections
  headers: {
    'Content-Type': 'application/json',
  },
})

// Enhanced error handler with specific logic for different scenarios
export const createErrorHandler = (options: {
  showToast?: boolean
  logError?: boolean
  customMessages?: Record<number, string>
  retryable?: boolean
} = {}) => {
  const { 
    showToast = true, 
    logError = true, 
    customMessages = {},
    retryable = false
  } = options

  return (error: AxiosError): ApiError => {
    let apiError: ApiError = {
      message: 'An unexpected error occurred',
      status: 0
    }

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      apiError.status = status
      
      // Use custom messages if provided, otherwise use default logic
      if (customMessages[status]) {
        apiError.message = customMessages[status]
      } else {
        switch (status) {
          case 400:
            apiError.message = data?.message || 'Invalid request data'
            break
          case 401:
            apiError.message = 'Session expired. Please login again.'
            break
          case 403:
            apiError.message = 'You do not have permission to perform this action.'
            break
          case 404:
            apiError.message = 'Resource not found'
            break
          case 422:
            // Enhanced validation error handling
            if (data?.detail && Array.isArray(data.detail)) {
              apiError.message = data.detail
                .map((err: any) => err.msg || err.message || err)
                .join(', ')
            } else if (data?.errors) {
              apiError.message = Object.values(data.errors)
                .flat()
                .join(', ')
            } else {
              apiError.message = data?.message || 'Validation failed. Please check your inputs.'
            }
            apiError.details = data?.detail || data?.errors
            break
          case 429:
            apiError.message = 'Too many requests. Please try again later.'
            break
          case 500:
            apiError.message = 'Server error. Our team has been notified.'
            break
          case 502:
            apiError.message = 'Service temporarily unavailable. Please try again in a moment.'
            break
          case 503:
            apiError.message = 'Service temporarily unavailable due to maintenance.'
            break
          case 504:
            apiError.message = 'Request timeout. Please try again.'
            break
          case 525:
            apiError.message = 'SSL connection error. Please check your connection and try again.'
            break
          default:
            apiError.message = data?.message || data?.detail || `Server error (${status})`
        }
      }
      
      apiError.code = data?.code || `HTTP_${status}`
    } else if (error.request) {
      // Request was made but no response received
      if (!networkMonitor.isNetworkOnline()) {
        apiError.message = 'No internet connection. Please check your network.'
        apiError.code = 'OFFLINE'
      } else if (error.code === 'ECONNABORTED') {
        apiError.message = 'Request timeout. Please try again.'
        apiError.code = 'TIMEOUT'
      } else {
        apiError.message = 'Network error. Please check your connection.'
        apiError.code = 'NETWORK_ERROR'
      }
    } else {
      // Something else happened
      apiError.message = error.message || 'Request failed'
      apiError.code = 'REQUEST_ERROR'
    }

    if (logError) {
      console.error('API Error:', {
        message: apiError.message,
        status: apiError.status,
        code: apiError.code,
        url: error.config?.url,
        method: error.config?.method,
        details: apiError.details,
        circuitBreakerState: circuitBreaker.getState(),
        networkOnline: networkMonitor.isNetworkOnline(),
        originalError: error
      })
    }

    return apiError
  }
}

// Default error handler
const defaultErrorHandler = createErrorHandler()

// Specialized error handlers for different domains
export const workOrderErrorHandler = createErrorHandler({
  customMessages: {
    422: 'Please check your work order details and try again',
    409: 'This work order conflicts with an existing one',
    400: 'Invalid work order data provided'
  },
  retryable: true
})

export const authErrorHandler = createErrorHandler({
  showToast: false, // Handle auth errors differently
  customMessages: {
    401: 'Your session has expired. Please login again.',
    403: 'Access denied. Please contact your administrator.'
  }
})

// Helper function to determine if an error is retryable
const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) return true // Network errors are retryable
  
  const status = error.response.status
  // Retry on server errors but not client errors
  return status >= 500 || status === 408 || status === 429 || status === 502 || status === 503 || status === 504 || status === 525
}

// Enhanced retry function with exponential backoff and jitter
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check circuit breaker
      if (!circuitBreaker.canExecute()) {
        throw new Error('Service temporarily unavailable due to repeated failures')
      }

      // Check network connectivity
      if (!networkMonitor.isNetworkOnline()) {
        throw new Error('No internet connection')
      }

      const result = await requestFn()
      circuitBreaker.onSuccess()
      return result
    } catch (error) {
      lastError = error as Error
      circuitBreaker.onFailure()
      
      // Don't retry on certain status codes
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as ApiError).status
        if (status && [400, 401, 403, 404, 422].includes(status)) {
          throw error
        }
      }
      
      // Don't retry if not a retryable error
      if (error instanceof Error && 'response' in error && !isRetryableError(error as AxiosError)) {
        throw error
      }
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Exponential backoff with jitter and max delay cap
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
      const jitter = Math.random() * 1000
      const delay = exponentialDelay + jitter
      
      console.log(`Retrying request in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (for SSR safety)
    if (typeof window !== 'undefined') {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage)
          if (parsed.state?.token) {
            config.headers.Authorization = `Bearer ${parsed.state.token}`
          }
        } catch (error) {
          console.error('Error parsing auth storage:', error)
        }
      }
    }
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data)
    }
    
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor with enhanced error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    }
    
    return response
  },
  async (error: AxiosError) => {
    const apiError = defaultErrorHandler(error)
    
    // Handle specific error codes that need immediate action
    if (apiError.status === 401 && typeof window !== 'undefined') {
      // Logout user and redirect
      try {
        const { useAuthStore } = await import('@/stores/auth-store')
        useAuthStore.getState().logout()
        window.location.href = '/login'
      } catch (importError) {
        console.error('Failed to import auth store:', importError)
      }
    }
    
    // Show toast for user-facing errors (not 401 as we handle it above)
    if (apiError.status !== 401) {
      toast.error(apiError.message)
    }
    
    // Return rejected promise with our standardized error
    return Promise.reject(apiError)
  }
)

// Utility functions for making requests with specific error handling
export const makeRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  errorHandler?: (error: AxiosError) => ApiError
): Promise<T> => {
  try {
    const response = await requestFn()
    return response.data
  } catch (error) {
    if (errorHandler && error instanceof Error) {
      const apiError = errorHandler(error as AxiosError)
      throw apiError
    }
    throw error
  }
}

// Enhanced request functions with automatic retry
export const makeResilientRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  options: {
    maxRetries?: number
    errorHandler?: (error: AxiosError) => ApiError
    showLoadingToast?: boolean
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    errorHandler = defaultErrorHandler,
    showLoadingToast = false
  } = options

  if (showLoadingToast) {
    toast.loading('Loading...', { id: 'request-loading' })
  }

  try {
    const result = await retryRequest(
      async () => {
        const response = await requestFn()
        return response.data
      },
      maxRetries
    )

    if (showLoadingToast) {
      toast.dismiss('request-loading')
    }

    return result
  } catch (error) {
    if (showLoadingToast) {
      toast.dismiss('request-loading')
    }

    if (errorHandler && error instanceof Error) {
      const apiError = errorHandler(error as AxiosError)
      throw apiError
    }
    throw error
  }
}

// Specialized request functions
export const makeWorkOrderRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>
): Promise<T> => {
  return makeResilientRequest(requestFn, {
    errorHandler: workOrderErrorHandler,
    maxRetries: 2
  })
}

export const makeAuthRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>
): Promise<T> => {
  return makeRequest(requestFn, authErrorHandler)
}

// Cancel token utilities for managing request cancellation
export const createCancelToken = () => {
  const controller = new AbortController()
  return {
    token: controller.signal,
    cancel: (reason?: string) => controller.abort(reason)
  }
}

// Health check utility
export const healthCheck = async (): Promise<boolean> => {
  try {
    await apiClient.get('/health', { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

// Export network monitor for components
export { networkMonitor }

export default apiClient

// Export types for use in other files
export type { ApiError }
