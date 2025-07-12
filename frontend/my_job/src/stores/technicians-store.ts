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
          // First ensure users are loaded
          const usersStore = useUsersStore.getState()
          if (usersStore.users.length === 0) {
            console.log('🔍 [TechnicianStore] No users loaded, fetching users first...')
            await usersStore.fetchUsers()
          }
          
          // Get technicians from users store
          const users = usersStore.getUsersByRole('Technician')
          console.log('🔍 [TechnicianStore] Users with Technician role:', users)
          console.log('🔍 [TechnicianStore] Users structure:', users.map(u => ({
            id: u.id,
            username: u.username,
            profile: u.profile,
            is_active: u.is_active
          })))
          
          const technicians = users.map(user => ({
            ...user,
            available: true,
            skills: [],
          })) as Technician[]
          
          console.log('🔍 [TechnicianStore] Created technicians:', technicians.map(t => ({
            id: t.id,
            username: t.username,
            profile: t.profile,
            is_active: t.is_active,
            available: t.available
          })))
          
          set({ technicians })
        } catch (error: any) {
          console.error('❌ [TechnicianStore] Error fetching technicians:', error)
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

      getAvailableTechnicians: () => {
        const available = get().technicians.filter((tech) => tech.available && tech.is_active)
        console.log('🔍 [TechnicianStore] getAvailableTechnicians called')
        console.log('🔍 [TechnicianStore] All technicians:', get().technicians.map(t => ({
          id: t.id,
          username: t.username,
          available: t.available,
          is_active: t.is_active
        })))
        console.log('🔍 [TechnicianStore] Available technicians:', available.map(t => ({
          id: t.id,
          username: t.username,
          available: t.available,
          is_active: t.is_active
        })))
        return available
      },
      
      getTechnicianById: (id) =>
        get().technicians.find((tech) => tech.id === id),
    }),
    {
      name: 'technicians-storage',
      partialize: (state) => ({ technicians: state.technicians }),
    }
  )
)
