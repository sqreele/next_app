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
interface CircuitBreakerState {
  failures: number
  lastFailTime: number
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

class CircuitBreaker {
  private states = new Map<string, CircuitBreakerState>()
  private readonly failureThreshold = 5
  private readonly recoverTimeout = 30000 // 30 seconds
  private readonly halfOpenMaxCalls = 3

  getState(endpoint: string): CircuitBreakerState {
    if (!this.states.has(endpoint)) {
      this.states.set(endpoint, {
        failures: 0,
        lastFailTime: 0,
        state: 'CLOSED'
      })
    }
    return this.states.get(endpoint)!
  }

  canExecute(endpoint: string): boolean {
    const state = this.getState(endpoint)
    const now = Date.now()

    switch (state.state) {
      case 'CLOSED':
        return true
      case 'OPEN':
        if (now - state.lastFailTime > this.recoverTimeout) {
          state.state = 'HALF_OPEN'
          state.failures = 0
          return true
        }
        return false
      case 'HALF_OPEN':
        return state.failures < this.halfOpenMaxCalls
    }
  }

  onSuccess(endpoint: string): void {
    const state = this.getState(endpoint)
    state.failures = 0
    state.state = 'CLOSED'
  }

  onFailure(endpoint: string): void {
    const state = this.getState(endpoint)
    state.failures++
    state.lastFailTime = Date.now()

    if (state.state === 'HALF_OPEN' || state.failures >= this.failureThreshold) {
      state.state = 'OPEN'
    }
  }

  getCircuitState(endpoint: string): string {
    return this.getState(endpoint).state
  }
}

const circuitBreaker = new CircuitBreaker()

// Create axios instance with enhanced config
const apiClient: AxiosInstance = axios.create({
  // For Docker setup, use relative URLs (no baseURL needed)
  timeout: 30000, // Increased timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
  // Add retry configuration
  retry: 3,
  retryDelay: (retryNumber: number) => {
    return Math.pow(2, retryNumber) * 1000 // Exponential backoff
  },
})

// Enhanced error handler with specific logic for different scenarios
export const createErrorHandler = (options: {
  showToast?: boolean
  logError?: boolean
  customMessages?: Record<number, string>
  enableRetry?: boolean
} = {}) => {
  const { 
    showToast = true, 
    logError = true, 
    customMessages = {},
    enableRetry = true
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
            apiError.message = 'Server error. Please try again later.'
            break
          case 502:
            apiError.message = 'Service temporarily unavailable. The server is experiencing issues.'
            break
          case 503:
            apiError.message = 'Service unavailable. Please try again in a few moments.'
            break
          case 504:
            apiError.message = 'Request timeout. The server took too long to respond.'
            break
          case 525:
            apiError.message = 'SSL connection error. There may be a configuration issue with the server.'
            break
          default:
            apiError.message = data?.message || data?.detail || `Server error (${status})`
        }
      }
      
      apiError.code = data?.code || `HTTP_${status}`
    } else if (error.request) {
      // Request was made but no response received
      if (error.code === 'ECONNABORTED') {
        apiError.message = 'Request timeout. Please check your connection and try again.'
        apiError.code = 'TIMEOUT'
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        apiError.message = 'Unable to connect to server. Please check your internet connection.'
        apiError.code = 'CONNECTION_ERROR'
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
    400: 'Invalid work order data provided',
    502: 'Work order service is temporarily unavailable',
    525: 'Connection issue with work order service'
  }
})

export const authErrorHandler = createErrorHandler({
  showToast: false, // Handle auth errors differently
  customMessages: {
    401: 'Your session has expired. Please login again.',
    403: 'Access denied. Please contact your administrator.',
    502: 'Authentication service temporarily unavailable',
    525: 'Connection issue with authentication service'
  }
})

export const dashboardErrorHandler = createErrorHandler({
  customMessages: {
    502: 'Dashboard data temporarily unavailable. Using cached data if available.',
    525: 'Connection issue loading dashboard. Retrying automatically.',
    504: 'Dashboard loading timeout. Please refresh the page.'
  }
})

// Request interceptor for adding auth token and circuit breaker
apiClient.interceptors.request.use(
  (config) => {
    // Check circuit breaker before making request
    const endpoint = config.url || 'unknown'
    if (!circuitBreaker.canExecute(endpoint)) {
      const circuitState = circuitBreaker.getCircuitState(endpoint)
      console.warn(`Circuit breaker is ${circuitState} for ${endpoint}`)
      return Promise.reject({
        message: 'Service temporarily unavailable due to repeated failures',
        code: 'CIRCUIT_BREAKER_OPEN',
        status: 503
      })
    }

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

// Response interceptor with enhanced error handling and circuit breaker
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Record success in circuit breaker
    const endpoint = response.config.url || 'unknown'
    circuitBreaker.onSuccess(endpoint)

    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    }
    
    return response
  },
  async (error: AxiosError) => {
    // Record failure in circuit breaker
    const endpoint = error.config?.url || 'unknown'
    const shouldTriggerCircuitBreaker = [502, 503, 504, 525].includes(error.response?.status || 0) || !error.response
    
    if (shouldTriggerCircuitBreaker) {
      circuitBreaker.onFailure(endpoint)
    }

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
      // Don't spam users with too many error toasts for server issues
      if (![502, 503, 504, 525].includes(apiError.status || 0)) {
        toast.error(apiError.message)
      } else {
        // For server errors, show a less alarming message
        toast.warning('Some features may be temporarily unavailable', {
          duration: 3000
        })
      }
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

// Specialized request functions
export const makeWorkOrderRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>
): Promise<T> => {
  return makeRequest(requestFn, workOrderErrorHandler)
}

export const makeAuthRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>
): Promise<T> => {
  return makeRequest(requestFn, authErrorHandler)
}

export const makeDashboardRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>
): Promise<T> => {
  return makeRequest(requestFn, dashboardErrorHandler)
}

// Enhanced request retry utility with exponential backoff
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain status codes or circuit breaker
      if (error && typeof error === 'object') {
        if ('code' in error && error.code === 'CIRCUIT_BREAKER_OPEN') {
          throw error
        }
        if ('status' in error) {
          const status = (error as ApiError).status
          // Don't retry client errors, but do retry server errors
          if (status && [400, 401, 403, 404, 422].includes(status)) {
            throw error
          }
        }
      }
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1) + Math.random() * 1000
      console.log(`Retrying request in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// Health check utility
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health', { timeout: 5000 })
    return response.status === 200
  } catch {
    return false
  }
}

// Request with automatic retry for specific error types
export const requestWithRetry = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  options: {
    maxRetries?: number
    retryCondition?: (error: any) => boolean
    onRetry?: (attempt: number, error: any) => void
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    retryCondition = (error) => {
      // Retry on network errors and 5xx errors
      return !error.response || [502, 503, 504, 525].includes(error.response.status)
    },
    onRetry
  } = options

  return retryRequest(
    async () => {
      const response = await requestFn()
      return response.data
    },
    maxRetries
  )
}

// Cancel token utilities for managing request cancellation
export const createCancelToken = () => {
  const controller = new AbortController()
  return {
    token: controller.signal,
    cancel: (reason?: string) => controller.abort(reason)
  }
}

export default apiClient

// Export types and utilities for use in other files
export type { ApiError }
export { circuitBreaker }
