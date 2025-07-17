// src/stores/machines-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { machinesAPI, Machine, CreateMachineData, MachineFilters } from '@/services/machines-api'

interface MachineState {
  // Data
  machines: Machine[]
  selectedMachine: Machine | null
  filters: MachineFilters
  loading: boolean
  error: string | null
  
  // Statistics
  stats: {
    total: number
    operational: number
    maintenance: number
    offline: number
    decommissioned: number
  }
  
  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
  }
  
  // Actions
  setMachines: (machines: Machine[]) => void
  addMachine: (machine: Machine) => void
  updateMachine: (id: number, updates: Partial<Machine>) => void
  deleteMachine: (id: number) => void
  setSelectedMachine: (machine: Machine | null) => void
  
  // Filtering & Search
  setFilters: (filters: Partial<MachineFilters>) => void
  clearFilters: () => void
  getFilteredMachines: () => Machine[]
  
  // Pagination
  setPagination: (pagination: Partial<MachineState['pagination']>) => void
  
  // Status Management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // API Actions
  fetchMachines: (filters?: MachineFilters) => Promise<void>
  fetchMachinesByProperty: (property_id: number) => Promise<void>
  fetchMachine: (id: number) => Promise<void>
  createMachine: (data: CreateMachineData) => Promise<Machine>
  updateMachineData: (id: number, data: Partial<Machine>) => Promise<void>
  removeMachine: (id: number) => Promise<void>
  updateMachineStatus: (id: number, status: Machine['status']) => Promise<void>
  
  // Utilities
  getOperationalMachines: () => Machine[]
  getMachinesByStatus: (status: Machine['status']) => Machine[]
  getMachinesByRoom: (room_id: number) => Machine[]
  getMachinesByProperty: (property_id: number) => Machine[]
  refreshMachines: () => Promise<void>
  calculateStats: () => void
}

