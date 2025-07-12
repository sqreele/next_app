// src/stores/users-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { usersAPI, UsersFilters } from '@/services/users-api'
import { User, CreateUserData } from '@/types/user'

interface UsersState {
  // Data
  users: User[]
  selectedUser: User | null
  filters: UsersFilters
  loading: boolean
  error: string | null
  
  // Stats
  stats: {
    total: number
    active: number
    inactive: number
    byRole: {
      admin: number
      technician: number
      manager: number
      supervisor: number
    }
  }
  
  // Actions
  setUsers: (users: User[]) => void
  addUser: (user: User) => void
  updateUser: (id: number, updates: Partial<User>) => void
  deleteUser: (id: number) => void
  setSelectedUser: (user: User | null) => void
  
  // Filtering & Search
  setFilters: (filters: Partial<UsersFilters>) => void
  clearFilters: () => void
  getFilteredUsers: () => User[]
  
  // Status Management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // API Actions
  fetchUsers: (filters?: UsersFilters) => Promise<void>
  fetchUser: (id: number) => Promise<void>
  createUser: (data: CreateUserData) => Promise<User>
  updateUserData: (id: number, data: Partial<User>) => Promise<void>
  removeUser: (id: number) => Promise<void>
  
  // Utilities
  getUsersByRole: (role: string) => User[]
  getActiveUsers: () => User[]
  getTechnicians: () => User[]
  getAdmins: () => User[]
  
  // Property-based filtering methods
  getUsersByProperty: (property_id: number) => User[]
  getActiveUsersByProperty: (property_id: number) => User[]
  getTechniciansByProperty: (property_id: number) => User[]
  
  updateStats: () => void
  refreshUsers: () => Promise<void>
}

export const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      // Initial state
      users: [],
      selectedUser: null,
      filters: {},
      loading: false,
      error: null,
      stats: {
        total: 0,
        active: 0,
        inactive: 0,
        byRole: {
          admin: 0,
          technician: 0,
          manager: 0,
          supervisor: 0,
        },
      },

      // Basic state management
      setUsers: (users) => {
        set({ users })
        get().updateStats()
      },

      addUser: (user) => {
        set((state) => ({
          users: [user, ...state.users]
        }))
        get().updateStats()
      },

      updateUser: (id, updates) => {
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id ? { ...user, ...updates } : user
          ),
          selectedUser: state.selectedUser?.id === id 
            ? { ...state.selectedUser, ...updates } 
            : state.selectedUser
        }))
        get().updateStats()
      },

      deleteUser: (id) => {
        set((state) => ({
          users: state.users.filter((user) => user.id !== id),
          selectedUser: state.selectedUser?.id === id ? null : state.selectedUser
        }))
        get().updateStats()
      },

      setSelectedUser: (user) => {
        set({ selectedUser: user })
      },

      // Filtering
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters }
        }))
      },

      clearFilters: () => {
        set({ filters: {} })
      },

      getFilteredUsers: () => {
        const { users, filters } = get()
        
        return users.filter((user) => {
          // Role filter
          if (filters.role && user.profile.role !== filters.role) return false
          
          // Active status filter
          if (filters.is_active !== undefined && user.is_active !== filters.is_active) return false
          if (filters.property_id !== undefined && 
              (!user.profile || !user.profile.properties.some(prop => prop.id === filters.property_id))) return false
          
          // Search filter
          if (filters.search) {
            const searchTerm = filters.search.toLowerCase()
            const searchableText = [
              user.username,
              user.email,
              user.profile.role,
              user.profile.position
            ].join(' ').toLowerCase()
            
            if (!searchableText.includes(searchTerm)) return false
          }
          
          return true
        })
      },

      // Status Management
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // API Actions
      fetchUsers: async (filters) => {
        set({ loading: true, error: null })
        
        try {
          console.log('🔍 [UsersStore] fetchUsers called with filters:', filters)
          const users = await usersAPI.getUsers(filters)
          console.log('🔍 [UsersStore] Users loaded from API:', users.map(u => ({
            id: u.id,
            username: u.username,
            profile_role: u.profile?.role,
            is_active: u.is_active
          })))
          get().setUsers(users)
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch users'
          set({ error: errorMessage })
          console.error('Error fetching users:', error)
        } finally {
          set({ loading: false })
        }
      },

      fetchUser: async (id) => {
        set({ loading: true, error: null })
        
        try {
          const user = await usersAPI.getUser(id)
          set({ selectedUser: user })
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch user'
          set({ error: errorMessage })
          console.error('Error fetching user:', error)
        } finally {
          set({ loading: false })
        }
      },

      createUser: async (data) => {
        set({ loading: true, error: null })
        
        try {
          const newUser = await usersAPI.createUser(data)
          get().addUser(newUser)
          return newUser
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create user'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      updateUserData: async (id, data) => {
        set({ loading: true, error: null })
        
        try {
          const updatedUser = await usersAPI.updateUser(id, data)
          get().updateUser(id, updatedUser)
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update user'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      removeUser: async (id) => {
        set({ loading: true, error: null })
        
        try {
          await usersAPI.deleteUser(id)
          get().deleteUser(id)
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete user'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      // Utilities
      getUsersByRole: (role) => {
        const users = get().users.filter(user => user.profile.role === role)
        console.log(`🔍 [UsersStore] getUsersByRole('${role}') called`)
        console.log(`🔍 [UsersStore] All users:`, get().users.map(u => ({
          id: u.id,
          username: u.username,
          profile_role: u.profile.role,
          is_active: u.is_active
        })))
        console.log(`🔍 [UsersStore] Users with role '${role}':`, users.map(u => ({
          id: u.id,
          username: u.username,
          profile_role: u.profile.role,
          is_active: u.is_active
        })))
        return users
      },

      getActiveUsers: () => {
        return get().users.filter(user => user.is_active)
      },

      getTechnicians: () => {
        return get().getUsersByRole('Technician')
      },

      getAdmins: () => {
        return get().getUsersByRole('Admin')
      },

      // Property-based filtering methods
      getUsersByProperty: (property_id) => {
        return get().users.filter(user => 
          user.profile && user.profile.properties.some(prop => prop.id === property_id)
        )
      },

      getActiveUsersByProperty: (property_id) => {
        return get().users.filter(user => 
          user.is_active && user.profile && user.profile.properties.some(prop => prop.id === property_id)
        )
      },

      getTechniciansByProperty: (property_id) => {
        return get().users.filter(user => 
          user.profile.role === 'Technician' && 
          user.is_active && 
          user.profile && user.profile.properties.some(prop => prop.id === property_id)
        )
      },

      updateStats: () => {
        const { users } = get()
        
        const stats = {
          total: users.length,
          active: users.filter(u => u.is_active).length,
          inactive: users.filter(u => !u.is_active).length,
          byRole: {
            admin: users.filter(u => u.profile.role === 'Admin').length,
            technician: users.filter(u => u.profile.role === 'Technician').length,
            manager: users.filter(u => u.profile.role === 'Manager').length,
            supervisor: users.filter(u => u.profile.role === 'Supervisor').length,
          },
        }
        
        set({ stats })
      },

      refreshUsers: async () => {
        const { filters } = get()
        await get().fetchUsers(filters)
      },
    }),
    {
      name: 'users-storage',
      partialize: (state) => ({
        users: state.users,
        filters: state.filters,
      }),
    }
  )
)