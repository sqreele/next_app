// src/stores/auth-store.ts (Complete Fixed Version with Exports)
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { usersAPI, RegisterData, RegisterResponse } from '@/services/users-api'
import { User, LoginCredentials, LoginResponse } from '@/types/user'

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
function getTokenExpiration(token: string | null): number | null {
  if (!token) return null
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(atob(payload))
    return decoded.exp ? decoded.exp * 1000 : null // Convert to milliseconds
  } catch {
    return null
  }
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
  userLoading: boolean // NEW: dedicated flag for getCurrentUser
  tokenExpiry: number | null
  
  // Private state for preventing race conditions
  _isChecking: boolean
  _lastCheckTime: number
  _isRefreshing: boolean
  
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
  shouldRefreshToken: () => boolean
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
      userLoading: false, // NEW: initial value
      tokenExpiry: null,
      _isChecking: false,
      _lastCheckTime: 0,
      _isRefreshing: false,

      // Basic setters
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          error: null 
        })
      },

      setToken: (token) => {
        const tokenExpiry = getTokenExpiration(token)
        set({ 
          token, 
          isAuthenticated: !!token,
          tokenExpiry 
        })
        
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

      // Registration with proper error handling
      register: async (data) => {
        const state = get()
        if (state.loading) throw new Error('Registration already in progress')
        
        set({ loading: true, error: null })
        try {
          const registerResponse = await usersAPI.register(data)
          
          if (registerResponse.access_token) {
            get().setToken(registerResponse.access_token)
            if (registerResponse.refresh_token) {
              get().setRefreshToken(registerResponse.refresh_token)
            }
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
          get().setRefreshToken(loginResponse.refresh_token)
          
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
            refreshToken: null,
            user: null, 
            isAuthenticated: false 
          })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      logout: async () => {
        const state = get()
        
        // Try to logout on server if we have a token
        if (state.token) {
          try {
            await usersAPI.logout()
          } catch (error) {
            console.warn('Server logout failed:', error)
          }
        }
        
        set({ 
          user: null, 
          token: null, 
          refreshToken: null,
          isAuthenticated: false, 
          error: null,
          loading: false,
          tokenExpiry: null,
          _isChecking: false,
          _lastCheckTime: 0,
          _isRefreshing: false
        })
        
        // Clear axios headers
        if (typeof window !== 'undefined') {
          import('@/lib/api-client').then(({ default: apiClient }) => {
            delete apiClient.defaults.headers.common['Authorization']
          }).catch(console.error)
          
          localStorage.removeItem('auth-storage')
        }
      },

      // Refresh access token
      refreshAccessToken: async () => {
        const state = get()
        
        if (!state.refreshToken || state._isRefreshing) {
          return false
        }
        
        if (isTokenExpired(state.refreshToken)) {
          get().logout()
          return false
        }
        
        set({ _isRefreshing: true, error: null })
        
        try {
          const refreshResponse = await usersAPI.refreshToken(state.refreshToken)
          get().setToken(refreshResponse.access_token)
          return true
        } catch (error: any) {
          console.error('Token refresh failed:', error)
          get().logout()
          return false
        } finally {
          set({ _isRefreshing: false })
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
        
        // If no token or token expired, try to refresh
        if (!state.token || isTokenExpired(state.token)) {
          if (state.refreshToken && !isTokenExpired(state.refreshToken)) {
            const refreshed = await get().refreshAccessToken()
            if (refreshed) {
              // Token was refreshed, now get user data
              try {
                await get().getCurrentUser()
                return true
              } catch (error) {
                console.error('Failed to get user after token refresh:', error)
                get().logout()
                return false
              }
            }
          }
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
          refreshToken: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          tokenExpiry: null,
          _isChecking: false,
          _lastCheckTime: 0,
          _isRefreshing: false,
        })
      },

      isTokenExpired: () => isTokenExpired(get().token),
      
      shouldRefreshToken: () => {
        const state = get()
        if (!state.token || !state.tokenExpiry) return false
        
        // Refresh token if it expires in the next 5 minutes
        const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000)
        return state.tokenExpiry < fiveMinutesFromNow
      },
    }),
    {
      name: 'auth-storage',
      storage,
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        tokenExpiry: state.tokenExpiry,
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
  | 'setRefreshToken'
  | 'login' 
  | 'logout' 
  | 'register' 
  | 'getCurrentUser' 
  | 'checkAuth'
  | 'refreshAccessToken'
>