export const useMachineStore = create<MachineState>()(
  persist(
    (set, get) => ({
      // Initial state
      machines: [],
      selectedMachine: null,
      filters: {},
      loading: false,
      error: null,
      stats: {
        total: 0,
        operational: 0,
        maintenance: 0,
        offline: 0,
        decommissioned: 0,
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },

      // Basic state management
      setMachines: (machines) => {
        set({ machines })
        get().calculateStats()
      },

      addMachine: (machine) => {
        set((state) => ({
          machines: [machine, ...state.machines],
          pagination: {
            ...state.pagination,
            total: state.pagination.total + 1
          }
        }))
        get().calculateStats()
      },

      updateMachine: (id, updates) => {
        set((state) => ({
          machines: state.machines.map((machine) =>
            machine.id === id ? { ...machine, ...updates } : machine
          ),
          selectedMachine: state.selectedMachine?.id === id 
            ? { ...state.selectedMachine, ...updates } 
            : state.selectedMachine
        }))
        get().calculateStats()
      },

      deleteMachine: (id) => {
        set((state) => ({
          machines: state.machines.filter((machine) => machine.id !== id),
          selectedMachine: state.selectedMachine?.id === id ? null : state.selectedMachine,
          pagination: {
            ...state.pagination,
            total: Math.max(0, state.pagination.total - 1)
          }
        }))
        get().calculateStats()
      },

      setSelectedMachine: (machine) => {
        set({ selectedMachine: machine })
      },

      // Filtering
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          pagination: { ...state.pagination, page: 1 } // Reset to first page when filtering
        }))
      },

      clearFilters: () => {
        set({ 
          filters: {},
          pagination: { ...get().pagination, page: 1 }
        })
      },

      getFilteredMachines: () => {
        const { machines, filters } = get()
        
        return machines.filter((machine) => {
          // Status filter
          if (filters.status && machine.status !== filters.status) return false
          
          // Room filter
          if (filters.room_id && machine.room_id !== filters.room_id) return false
          
          // Property filter
          if (filters.property_id && machine.property_id !== filters.property_id) return false
          
          // Type filter
          if (filters.type === 'pm' && !machine.has_pm) return false
          if (filters.type === 'issue' && !machine.has_issue) return false

          // Search filter
          if (filters.search) {
            const searchTerm = filters.search.toLowerCase()
            const searchableText = machine.name.toLowerCase()
            
            if (!searchableText.includes(searchTerm)) return false
          }
          
          return true
        })
      },

      // Pagination
      setPagination: (newPagination) => {
        set((state) => ({
          pagination: { ...state.pagination, ...newPagination }
        }))
      },

      // Loading & Error states
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // API Actions using Axios
      fetchMachines: async (filters) => {
        set({ loading: true, error: null })
        
        try {
          const { pagination } = get()
          const queryFilters = {
            ...filters,
            page: pagination.page,
            limit: pagination.limit,
          }
          
          const machines = await machinesAPI.getMachines(queryFilters)
          
          set({ 
            machines,
            pagination: {
              ...pagination,
              total: machines.length, // API doesn't return total, so use array length
            }
          })
          get().calculateStats()
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch machines'
          set({ error: errorMessage })
          console.error('Error fetching machines:', error)
        } finally {
          set({ loading: false })
        }
      },

      fetchMachinesByProperty: async (property_id) => {
        set({ loading: true, error: null })
        
        try {
          const machines = await machinesAPI.getMachinesByProperty(property_id)
          set({ machines })
          get().calculateStats()
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch machines by property'
          set({ error: errorMessage })
          console.error('Error fetching machines by property:', error)
        } finally {
          set({ loading: false })
        }
      },

      fetchMachine: async (id) => {
  set({ loading: true, error: null, selectedMachine: null })
  
  try {
    console.log(`Fetching machine with ID: ${id}`)
    const response = await machinesAPI.getMachine(id)
    console.log('Machine API response:', response)
    
    if (response?.data) {
      set({ selectedMachine: response.data })
    } else {
      set({ error: 'Machine data not found' })
    }
  } catch (error: any) {
    console.error('Error fetching machine:', error)
    
    if (error?.response?.status === 404) {
      set({ error: 'Machine not found' })
    } else {
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to fetch machine'
      set({ error: errorMessage })
    }
  } finally {
    set({ loading: false })
  }
},

      createMachine: async (data) => {
        set({ loading: true, error: null })
        
        try {
          const response = await machinesAPI.createMachine(data)
          const newMachine = response.data
          
          get().addMachine(newMachine)
          return newMachine
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create machine'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      updateMachineData: async (id, data) => {
        set({ loading: true, error: null })
        
        try {
          const response = await machinesAPI.updateMachine(id, data)
          get().updateMachine(id, response.data)
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update machine'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      removeMachine: async (id) => {
        set({ loading: true, error: null })
        
        try {
          await machinesAPI.deleteMachine(id)
          get().deleteMachine(id)
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete machine'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      updateMachineStatus: async (id, status) => {
        set({ loading: true, error: null })
        
        try {
          await machinesAPI.updateMachineStatus(id, status)
          get().updateMachine(id, { status })
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update machine status'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      // Utilities
      getOperationalMachines: () => {
        return get().machines.filter(machine => machine.status === 'Operational')
      },

      getMachinesByStatus: (status) => {
        return get().machines.filter(machine => machine.status === status)
      },

      getMachinesByRoom: (room_id) => {
        return get().machines.filter(machine => machine.room_id === room_id)
      },

      getMachinesByProperty: (property_id) => {
        return get().machines.filter(machine => machine.property_id === property_id)
      },

      calculateStats: () => {
        const { machines } = get()
        const stats = {
          total: machines.length,
          operational: machines.filter(m => m.status === 'Operational').length,
          maintenance: machines.filter(m => m.status === 'Maintenance').length,
          offline: machines.filter(m => m.status === 'Offline').length,
          decommissioned: machines.filter(m => m.status === 'Decommissioned').length,
        }
        set({ stats })
      },

      refreshMachines: async () => {
        const { filters } = get()
        await get().fetchMachines(filters)
      },
    }),
    {
      name: 'machines-storage',
      partialize: (state) => ({
        machines: state.machines,
        filters: state.filters,
        pagination: state.pagination,
        stats: state.stats,
      }),
    }
  )
)

// Export types
export type { Machine, CreateMachineData }
