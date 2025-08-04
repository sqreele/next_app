// src/config/api-config.ts

// API Configuration to ensure we never use external domains
export const API_CONFIG = {
  // Base URL - always use relative URLs for local development
  BASE_URL: '',
  
  // API endpoints
  ENDPOINTS: {
    // Properties
    PROPERTIES: '/api/v1/properties',
    
    // Work Orders (Jobs)
    WORK_ORDERS: '/api/v1/work_orders',
    JOBS: '/api/v1/jobs', // Alias for work orders
    
    // Users
    USERS: '/api/v1/users',
    AUTH: '/api/v1/auth',
    
    // Machines
    MACHINES: '/api/v1/machines',
    
    // Rooms
    ROOMS: '/api/v1/rooms',
    
    // Topics
    TOPICS: '/api/v1/topics',
    
    // Uploads
    UPLOADS: '/uploads',
    
    // WebSocket
    WEBSOCKET: 'ws://localhost:3001',
  },
  
  // Timeout settings
  TIMEOUT: 10000,
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  
  // Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
  
  // Error handling
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    TIMEOUT_ERROR: 'Request timeout. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    UNAUTHORIZED: 'Session expired. Please login again.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'Resource not found.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    EXTERNAL_DOMAIN_ERROR: 'External domain requests are not allowed.',
  },
}

// Utility function to ensure URLs are relative
export const ensureRelativeUrl = (url: string): string => {
  if (!url) return url
  
  // If it's already a relative URL, return as is
  if (url.startsWith('/')) return url
  
  // If it's an external URL, convert to relative
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname + urlObj.search
    } catch (error) {
      console.error('Error parsing URL:', url, error)
      return url
    }
  }
  
  return url
}

// Utility function to build API URLs
export const buildApiUrl = (endpoint: string, params?: Record<string, any>): string => {
  let url = ensureRelativeUrl(endpoint)
  
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }
  
  return url
}

// Utility function to validate API responses
export const validateApiResponse = (response: any): boolean => {
  return response && typeof response === 'object'
}

// Export default configuration
export default API_CONFIG