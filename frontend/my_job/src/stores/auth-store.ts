// src/stores/auth-store.ts (Complete Fixed Version with Exports)
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { usersAPI, RegisterData, RegisterResponse } from '@/services/users-api'
import { User, LoginCredentials, LoginResponse } from '@/types/user'
import { toast } from 'sonner'

// SSR-safe storage for Zustand persist
const storage = typeof window !== 'undefined'
  ? createJSONStorage(() => window.localStorage)
  : {
      getItem: (_: string) => null,
      setItem: (_: string, __: unknown) => {},
      removeItem: (_: string) => {},
    }

// Utility to check if a JWT token is expired
function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(atob(payload))
    if (!decoded.exp) return false
    const now = Math.floor(Date.now() / 1000)
    // Add a 5-minute buffer to refresh before actual expiry
    return decoded.exp < (now + 300)
  } catch {
    return true
  }
}

// Token refresh utility with retry logic
async function refreshTokenWithRetry(refreshToken: string, maxRetries: number = 3): Promise<LoginResponse> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Token refresh attempt ${attempt}/${maxRetries}`)
      
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Token refresh failed with status ${response.status}:`, errorText)
        
        // Don't retry on 401 - invalid refresh token
        if (response.status === 401) {
          throw new Error('Refresh token expired or invalid')
        }
        
        // For server errors, we can retry
        if (response.status >= 500) {
          throw new Error(`Server error during token refresh: ${response.status}`)
        }
        
        throw new Error(`Token refresh failed: ${response.status}`)
      }

      const data: LoginResponse = await response.json()
      console.log('Token refresh successful')
      return data
      
    } catch (error) {
      lastError = error as Error
      console.error(`Token refresh attempt ${attempt} failed:`, error)
      
      // Don't retry on 401 or if this is the last attempt
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('invalid') || attempt === maxRetries)) {
        throw error
      }
      
      // Exponential backoff for server errors
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        console.log(`Retrying token refresh in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError!
}

// Export the AuthState interface
export interface AuthState {
  // State
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  userLoading: boolean
  
  // Private state for preventing race conditions
  _isChecking: boolean
  _lastCheckTime: number
  _isRefreshing: boolean
  _refreshPromise: Promise<void> | null
  
  // Actions
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setRefreshToken: (refreshToken: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // Auth Actions
  register: (data: RegisterData) => Promise<RegisterResponse>
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  getCurrentUser: () => Promise<void>
  checkAuth: () => Promise<boolean>
  refreshAccessToken: () => Promise<boolean>
  
  // Validation helpers
  checkUsernameAvailability: (username: string) => Promise<boolean>
  checkEmailAvailability: (email: string) => Promise<boolean>
  
  // Utilities
  hasRole: (role: string) => boolean
  isAdmin: () => boolean
  isTechnician: () => boolean
  reset: () => void
  isTokenExpired: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      userLoading: false,
      _isChecking: false,
      _lastCheckTime: 0,
      _isRefreshing: false,
      _refreshPromise: null,

      // Basic setters
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          error: null 
        })
      },

      setToken: (token) => {
        set({ token, isAuthenticated: !!token })
        
        // Update axios default headers safely
        if (typeof window !== 'undefined') {
          import('@/lib/api-client').then(({ default: apiClient }) => {
            if (token) {
              apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
            } else {
              delete apiClient.defaults.headers.common['Authorization']
            }
          }).catch(console.error)
        }
      },

      setRefreshToken: (refreshToken) => {
        set({ refreshToken })
      },

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Register function
      register: async (data: RegisterData): Promise<RegisterResponse> => {
        set({ loading: true, error: null })
        
        try {
          const response = await usersAPI.register(data)
          return response
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || 
                             error?.response?.data?.detail ||
                             error?.message || 
                             'Registration failed'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      // Enhanced login function with refresh token handling
      login: async (credentials: LoginCredentials) => {
        set({ loading: true, error: null })
        
        try {
          const response = await usersAPI.login(credentials)
          
          set({ 
            token: response.access_token,
            refreshToken: response.refresh_token,
            user: response.user,
            isAuthenticated: true,
            error: null 
          })

          // Set axios header
          get().setToken(response.access_token)
          
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || 
                             error?.response?.data?.detail ||
                             error?.message || 
                             'Login failed'
          set({ 
            error: errorMessage, 
            token: null,
            refreshToken: null,
            user: null, 
            isAuthenticated: false 
          })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      logout: () => {
        set({ 
          user: null, 
          token: null,
          refreshToken: null,
          isAuthenticated: false, 
          error: null,
          loading: false,
          _isChecking: false,
          _lastCheckTime: 0,
          _isRefreshing: false,
          _refreshPromise: null
        })
        
        // Clear axios headers
        if (typeof window !== 'undefined') {
          import('@/lib/api-client').then(({ default: apiClient }) => {
            delete apiClient.defaults.headers.common['Authorization']
          }).catch(console.error)
          
          localStorage.removeItem('auth-storage')
        }
      },

      // Enhanced token refresh with retry logic
      refreshAccessToken: async (): Promise<boolean> => {
        const state = get()
        
        // Prevent concurrent refresh attempts
        if (state._isRefreshing && state._refreshPromise) {
          try {
            await state._refreshPromise
            return get().isAuthenticated
          } catch {
            return false
          }
        }

        if (!state.refreshToken) {
          console.log('No refresh token available')
          get().logout()
          return false
        }

        console.log('Access token expired, attempting refresh...')
        set({ _isRefreshing: true })

        const refreshPromise = (async () => {
          try {
            const response = await refreshTokenWithRetry(state.refreshToken!)
            
            set({
              token: response.access_token,
              refreshToken: response.refresh_token || state.refreshToken,
              user: response.user || state.user,
              isAuthenticated: true,
              error: null,
              _isRefreshing: false,
              _refreshPromise: null
            })

            // Update axios header
            get().setToken(response.access_token)
            
            toast.success('Session refreshed successfully')
            return true
            
          } catch (error: any) {
            console.error('Refresh token failed:', error)
            
            // Show user-friendly error message
            if (error.message.includes('invalid') || error.message.includes('401')) {
              toast.error('Session expired. Please login again.')
            } else {
              toast.error('Session refresh failed. Please try again.')
            }
            
            set({ 
              error: 'Session refresh failed',
              _isRefreshing: false,
              _refreshPromise: null
            })
            
            // Only logout on 401/invalid token errors
            if (error.message.includes('invalid') || error.message.includes('401')) {
              get().logout()
            }
            
            return false
          }
        })()

        set({ _refreshPromise: refreshPromise })
        return refreshPromise
      },

      // Fixed getCurrentUser to prevent recursive calls
      getCurrentUser: async () => {
        const state = get()
        
        if (!state.token) {
          throw new Error('No token available')
        }

        // Check if token needs refresh first
        if (isTokenExpired(state.token)) {
          const refreshed = await get().refreshAccessToken()
          if (!refreshed) {
            throw new Error('Unable to refresh token')
          }
        }

        if (state.userLoading) {
          return
        }

        set({ userLoading: true, error: null })
        
        try {
          const user = await usersAPI.getCurrentUser()
          set({ 
            user, 
            isAuthenticated: true,
            userLoading: false,
            error: null 
          })
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || 
                             error?.message || 
                             'Failed to get user profile'
          
          set({ 
            error: errorMessage,
            userLoading: false
          })
          
          // If unauthorized, try to refresh token first
          if (error?.response?.status === 401) {
            const refreshed = await get().refreshAccessToken()
            if (!refreshed) {
              get().logout()
            }
          }
          throw error
        }
      },

      // Enhanced checkAuth with automatic token refresh
      checkAuth: async () => {
        const state = get()
        const now = Date.now()
        
        // Prevent multiple simultaneous checks
        if (state._isChecking) {
          return state.isAuthenticated
        }
        
        // Rate limit checks (max once per 30 seconds)
        if (now - state._lastCheckTime < 30000 && state.isAuthenticated && state.user) {
          return true
        }
        
        set({ _isChecking: true, _lastCheckTime: now })
        
        try {
          // If no token, definitely not authenticated
          if (!state.token) {
            get().logout()
            return false
          }

          // If token is expired, try to refresh
          if (isTokenExpired(state.token)) {
            const refreshed = await get().refreshAccessToken()
            if (!refreshed) {
              return false
            }
          }

          // If we have a valid token but no user data, fetch it
          if (!state.user) {
            try {
              await get().getCurrentUser()
            } catch (error) {
              console.error('Failed to get current user during auth check:', error)
              return false
            }
          }

          return true
          
        } catch (error) {
          console.error('Auth check failed:', error)
          return false
        } finally {
          set({ _isChecking: false })
        }
      },

      // Utility functions
      checkUsernameAvailability: async (username: string) => {
        try {
          const response = await usersAPI.checkUsernameAvailability(username)
          return response.available
        } catch (error) {
          console.error('Username availability check failed:', error)
          return false
        }
      },

      checkEmailAvailability: async (email: string) => {
        try {
          const response = await usersAPI.checkEmailAvailability(email)
          return response.available
        } catch (error) {
          console.error('Email availability check failed:', error)
          return false
        }
      },

      hasRole: (role: string) => {
        const state = get()
        return state.user?.positions?.includes(role) || false
      },

      isAdmin: () => {
        return get().hasRole('Admin')
      },

      isTechnician: () => {
        return get().hasRole('Technician')
      },

      reset: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          userLoading: false,
          _isChecking: false,
          _lastCheckTime: 0,
          _isRefreshing: false,
          _refreshPromise: null
        })
      },

      isTokenExpired: () => {
        const state = get()
        return isTokenExpired(state.token)
      }
    }),
    {
      name: 'auth-storage',
      storage,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Auto-refresh token when store is rehydrated
if (typeof window !== 'undefined') {
  const checkAndRefreshToken = async () => {
    const state = useAuthStore.getState()
    if (state.token && isTokenExpired(state.token) && state.refreshToken) {
      console.log('Token expired on load, attempting refresh...')
      await state.refreshAccessToken()
    }
  }

  // Check token on load
  setTimeout(checkAndRefreshToken, 100)
  
  // Set up periodic token check (every 5 minutes)
  setInterval(() => {
    const state = useAuthStore.getState()
    if (state.isAuthenticated && state.token && isTokenExpired(state.token)) {
      state.refreshAccessToken()
    }
  }, 5 * 60 * 1000)
}