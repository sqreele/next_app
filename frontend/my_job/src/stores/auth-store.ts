// src/stores/auth-store.ts (Updated with registration)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { usersAPI, RegisterData, RegisterResponse } from '@/services/users-api'
import { User, LoginCredentials, LoginResponse } from '@/types/user'

interface AuthState {
  // State
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  
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
  
  // Validation helpers
  checkUsernameAvailability: (username: string) => Promise<boolean>
  checkEmailAvailability: (email: string) => Promise<boolean>
  
  // Utilities
  hasRole: (role: string) => boolean
  isAdmin: () => boolean
  isTechnician: () => boolean
  reset: () => void
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

      // Basic setters
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        })
      },

      setToken: (token) => {
        set({ token, isAuthenticated: !!token })
        
        // Update axios default headers
        if (token) {
          // Dynamically import to avoid SSR issues
          import('@/lib/api-client').then(({ default: apiClient }) => {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
          })
        } else {
          import('@/lib/api-client').then(({ default: apiClient }) => {
            delete apiClient.defaults.headers.common['Authorization']
          })
        }
      },

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Registration
      register: async (data) => {
        set({ loading: true, error: null })
        
        try {
          const registerResponse = await usersAPI.register(data)
          
          // If registration includes auto-login token
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

      // Auth actions
      login: async (credentials) => {
        set({ loading: true, error: null })
        
        try {
          const loginResponse: LoginResponse = await usersAPI.login(credentials)
          
          get().setToken(loginResponse.access_token)
          
          // Get user profile after successful login
          await get().getCurrentUser()
          
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || 
                             error?.response?.data?.detail ||
                             error?.message || 
                             'Login failed'
          set({ error: errorMessage, token: null, user: null, isAuthenticated: false })
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
          error: null 
        })
        
        // Clear axios headers
        import('@/lib/api-client').then(({ default: apiClient }) => {
          delete apiClient.defaults.headers.common['Authorization']
        })
        
        // Clear localStorage
        localStorage.removeItem('auth-storage')
      },

      getCurrentUser: async () => {
        const { token } = get()
        if (!token) {
          throw new Error('No token available')
        }

        set({ loading: true, error: null })
        
        try {
          const user = await usersAPI.getCurrentUser()
          get().setUser(user)
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || 
                             error?.message || 
                             'Failed to get user profile'
          set({ error: errorMessage })
          
          // If unauthorized, logout
          if (error?.response?.status === 401) {
            get().logout()
          }
          
          throw error
        } finally {
          set({ loading: false })
        }
      },

      checkAuth: async () => {
        const { token } = get()
        if (!token) {
          return false
        }

        try {
          await get().getCurrentUser()
          return true
        } catch (error) {
          get().logout()
          return false
        }
      },

      // Validation helpers
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
          isAuthenticated: false,
          loading: false,
          error: null,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Initialize auth on store creation
useAuthStore.getState().setToken(useAuthStore.getState().token)
