// frontend/my_job/src/lib/api-client.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { toast } from 'sonner'

// Enhanced error types for better type safety
interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
  retryable?: boolean
}

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  // For Docker setup, use relative URLs (no baseURL needed)
  timeout: 30000, // Increased timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
  // Add retry configuration
  validateStatus: (status) => {
    // Don't throw on 401, 403, 404, 422 - let the interceptor handle them
    return status < 500
  }
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
    retryable = true
  } = options

  return (error: AxiosError): ApiError => {
    let apiError: ApiError = {
      message: 'An unexpected error occurred',
      status: 0,
      retryable: retryable
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
            apiError.retryable = false
            break
          case 401:
            apiError.message = 'Session expired. Please login again.'
            apiError.retryable = false
            break
          case 403:
            apiError.message = 'You do not have permission to perform this action.'
            apiError.retryable = false
            break
          case 404:
            apiError.message = 'Resource not found'
            apiError.retryable = false
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
            apiError.retryable = false
            break
          case 429:
            apiError.message = 'Too many requests. Please try again later.'
            apiError.retryable = true
            break
          case 500:
            apiError.message = 'Server error. Please try again later.'
            apiError.retryable = true
            break
          case 502:
            apiError.message = 'Service temporarily unavailable. Please try again.'
            apiError.retryable = true
            break
          case 503:
            apiError.message = 'Service temporarily unavailable. Please try again.'
            apiError.retryable = true
            break
          case 504:
            apiError.message = 'Request timeout. Please try again.'
            apiError.retryable = true
            break
          case 525:
            apiError.message = 'SSL connection failed. Please check your connection and try again.'
            apiError.retryable = true
            break
          default:
            apiError.message = data?.message || data?.detail || `Server error (${status})`
            apiError.retryable = status >= 500
        }
      }
      
      apiError.code = data?.code || `HTTP_${status}`
    } else if (error.request) {
      // Request was made but no response received
      apiError.message = 'Network error. Please check your connection and try again.'
      apiError.code = 'NETWORK_ERROR'
      apiError.retryable = true
    } else {
      // Something else happened
      apiError.message = error.message || 'Request failed'
      apiError.code = 'REQUEST_ERROR'
      apiError.retryable = false
    }

    if (logError) {
      console.error('API Error:', {
        message: apiError.message,
        status: apiError.status,
        code: apiError.code,
        retryable: apiError.retryable,
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
    400: 'Invalid work order data provided'
  }
})

export const authErrorHandler = createErrorHandler({
  showToast: false, // Handle auth errors differently
  retryable: false,
  customMessages: {
    401: 'Your session has expired. Please login again.',
    403: 'Access denied. Please contact your administrator.'
  }
})

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
    if (apiError.status !== 401 && apiError.status !== 403) {
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

// Enhanced request retry utility with exponential backoff and circuit breaker
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> => {
  let lastError: Error
  let consecutiveFailures = 0

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await requestFn()
      // Reset consecutive failures on success
      consecutiveFailures = 0
      return result
    } catch (error) {
      lastError = error as Error
      consecutiveFailures++
      
      // Don't retry on certain status codes
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as ApiError).status
        if (status && [400, 401, 403, 404, 422].includes(status)) {
          throw error
        }
      }
      
      // Circuit breaker: if too many consecutive failures, stop retrying
      if (consecutiveFailures >= 5) {
        console.error('Circuit breaker activated - too many consecutive failures')
        throw new Error('Service temporarily unavailable due to repeated failures')
      }
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Exponential backoff with jitter and max delay
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelay
      )
      
      console.log(`Retry attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
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
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health', { timeout: 5000 })
    return response.status === 200
  } catch (error) {
    console.error('API health check failed:', error)
    return false
  }
}

// Connection recovery utility
export const waitForConnection = async (maxWaitTime: number = 30000): Promise<boolean> => {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitTime) {
    if (await checkApiHealth()) {
      return true
    }
    
    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  return false
}

export default apiClient

// Export types for use in other files
export type { ApiError }
