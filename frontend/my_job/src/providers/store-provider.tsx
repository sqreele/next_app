// src/providers/StoreProvider.tsx
'use client'

import React, { createContext, useContext, useRef, ReactNode } from 'react'
import { createStore, useStore } from 'zustand'
import { AuthState } from '@/stores/auth-store'
import { usersAPI, RegisterData, RegisterResponse } from '@/services/users-api'
import { User, LoginCredentials, LoginResponse } from '@/types/user'

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

// Create store factory functions with complete AuthState implementation
const createAuthStore = (initProps?: Partial<AuthState>) => {
  return createStore<AuthState>()((set, get) => ({
    // Initial state
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
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
      }
    },

    // Fixed getCurrentUser to prevent recursive calls
    getCurrentUser: async () => {
      const state = get()
      
      if (!state.token) {
        throw new Error('No token available')
      }

      if (state.loading) {
        throw new Error('User fetch already in progress')
      }

      set({ loading: true, error: null })
      
      try {
        const user = await usersAPI.getCurrentUser()
        set({ 
          user, 
          isAuthenticated: true,
          loading: false,
          error: null 
        })
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || 
                           error?.message || 
                           'Failed to get user profile'
        
        set({ 
          error: errorMessage,
          loading: false
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

    // Apply any override props
    ...initProps,
  }))
}

type AuthStore = ReturnType<typeof createAuthStore>

const AuthStoreContext = createContext<AuthStore | null>(null)

interface StoreProviderProps {
  children: ReactNode
  authProps?: Partial<AuthState>
}

export const StoreProvider = ({ children, authProps }: StoreProviderProps) => {
  // Fix: Make the ref nullable and provide null as initial value
  const storeRef = useRef<AuthStore | null>(null)
  
  if (!storeRef.current) {
    storeRef.current = createAuthStore(authProps)
  }

  return (
    <AuthStoreContext.Provider value={storeRef.current}>
      {children}
    </AuthStoreContext.Provider>
  )
}

export const useAuthStoreContext = <T,>(selector: (state: AuthState) => T) => {
  const store = useContext(AuthStoreContext)
  if (!store) {
    throw new Error('useAuthStoreContext must be used within StoreProvider')
  }
  return useStore(store, selector)
}

// Utility hook to get the entire store
export const useAuthStoreInstance = () => {
  const store = useContext(AuthStoreContext)
  if (!store) {
    throw new Error('useAuthStoreInstance must be used within StoreProvider')
  }
  return store
}