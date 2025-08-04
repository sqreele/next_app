import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { 
  workOrdersAPI, 
  WorkOrder, 
  CreateWorkOrderData, 
  WorkOrderFilters,
  getApiErrorMessage,
  getApiValidationErrors
} from '@/services/work-orders-api'
import { retryRequest, waitForConnection } from '@/lib/api-client'

interface WorkOrderState {
  // Data
  workOrders: WorkOrder[]
  selectedWorkOrder: WorkOrder | null
  filters: WorkOrderFilters
  loading: boolean
  error: string | null
  
  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
  }
  
  // Statistics
  stats: {
    total: number
    pending: number
    inProgress: number
    completed: number
    cancelled: number
    overdue: number
    dueToday: number
    dueThisWeek: number
    byPriority: {
      low: number
      medium: number
      high: number
      urgent: number
    }
  }
  
  // Actions
  setWorkOrders: (workOrders: WorkOrder[]) => void
  addWorkOrder: (workOrder: WorkOrder) => void
  updateWorkOrder: (id: number, updates: Partial<WorkOrder>) => void
  deleteWorkOrder: (id: number) => void
  setSelectedWorkOrder: (workOrder: WorkOrder | null) => void
  
  // Filtering & Search
  setFilters: (filters: Partial<WorkOrderFilters>) => void
  clearFilters: () => void
  getFilteredWorkOrders: () => WorkOrder[]
  
  // Pagination
  setPagination: (pagination: Partial<WorkOrderState['pagination']>) => void
  
  // Status Management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // API Actions
  fetchWorkOrders: (filters?: WorkOrderFilters) => Promise<void>
  fetchWorkOrder: (id: number) => Promise<void>
  createWorkOrder: (data: CreateWorkOrderData) => Promise<WorkOrder>
  updateWorkOrderData: (id: number, data: Partial<WorkOrder>) => Promise<void>
  removeWorkOrder: (id: number) => Promise<void>
  updateWorkOrderStatus: (id: number, status: WorkOrder['status']) => Promise<void>
  searchWorkOrders: (query: string) => Promise<void>
  fetchOverdueWorkOrders: () => Promise<void>
  
  // Utilities
  getWorkOrderById: (id: number) => WorkOrder | undefined
  getWorkOrdersByStatus: (status: WorkOrder['status']) => WorkOrder[]
  getWorkOrdersByPriority: (priority: WorkOrder['priority']) => WorkOrder[]
  getWorkOrdersByTechnician: (technicianId: number) => WorkOrder[]
  getWorkOrdersByMachine: (machineId: number) => WorkOrder[]
  getWorkOrdersByProperty: (propertyId: number) => WorkOrder[]
  updateStats: () => void
  refreshWorkOrders: () => Promise<void>
  reset: () => void
}

