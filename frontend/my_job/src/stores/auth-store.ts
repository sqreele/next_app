// src/stores/auth-store.ts (Complete Fixed Version with Exports)
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { usersAPI, RegisterData, RegisterResponse } from '@/services/users-api'
import { User, LoginCredentials, LoginResponse } from '@/types/user'
import { retryRequest, waitForConnection } from '@/lib/api-client'

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
    return decoded.exp < now
  } catch {
    return true
  }
}

// Utility to check if token will expire soon (within 5 minutes)
function isTokenExpiringSoon(token: string | null): boolean {
  if (!token) return true
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(atob(payload))
    if (!decoded.exp) return false
    const now = Math.floor(Date.now() / 1000)
    const fiveMinutes = 5 * 60
    return decoded.exp < (now + fiveMinutes)
  } catch {
    return true
  }
}

// Export the AuthState interface
export interface AuthState {
  // State
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  userLoading: boolean // NEW: dedicated flag for getCurrentUser
  
  // Private state for preventing race conditions
  _isChecking: boolean
  _lastCheckTime: number
  _refreshAttempts: number
  _lastRefreshAttempt: number
  
  // Actions
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // Auth Actions
  register: (data: RegisterData) => Promise<RegisterResponse>
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  getCurrentUser: () => Promise<void>
  checkAuth: () => Promise<boolean>
  refreshToken: () => Promise<boolean>
  
  // Validation helpers
  checkUsernameAvailability: (username: string) => Promise<boolean>
  checkEmailAvailability: (email: string) => Promise<boolean>
  
