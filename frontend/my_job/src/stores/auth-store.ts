// src/stores/auth-store.ts (Complete Fixed Version with Exports)
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { usersAPI, RegisterData, RegisterResponse } from '@/services/users-api'
import { User, LoginCredentials, LoginResponse } from '@/types/user'
import { authAPI } from '@/services/auth-api'

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

// Utility to get token expiration time
function getTokenExpirationTime(token: string | null): number | null {
  if (!token) return null
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(atob(payload))
    return decoded.exp ? decoded.exp * 1000 : null // Convert to milliseconds
  } catch {
    return null
  }
}

// Utility to get time until token expires (in milliseconds)
function getTimeUntilExpiration(token: string | null): number {
  const expTime = getTokenExpirationTime(token)
  if (!expTime) return 0
  return Math.max(0, expTime - Date.now())
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
  setupTokenRefresh: () => void
  
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
      isAuthenticated: false,
      loading: false,
      error: null,
      userLoading: false, // NEW: initial value
      _isChecking: false,
      _lastCheckTime: 0,

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
        
        // Set up proactive token refresh
        if (token && typeof window !== 'undefined') {
          get().setupTokenRefresh()
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
          const registerResponse = await usersAPI.register(data)
          
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
          const loginResponse: LoginResponse = await usersAPI.login(credentials)
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
          _lastCheckTime: 0
        })
        
        // Clear axios headers
        if (typeof window !== 'undefined') {
          import('@/lib/api-client').then(({ default: apiClient }) => {
            delete apiClient.defaults.headers.common['Authorization']
          }).catch(console.error)
          
          localStorage.removeItem('auth-storage')
          
          // Clear token refresh timer
          if ((window as any).tokenRefreshTimer) {
            clearTimeout((window as any).tokenRefreshTimer)
            delete (window as any).tokenRefreshTimer
          }
        }
      },

      // NEW: Refresh token method
      refreshToken: async () => {
        const state = get()
        
        if (!state.token) {
          console.error('No token available for refresh')
          return false
        }

        try {
          const response = await authAPI.refreshToken()
          const { access_token } = response
          
          if (access_token) {
            get().setToken(access_token)
            console.log('Token refreshed successfully')
            return true
          } else {
            console.error('No access token received from refresh')
            return false
          }
        } catch (error: any) {
          console.error('Token refresh failed:', error)
          // If refresh fails, logout the user
          get().logout()
          return false
        }
      },

      // NEW: Setup proactive token refresh
      setupTokenRefresh: () => {
        const state = get()
        
        if (!state.token || typeof window === 'undefined') {
          return
        }

        // Clear any existing timer
        if ((window as any).tokenRefreshTimer) {
          clearTimeout((window as any).tokenRefreshTimer)
        }

        const timeUntilExpiration = getTimeUntilExpiration(state.token)
        
        console.log(`Token expires in ${Math.round(timeUntilExpiration / 1000 / 60)} minutes`)
        
        // If token expires in less than 5 minutes, refresh it now
        if (timeUntilExpiration < 5 * 60 * 1000) {
          console.log('Token expires soon, refreshing now...')
          get().refreshToken()
          return
        }

        // Set up refresh 5 minutes before expiration
        const refreshTime = timeUntilExpiration - (5 * 60 * 1000)
        
        if (refreshTime > 0) {
          console.log(`Setting up token refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`)
          (window as any).tokenRefreshTimer = setTimeout(() => {
            console.log('Proactive token refresh triggered')
            get().refreshToken()
          }, refreshTime)
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
          const result = await usersAPI.checkUsernameAvailability(username)
          return result.available
        } catch (error) {
          console.error('Error checking username availability:', error)
          return true // Assume available if check fails
        }
      },

      checkEmailAvailability: async (email) => {
        try {
          const result = await usersAPI.checkEmailAvailability(email)
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
        })
      },

      isTokenExpired: () => isTokenExpired(get().token),
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
    // Set up token refresh for existing token
    state.setupTokenRefresh()
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
>