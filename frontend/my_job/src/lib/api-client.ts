// src/lib/api-client.ts (Updated for Docker setup)
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { toast } from 'sonner'

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  // Use relative URLs since nginx should proxy API requests
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
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
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data)
    }
    
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    }
    
    return response
  },
  (error) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // Unauthorized - logout user
          if (typeof window !== 'undefined') {
            // Dynamically import to avoid circular dependency
            import('@/stores/auth-store').then(({ useAuthStore }) => {
              useAuthStore.getState().logout()
            })
            toast.error('Session expired. Please login again.')
            // Redirect to login page
            window.location.href = '/login'
          }
          break
          
        case 403:
          // Forbidden
          toast.error('You do not have permission to perform this action.')
          break
          
        case 404:
          // Not found
          toast.error('Resource not found.')
          break
          
        case 422:
          // Validation error
          const validationErrors = data.errors || data.detail || data.message
          if (typeof validationErrors === 'object' && Array.isArray(validationErrors)) {
            validationErrors.forEach((error: any) => {
              toast.error(error.msg || error.message || error)
            })
          } else if (typeof validationErrors === 'object') {
            Object.values(validationErrors).forEach((error: any) => {
              toast.error(Array.isArray(error) ? error[0] : error)
            })
          } else {
            toast.error(validationErrors || 'Validation error')
          }
          break
          
        case 500:
          // Server error
          toast.error('Server error. Please try again later.')
          break
          
        default:
          toast.error(data.message || data.detail || 'An unexpected error occurred.')
      }
    } else if (error.request) {
      // Request was made but no response received
      toast.error('Network error. Please check your connection.')
    } else {
      // Something else happened
      toast.error('An unexpected error occurred.')
    }
    
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export default apiClient