  // Utilities
  hasRole: (role: string) => boolean
  isAdmin: () => boolean
  isTechnician: () => boolean
  reset: () => void
  isTokenExpired: () => boolean
  isTokenExpiringSoon: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      userLoading: false, // NEW: initial value
      _isChecking: false,
      _lastCheckTime: 0,
      _refreshAttempts: 0,
      _lastRefreshAttempt: 0,

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

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Registration with proper error handling
      register: async (data) => {
        const state = get()
        if (state.loading) throw new Error('Registration already in progress')
        
        set({ loading: true, error: null })
        try {
          const registerResponse = await retryRequest(
            () => usersAPI.register(data),
            3, // max retries
            1000, // base delay
            5000 // max delay
          )
          
          if (registerResponse.access_token) {
            get().setToken(registerResponse.access_token)
            get().setUser(registerResponse.user)
          }
          
          return registerResponse
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

      // Login with race condition protection
      login: async (credentials) => {
        const state = get()
        if (state.loading) throw new Error('Login already in progress')
        
        set({ loading: true, error: null })
        try {
          // Wait for connection before attempting login
          const isConnected = await waitForConnection(10000)
          if (!isConnected) {
            throw new Error('Unable to connect to server. Please check your connection.')
          }

          const loginResponse: LoginResponse = await retryRequest(
            () => usersAPI.login(credentials),
            3, // max retries
            1000, // base delay
            5000 // max delay
          )
          
          get().setToken(loginResponse.access_token)
          
          // Fetch user data after setting token
          await get().getCurrentUser()
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || 
                             error?.response?.data?.detail ||
                             error?.message || 
                             'Login failed'
          set({ 
            error: errorMessage, 
            token: null, 
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
          isAuthenticated: false, 
          error: null,
          loading: false,
          _isChecking: false,
          _lastCheckTime: 0,
          _refreshAttempts: 0,
          _lastRefreshAttempt: 0
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
      refreshToken: async () => {
        const state = get()
        const now = Date.now()
        
        // Prevent too frequent refresh attempts
        if (now - state._lastRefreshAttempt < 5000) {
          return false
        }
        
        // Limit refresh attempts
        if (state._refreshAttempts >= 3) {
          console.error('Too many refresh attempts, logging out')
          get().logout()
          return false
        }
        
        set({ 
          _refreshAttempts: state._refreshAttempts + 1,
          _lastRefreshAttempt: now
        })
        
        try {
          // Wait for connection before attempting refresh
          const isConnected = await waitForConnection(5000)
          if (!isConnected) {
            throw new Error('No connection to server')
          }

          const refreshResponse = await retryRequest(
            () => usersAPI.refreshToken(),
            2, // max retries for refresh
            2000, // base delay
            8000 // max delay
          )
          
          if (refreshResponse.access_token) {
            get().setToken(refreshResponse.access_token)
            set({ _refreshAttempts: 0 }) // Reset attempts on success
            return true
          }
          
          return false
        } catch (error) {
          console.error('Token refresh failed:', error)
          return false
        }
      },

      // Fixed getCurrentUser to prevent recursive calls
      getCurrentUser: async () => {
        const state = get()
        
        if (!state.token) {
          throw new Error('No token available')
        }

        if (state.userLoading) {
          // Prevent concurrent fetches
          return
        }

        set({ userLoading: true, error: null })
        
        try {
          // Check if token is expired or expiring soon
          if (isTokenExpired(state.token) || isTokenExpiringSoon(state.token)) {
            const refreshSuccess = await get().refreshToken()
            if (!refreshSuccess) {
              throw new Error('Token refresh failed')
            }
          }

          const user = await retryRequest(
            () => usersAPI.getCurrentUser(),
            2, // max retries
            1000, // base delay
            3000 // max delay
          )
          
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
          
          // If unauthorized, logout
          if (error?.response?.status === 401) {
            get().logout()
          }
          throw error
        }
      },

      // Fixed checkAuth with proper race condition handling
      checkAuth: async () => {
        const state = get()
        const now = Date.now()
        
        // Prevent multiple simultaneous checks
        if (state._isChecking) {
          return state.isAuthenticated
        }
        
        // Rate limit checks (max once per 5 seconds)
        if (now - state._lastCheckTime < 5000 && state.isAuthenticated && state.user) {
          return true
        }
        
        // If no token or token expired, definitely not authenticated
        if (!state.token || isTokenExpired(state.token)) {
          get().logout()
          return false
        }

        // If already authenticated with user data and token is valid, skip check
        if (state.isAuthenticated && state.user && !isTokenExpired(state.token)) {
          set({ _lastCheckTime: now })
          return true
        }

        set({ _isChecking: true, _lastCheckTime: now })
        
        try {
          await get().getCurrentUser()
          return true
        } catch (error) {
          console.error('Auth check failed:', error)
          get().logout()
          return false
        } finally {
          set({ _isChecking: false })
        }
      },

      // Validation helpers with error handling
      checkUsernameAvailability: async (username) => {
        try {
          const result = await retryRequest(
            () => usersAPI.checkUsernameAvailability(username),
            2, // max retries
            500, // base delay
            2000 // max delay
          )
          return result.available
        } catch (error) {
          console.error('Error checking username availability:', error)
          return true // Assume available if check fails
        }
      },

      checkEmailAvailability: async (email) => {
        try {
          const result = await retryRequest(
            () => usersAPI.checkEmailAvailability(email),
            2, // max retries
            500, // base delay
            2000 // max delay
          )
          return result.available
        } catch (error) {
          console.error('Error checking email availability:', error)
          return true // Assume available if check fails
        }
      },

      // Utilities
      hasRole: (role) => {
        const { user } = get()
        return user?.profile?.role === role
      },

      isAdmin: () => get().hasRole('Admin'),
      isTechnician: () => get().hasRole('Technician'),

      reset: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          _isChecking: false,
          _lastCheckTime: 0,
          _refreshAttempts: 0,
          _lastRefreshAttempt: 0,
        })
      },

      isTokenExpired: () => isTokenExpired(get().token),
      isTokenExpiringSoon: () => isTokenExpiringSoon(get().token),
    }),
    {
      name: 'auth-storage',
      storage,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Initialize auth on store creation (only on client side)
if (typeof window !== 'undefined') {
  const state = useAuthStore.getState()
  if (state.token) {
    state.setToken(state.token)
  }
}

// Export additional types that might be needed
export type AuthStore = typeof useAuthStore
export type AuthActions = Pick<AuthState, 
  | 'setUser' 
  | 'setToken' 
  | 'login' 
  | 'logout' 
  | 'register' 
  | 'getCurrentUser' 
  | 'checkAuth'
  | 'refreshToken'
>