// src/lib/api-client.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { toast } from 'sonner'

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
          // Unauthorized - redirect to login
          localStorage.removeItem('auth-token')
          window.location.href = '/login'
          toast.error('Session expired. Please login again.')
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
          const validationErrors = data.errors || data.message
          if (typeof validationErrors === 'object') {
            Object.values(validationErrors).forEach((error: any) => {
              toast.error(error)
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
          toast.error(data.message || 'An unexpected error occurred.')
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
