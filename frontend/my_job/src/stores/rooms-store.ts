// src/stores/rooms-store.ts (Fixed)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { roomsAPI, Room, CreateRoomData, RoomFilters } from '@/services/rooms-api'

interface RoomState {
  // Data
  rooms: Room[]
  selectedRoom: Room | null
  filters: RoomFilters
  loading: boolean
  error: string | null
  
  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
  }
  
  // Actions
  setRooms: (rooms: Room[]) => void
  addRoom: (room: Room) => void
  updateRoom: (id: number, updates: Partial<Room>) => void
  deleteRoom: (id: number) => void
  setSelectedRoom: (room: Room | null) => void
  
  // Filtering & Search
  setFilters: (filters: Partial<RoomFilters>) => void
  clearFilters: () => void
  getFilteredRooms: () => Room[]
  
  // Pagination
  setPagination: (pagination: Partial<RoomState['pagination']>) => void
  
  // Status Management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // API Actions
  fetchRooms: (filters?: RoomFilters) => Promise<void>
  fetchRoom: (id: number) => Promise<void>
  createRoom: (data: CreateRoomData) => Promise<Room>
  updateRoomData: (id: number, data: Partial<Room>) => Promise<void>
  removeRoom: (id: number) => Promise<void>
  updateRoomStatus: (id: number, is_active: boolean) => Promise<void>
  
  // Utilities
  getActiveRooms: () => Room[]
  getRoomsByType: (room_type: string) => Room[]
  getRoomsByProperty: (property_id: number) => Room[]
  getRoomByNumber: (number: string) => Room | undefined
  refreshRooms: () => Promise<void>
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      // Initial state - ENSURE rooms is always an array
      rooms: [],
      selectedRoom: null,
      filters: {},
      loading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },

      // Basic state management
      setRooms: (rooms) => {
        set({ rooms: rooms || [] }) // Ensure rooms is never null/undefined
      },

      addRoom: (room) => {
        set((state) => ({
          rooms: [room, ...(state.rooms || [])], // Safe array spreading
          pagination: {
            ...state.pagination,
            total: state.pagination.total + 1
          }
        }))
      },

      updateRoom: (id, updates) => {
        set((state) => ({
          rooms: (state.rooms || []).map((room) =>
            room.id === id ? { ...room, ...updates } : room
          ),
          selectedRoom: state.selectedRoom?.id === id 
            ? { ...state.selectedRoom, ...updates } 
            : state.selectedRoom
        }))
      },

      deleteRoom: (id) => {
        set((state) => ({
          rooms: (state.rooms || []).filter((room) => room.id !== id),
          selectedRoom: state.selectedRoom?.id === id ? null : state.selectedRoom,
          pagination: {
            ...state.pagination,
            total: Math.max(0, state.pagination.total - 1)
          }
        }))
      },

      setSelectedRoom: (room) => {
        set({ selectedRoom: room })
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

      getFilteredRooms: () => {
        const { rooms, filters } = get()
        const safeRooms = rooms || [] // Ensure rooms is an array
        
        return safeRooms.filter((room) => {
          // Room type filter
          if (filters.room_type && room.room_type !== filters.room_type) return false
          
          // Active status filter
          if (filters.is_active !== undefined && room.is_active !== filters.is_active) return false
          
          // Property filter
          if (filters.property_id && room.property_id !== filters.property_id) return false
          
          // Search filter
          if (filters.search) {
            const searchTerm = filters.search.toLowerCase()
            const searchableText = [
              room.name,
              room.number,
              room.room_type
            ].join(' ').toLowerCase()
            
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
      fetchRooms: async (filters) => {
        set({ loading: true, error: null })
        
        try {
          const { pagination } = get()
          const queryFilters = {
            ...filters,
            page: pagination.page,
            limit: pagination.limit,
          }
          
          console.log('Fetching rooms with filters:', queryFilters)
          const response = await roomsAPI.getRooms(queryFilters)
          console.log('Rooms API response:', response)
          
          set({ 
            rooms: response.data || [], // Ensure rooms is always an array
            pagination: {
              ...pagination,
              total: response.total || 0,
              page: response.page || pagination.page,
              limit: response.limit || pagination.limit,
            }
          })
          console.log('Rooms set in store:', response.data || [])
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch rooms'
          set({ error: errorMessage, rooms: [] }) // Set empty array on error
          console.error('Error fetching rooms:', error)
        } finally {
          set({ loading: false })
        }
      },

      fetchRoom: async (id) => {
        set({ loading: true, error: null })
        
        try {
          const response = await roomsAPI.getRoom(id)
          set({ selectedRoom: response.data })
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch room'
          set({ error: errorMessage })
          console.error('Error fetching room:', error)
        } finally {
          set({ loading: false })
        }
      },

      createRoom: async (data) => {
        set({ loading: true, error: null })
        
        try {
          const response = await roomsAPI.createRoom(data)
          const newRoom = response.data
          
          get().addRoom(newRoom)
          return newRoom
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create room'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      updateRoomData: async (id, data) => {
        set({ loading: true, error: null })
        
        try {
          const response = await roomsAPI.updateRoom(id, data)
          get().updateRoom(id, response.data)
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update room'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      removeRoom: async (id) => {
        set({ loading: true, error: null })
        
        try {
          await roomsAPI.deleteRoom(id)
          get().deleteRoom(id)
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete room'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      updateRoomStatus: async (id, is_active) => {
        set({ loading: true, error: null })
        
        try {
          await roomsAPI.updateRoomStatus(id, is_active)
          get().updateRoom(id, { is_active })
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update room status'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      // Utilities - FIXED: Added null checks
      getActiveRooms: () => {
        const { rooms } = get()
        return (rooms || []).filter(room => room.is_active)
      },

      getRoomsByType: (room_type) => {
        const { rooms } = get()
        return (rooms || []).filter(room => room.room_type === room_type)
      },

      getRoomsByProperty: (property_id) => {
        const { rooms } = get()
        return (rooms || []).filter(room => room.property_id === property_id)
      },

      getRoomByNumber: (number) => {
        const { rooms } = get()
        return (rooms || []).find(room => room.number === number)
      },

      refreshRooms: async () => {
        const { filters } = get()
        await get().fetchRooms(filters)
      },
    }),
    {
      name: 'rooms-storage',
      partialize: (state) => ({
        rooms: state.rooms || [], // Ensure rooms is always an array in persistence
        filters: state.filters,
        pagination: state.pagination,
      }),
    }
  )
)

// Export types
export type { Room, CreateRoomData }