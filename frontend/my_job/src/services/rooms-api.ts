// src/services/rooms-api.ts
import apiClient from '@/lib/api-client'
import { AxiosResponse } from 'axios'

export interface Room {
  id: number
  name: string
  number: string
  room_type: string
  is_active: boolean
  property_id: number
}

export interface CreateRoomData {
  name: string
  number: string
  room_type: string
  is_active: boolean
}

export interface UpdateRoomData extends Partial<CreateRoomData> {}

export interface RoomFilters {
  room_type?: string
  is_active?: boolean
  property_id?: number
  search?: string
  page?: number
  limit?: number
}

export interface RoomsResponse {
  data: Room[]
  total: number
  page?: number
  limit?: number
  message?: string
}

export interface RoomResponse {
  data: Room
  message?: string
}

class RoomsAPI {
  private readonly endpoint = '/api/v1/rooms'

  /**
   * Get all rooms with optional filters
   */
  async getRooms(filters?: RoomFilters): Promise<RoomsResponse> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    const response: AxiosResponse<Room[] | RoomsResponse> = await apiClient.get(
      `${this.endpoint}${params.toString() ? `?${params.toString()}` : ''}`
    )
    
    // Handle both array response and paginated response
    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        total: response.data.length,
        page: 1,
        limit: response.data.length
      }
    }
    
    return response.data as RoomsResponse
  }

  /**
   * Get a single room by ID
   */
  async getRoom(id: number): Promise<RoomResponse> {
    const response: AxiosResponse<RoomResponse> = await apiClient.get(`${this.endpoint}/${id}`)
    return response.data
  }

  /**
   * Create a new room
   */
  async createRoom(data: CreateRoomData): Promise<RoomResponse> {
    const response: AxiosResponse<RoomResponse> = await apiClient.post(this.endpoint, data)
    return response.data
  }

  /**
   * Update an existing room
   */
  async updateRoom(id: number, data: UpdateRoomData): Promise<RoomResponse> {
    const response: AxiosResponse<RoomResponse> = await apiClient.patch(`${this.endpoint}/${id}`, data)
    return response.data
  }

  /**
   * Delete a room
   */
  async deleteRoom(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.delete(`${this.endpoint}/${id}`)
    return response.data
  }

  /**
   * Update room status (active/inactive)
   */
  async updateRoomStatus(id: number, is_active: boolean): Promise<RoomResponse> {
    return this.updateRoom(id, { is_active })
  }

  /**
   * Get rooms by type
   */
  async getRoomsByType(room_type: string): Promise<RoomsResponse> {
    return this.getRooms({ room_type })
  }

  /**
   * Get active rooms only
   */
  async getActiveRooms(): Promise<RoomsResponse> {
    return this.getRooms({ is_active: true })
  }

  /**
   * Get rooms by property
   */
  async getRoomsByProperty(property_id: number): Promise<RoomsResponse> {
    return this.getRooms({ property_id })
  }

  /**
   * Search rooms by name or number
   */
  async searchRooms(query: string): Promise<RoomsResponse> {
    return this.getRooms({ search: query })
  }
}

// Export singleton instance
export const roomsAPI = new RoomsAPI()
