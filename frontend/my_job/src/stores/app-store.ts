// src/stores/app-store.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface AppState {
  // UI State
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  currentPage: string
  
  // User state
  user: {
    id: number
    name: string
    email: string
    role: string
    avatar?: string
  } | null
  
  // Global loading states
  globalLoading: boolean
  
  // Actions
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setCurrentPage: (page: string) => void
  setUser: (user: AppState['user']) => void
  setGlobalLoading: (loading: boolean) => void
  
  // Initialization
  initializeApp: () => Promise<void>
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    sidebarOpen: false,
    theme: 'system',
    currentPage: '/',
    user: null,
    globalLoading: false,

    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setTheme: (theme) => set({ theme }),
    setCurrentPage: (page) => set({ currentPage: page }),
    setUser: (user) => set({ user }),
    setGlobalLoading: (loading) => set({ globalLoading: loading }),

    initializeApp: async () => {
      set({ globalLoading: true })
      
      try {
        // Initialize all stores
        const { useWorkOrderStore } = await import('./work-orders-store')
        const { useMachineStore } = await import('./machines-store')
        const { useTechnicianStore } = await import('./technicians-store')
        const { useRoomStore } = await import('./rooms-store')
        
        // Fetch initial data
        await Promise.all([
          useWorkOrderStore.getState().fetchWorkOrders(),
          useMachineStore.getState().fetchMachines(),
          useTechnicianStore.getState().fetchTechnicians(),
          useRoomStore.getState().fetchRooms(),
        ])
      } catch (error) {
        console.error('Failed to initialize app:', error)
      } finally {
        set({ globalLoading: false })
      }
    },
  }))
)