export const useWorkOrderStore = create<WorkOrderState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        workOrders: [],
        selectedWorkOrder: null,
        filters: {},
        loading: false,
        error: null,
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
        },
        stats: {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          overdue: 0,
          dueToday: 0,
          dueThisWeek: 0,
          byPriority: {
            low: 0,
            medium: 0,
            high: 0,
            urgent: 0,
          },
        },

        // Basic state management
        setWorkOrders: (workOrders) => {
          set({ workOrders })
          get().updateStats()
        },

        addWorkOrder: (workOrder) => {
          set((state) => ({
            workOrders: [workOrder, ...state.workOrders]
          }))
          get().updateStats()
        },

        updateWorkOrder: (id, updates) => {
          set((state) => ({
            workOrders: state.workOrders.map((workOrder) =>
              workOrder.id === id ? { ...workOrder, ...updates } : workOrder
            ),
            selectedWorkOrder: state.selectedWorkOrder?.id === id 
              ? { ...state.selectedWorkOrder, ...updates } 
              : state.selectedWorkOrder
          }))
          get().updateStats()
        },

        deleteWorkOrder: (id) => {
          set((state) => ({
            workOrders: state.workOrders.filter((workOrder) => workOrder.id !== id),
            selectedWorkOrder: state.selectedWorkOrder?.id === id ? null : state.selectedWorkOrder
          }))
          get().updateStats()
        },

        setSelectedWorkOrder: (workOrder) => {
          set({ selectedWorkOrder: workOrder })
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

        getFilteredWorkOrders: () => {
          const { workOrders, filters } = get()
          
          return workOrders.filter((workOrder) => {
            // Status filter
            if (filters.status && workOrder.status !== filters.status) return false
            
            // Priority filter
            if (filters.priority && workOrder.priority !== filters.priority) return false
            
            // Assigned to filter
            if (filters.assigned_to_id && workOrder.assigned_to_id !== filters.assigned_to_id) return false
            
            // Machine filter
            if (filters.machine_id && workOrder.machine_id !== filters.machine_id) return false
            
            // Room filter
            if (filters.room_id && workOrder.room_id !== filters.room_id) return false
            
            // Property filter
            if (filters.property_id && workOrder.property_id !== filters.property_id) return false
            
            // Date range filter
            if (filters.due_date_from || filters.due_date_to) {
              const dueDate = new Date(workOrder.due_date)
              
              if (filters.due_date_from) {
                const fromDate = new Date(filters.due_date_from)
                if (dueDate < fromDate) return false
              }
              
              if (filters.due_date_to) {
                const toDate = new Date(filters.due_date_to)
                if (dueDate > toDate) return false
              }
            }
            
            // Search filter
            if (filters.search) {
              const searchTerm = filters.search.toLowerCase()
              const matchesSearch = 
                workOrder.title?.toLowerCase().includes(searchTerm) ||
                workOrder.description?.toLowerCase().includes(searchTerm) ||
                workOrder.id.toString().includes(searchTerm)
              
              if (!matchesSearch) return false
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

        // Status Management
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        // API Actions using Axios with enhanced error handling
        fetchWorkOrders: async (filters) => {
          set({ loading: true, error: null })
          
          try {
            // Wait for connection before making request
            const isConnected = await waitForConnection(5000)
            if (!isConnected) {
              throw new Error('Unable to connect to server. Please check your connection.')
            }

            const workOrders = await retryRequest(
              () => workOrdersAPI.getWorkOrders(filters),
              3, // max retries
              1000, // base delay
              5000 // max delay
            )
            
            get().setWorkOrders(workOrders)
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            console.error('Error fetching work orders:', error)
          } finally {
            set({ loading: false })
          }
        },

        fetchWorkOrder: async (id) => {
          set({ loading: true, error: null })
          
          try {
            const workOrder = await retryRequest(
              () => workOrdersAPI.getWorkOrder(id),
              2, // max retries
              1000, // base delay
              3000 // max delay
            )
            
            set({ selectedWorkOrder: workOrder })
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            console.error('Error fetching work order:', error)
          } finally {
            set({ loading: false })
          }
        },

        createWorkOrder: async (data: CreateWorkOrderData) => {
          set({ loading: true, error: null })
          
          try {
            const newWorkOrder = await retryRequest(
              () => workOrdersAPI.createWorkOrder(data),
              2, // max retries
              1000, // base delay
              3000 // max delay
            )
            
            get().addWorkOrder(newWorkOrder)
            return newWorkOrder
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            throw error
          } finally {
            set({ loading: false })
          }
        },

        updateWorkOrderData: async (id, data) => {
          set({ loading: true, error: null })
          
          try {
            const updatedWorkOrder = await retryRequest(
              () => workOrdersAPI.updateWorkOrder(id, data),
              2, // max retries
              1000, // base delay
              3000 // max delay
            )
            
            get().updateWorkOrder(id, updatedWorkOrder)
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            throw error
          } finally {
            set({ loading: false })
          }
        },

        removeWorkOrder: async (id) => {
          set({ loading: true, error: null })
          
          try {
            await retryRequest(
              () => workOrdersAPI.deleteWorkOrder(id),
              2, // max retries
              1000, // base delay
              3000 // max delay
            )
            
            get().deleteWorkOrder(id)
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            throw error
          } finally {
            set({ loading: false })
          }
        },

        updateWorkOrderStatus: async (id, status) => {
          set({ loading: true, error: null })
          
          try {
            const updatedWorkOrder = await retryRequest(
              () => workOrdersAPI.updateWorkOrderStatus(id, status),
              2, // max retries
              1000, // base delay
              3000 // max delay
            )
            
            get().updateWorkOrder(id, updatedWorkOrder)
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            throw error
          } finally {
            set({ loading: false })
          }
        },

        searchWorkOrders: async (query) => {
          set({ loading: true, error: null })
          
          try {
            const workOrders = await retryRequest(
              () => workOrdersAPI.searchWorkOrders(query),
              2, // max retries
              1000, // base delay
              3000 // max delay
            )
            
            get().setWorkOrders(workOrders)
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            console.error('Error searching work orders:', error)
          } finally {
            set({ loading: false })
          }
        },

        fetchOverdueWorkOrders: async () => {
          set({ loading: true, error: null })
          
          try {
            const workOrders = await retryRequest(
              () => workOrdersAPI.getOverdueWorkOrders(),
              2, // max retries
              1000, // base delay
              3000 // max delay
            )
            
            get().setWorkOrders(workOrders)
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            console.error('Error fetching overdue work orders:', error)
          } finally {
            set({ loading: false })
          }
        },

        // Utilities
        getWorkOrderById: (id) => {
          return get().workOrders.find(workOrder => workOrder.id === id)
        },

        getWorkOrdersByStatus: (status) => {
          return get().workOrders.filter(workOrder => workOrder.status === status)
        },

        getWorkOrdersByPriority: (priority) => {
          return get().workOrders.filter(workOrder => workOrder.priority === priority)
        },

        getWorkOrdersByTechnician: (technicianId) => {
          return get().workOrders.filter(workOrder => workOrder.assigned_to_id === technicianId)
        },

        getWorkOrdersByMachine: (machineId) => {
          return get().workOrders.filter(workOrder => workOrder.machine_id === machineId)
        },

        getWorkOrdersByProperty: (propertyId) => {
          return get().workOrders.filter(workOrder => workOrder.property_id === propertyId)
        },

        updateStats: () => {
          const { workOrders } = get()
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          
          const stats = {
            total: workOrders.length,
            pending: workOrders.filter(wo => wo.status === 'Pending').length,
            inProgress: workOrders.filter(wo => wo.status === 'In Progress').length,
            completed: workOrders.filter(wo => wo.status === 'Completed').length,
            cancelled: workOrders.filter(wo => wo.status === 'Cancelled').length,
            overdue: workOrders.filter(wo => {
              const dueDate = new Date(wo.due_date)
              return dueDate < today && wo.status !== 'Completed' && wo.status !== 'Cancelled'
            }).length,
            dueToday: workOrders.filter(wo => {
              const dueDate = new Date(wo.due_date)
              return dueDate.toDateString() === today.toDateString()
            }).length,
            dueThisWeek: workOrders.filter(wo => {
              const dueDate = new Date(wo.due_date)
              return dueDate >= today && dueDate <= nextWeek
            }).length,
            byPriority: {
              low: workOrders.filter(wo => wo.priority === 'Low').length,
              medium: workOrders.filter(wo => wo.priority === 'Medium').length,
              high: workOrders.filter(wo => wo.priority === 'High').length,
              urgent: workOrders.filter(wo => wo.priority === 'Urgent').length,
            },
          }
          
          set({ stats })
        },

        refreshWorkOrders: async () => {
          const { filters } = get()
          await get().fetchWorkOrders(filters)
        },

        reset: () => {
          set({
            workOrders: [],
            selectedWorkOrder: null,
            filters: {},
            loading: false,
            error: null,
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
            },
            stats: {
              total: 0,
              pending: 0,
              inProgress: 0,
              completed: 0,
              cancelled: 0,
              overdue: 0,
              dueToday: 0,
              dueThisWeek: 0,
              byPriority: {
                low: 0,
                medium: 0,
                high: 0,
                urgent: 0,
              },
            },
          })
        },
      }),
      {
        name: 'work-orders-storage',
        partialize: (state) => ({
          workOrders: state.workOrders,
          selectedWorkOrder: state.selectedWorkOrder,
          filters: state.filters,
          pagination: state.pagination,
          stats: state.stats,
        }),
      }
    )
  )
)

// Export types
export type { WorkOrder, CreateWorkOrderData }