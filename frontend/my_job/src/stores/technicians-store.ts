// src/stores/technicians-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUsersStore } from './users-store'
import { User } from '@/types/user'

export interface Technician extends User {
  // Additional technician-specific properties
  skills?: string[]
  available?: boolean
  current_assignment?: string
}

interface TechnicianState {
  technicians: Technician[]
  loading: boolean
  error: string | null
  
  // Actions
  setTechnicians: (technicians: Technician[]) => void
  addTechnician: (technician: Technician) => void
  updateTechnician: (id: number, updates: Partial<Technician>) => void
  deleteTechnician: (id: number) => void
  
  // API Actions
  fetchTechnicians: () => Promise<void>
  createTechnician: (data: any) => Promise<Technician>
  
  // Utilities
  getAvailableTechnicians: () => Technician[]
  getTechnicianById: (id: number) => Technician | undefined
}

export const useTechnicianStore = create<TechnicianState>()(
  persist(
    (set, get) => ({
      technicians: [],
      loading: false,
      error: null,

      setTechnicians: (technicians) => set({ technicians }),
      
      addTechnician: (technician) => 
        set((state) => ({ technicians: [...state.technicians, technician] })),
      
      updateTechnician: (id, updates) =>
        set((state) => ({
          technicians: state.technicians.map((tech) =>
            tech.id === id ? { ...tech, ...updates } : tech
          ),
        })),
      
      deleteTechnician: (id) =>
        set((state) => ({
          technicians: state.technicians.filter((tech) => tech.id !== id),
        })),

      fetchTechnicians: async () => {
        set({ loading: true, error: null })
        try {
          // Get technicians from users store
          const users = useUsersStore.getState().getUsersByRole('Technician')
          const technicians = users.map(user => ({
            ...user,
            available: true,
            skills: [],
          })) as Technician[]
          
          set({ technicians })
        } catch (error: any) {
          set({ error: error.message })
        } finally {
          set({ loading: false })
        }
      },

      createTechnician: async (data) => {
        set({ loading: true, error: null })
        try {
          // Create user with technician role
          const userData = {
            ...data,
            profile: {
              ...data.profile,
              role: 'Technician' as const
            }
          }
          
          const newUser = await useUsersStore.getState().createUser(userData)
          const newTechnician = {
            ...newUser,
            available: true,
            skills: data.skills || [],
          } as Technician
          
          get().addTechnician(newTechnician)
          return newTechnician
        } catch (error: any) {
          set({ error: error.message })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      getAvailableTechnicians: () =>
        get().technicians.filter((tech) => tech.available && tech.is_active),
      
      getTechnicianById: (id) =>
        get().technicians.find((tech) => tech.id === id),
    }),
    {
      name: 'technicians-storage',
      partialize: (state) => ({ technicians: state.technicians }),
    }
  )
)
