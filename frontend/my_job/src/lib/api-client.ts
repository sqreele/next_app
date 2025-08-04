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

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  // For Docker setup, use relative URLs (no baseURL needed)
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Enhanced error handler with specific logic for different scenarios
export const createErrorHandler = (options: {
  showToast?: boolean
  logError?: boolean
  customMessages?: Record<number, string>
} = {}) => {
  const { 
    showToast = true, 
    logError = true, 
    customMessages = {} 
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
          default:
            apiError.message = data?.message || data?.detail || `Server error (${status})`
        }
      }
      
      apiError.code = data?.code || `HTTP_${status}`
    } else if (error.request) {
      // Request was made but no response received
      apiError.message = 'Network error. Please check your connection.'
      apiError.code = 'NETWORK_ERROR'
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
    400: 'Invalid work order data provided'
  }
})

export const authErrorHandler = createErrorHandler({
  showToast: false, // Handle auth errors differently
  customMessages: {
    401: 'Your session has expired. Please login again.',
    403: 'Access denied. Please contact your administrator.'
  }
})

// Request interceptor for adding auth token and automatic refresh
apiClient.interceptors.request.use(
  async (config) => {
    // Get token from localStorage (for SSR safety)
    if (typeof window !== 'undefined') {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage)
          if (parsed.state?.token) {
            // Check if token should be refreshed
            const { useAuthStore } = await import('@/stores/auth-store')
            const authStore = useAuthStore.getState()
            
            if (authStore.shouldRefreshToken() && !authStore._isRefreshing) {
              try {
                await authStore.refreshAccessToken()
              } catch (error) {
                console.warn('Failed to refresh token:', error)
              }
            }
            
            // Get the updated token
            const updatedAuthStorage = localStorage.getItem('auth-storage')
            if (updatedAuthStorage) {
              const updatedParsed = JSON.parse(updatedAuthStorage)
              if (updatedParsed.state?.token) {
                config.headers.Authorization = `Bearer ${updatedParsed.state.token}`
              }
            } else {
              config.headers.Authorization = `Bearer ${parsed.state.token}`
            }
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

// Response interceptor with enhanced error handling and automatic token refresh
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
    
    // Handle 401 errors with automatic token refresh
    if (apiError.status === 401 && typeof window !== 'undefined') {
      try {
        const { useAuthStore } = await import('@/stores/auth-store')
        const authStore = useAuthStore.getState()
        
        // Try to refresh token if we have a refresh token
        if (authStore.refreshToken && !authStore._isRefreshing) {
          try {
            const refreshed = await authStore.refreshAccessToken()
            if (refreshed && error.config) {
              // Retry the original request with new token
              const newToken = useAuthStore.getState().token
              if (newToken && error.config.headers) {
                error.config.headers.Authorization = `Bearer ${newToken}`
                return apiClient.request(error.config)
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
          }
        }
        
        // If refresh failed or no refresh token, logout
        console.log('[ResponseInterceptor] 401 received, but no refresh token available. Logging out.')
        authStore.logout()
        window.location.href = '/login'
      } catch (importError) {
        console.error('Failed to import auth store:', importError)
        // Fallback logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage')
          window.location.href = '/login'
        }
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

// Request retry utility with exponential backoff
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain status codes
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as ApiError).status
        if (status && [400, 401, 403, 404, 422].includes(status)) {
          throw error
        }
      }
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
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

export default apiClient

// Export types for use in other files
export type { ApiError }
