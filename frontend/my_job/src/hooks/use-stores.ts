// src/hooks/use-stores.ts
import { useWorkOrderStore } from '@/stores/work-orders-store'
import { useMachineStore } from '@/stores/machines-store'
import { useTechnicianStore } from '@/stores/technicians-store'
import { useRoomStore } from '@/stores/rooms-store'
import { useAppStore } from '@/stores/app-store'

// Combined hook for form data
export function useFormData() {
  const machines = useMachineStore((state) => state.getActiveMachines())
  const rooms = useRoomStore((state) => state.getAvailableRooms())
  const technicians = useTechnicianStore((state) => state.getAvailableTechnicians())
  
  const machinesLoading = useMachineStore((state) => state.loading)
  const roomsLoading = useRoomStore((state) => state.loading)
  const techniciansLoading = useTechnicianStore((state) => state.loading)
  
  const loading = machinesLoading || roomsLoading || techniciansLoading
  
  return {
    machines,
    rooms,
    technicians,
    loading,
  }
}

// Hook for dashboard statistics
export function useDashboardStats() {
  const workOrderStats = useWorkOrderStore((state) => state.stats)
  const totalMachines = useMachineStore((state) => state.machines.length)
  const activeTechnicians = useTechnicianStore((state) => 
    state.technicians.filter(t => t.available).length
  )
  const totalRooms = useRoomStore((state) => state.rooms.length)
  
  return {
    workOrders: workOrderStats,
    totalMachines,
    activeTechnicians,
    totalRooms,
  }
}

// Hook for work order management
export function useWorkOrderActions() {
  const createWorkOrder = useWorkOrderStore((state) => state.createWorkOrder)
  const updateWorkOrder = useWorkOrderStore((state) => state.updateWorkOrder)
  const deleteWorkOrder = useWorkOrderStore((state) => state.deleteWorkOrder)
  const updateStatus = useWorkOrderStore((state) => state.updateWorkOrderStatus)
  
  return {
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    updateStatus,
  }
}

// Hook for filtering and search
export function useWorkOrderFilters() {
  const filters = useWorkOrderStore((state) => state.filters)
  const setFilters = useWorkOrderStore((state) => state.setFilters)
  const clearFilters = useWorkOrderStore((state) => state.clearFilters)
  const getFilteredWorkOrders = useWorkOrderStore((state) => state.getFilteredWorkOrders)
  
  return {
    filters,
    setFilters,
    clearFilters,
    filteredWorkOrders: getFilteredWorkOrders(),
  }
}
