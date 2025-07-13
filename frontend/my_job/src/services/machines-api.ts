// src/services/machines-api.ts
import apiClient from '@/lib/api-client'
import { AxiosResponse } from 'axios'

export interface Machine {
  id: number
  name: string
  status: 'Operational' | 'Maintenance' | 'Offline' | 'Decommissioned'
  room_id: number
  property_id: number
  created_at?: string
  updated_at?: string
  has_pm?: boolean
  has_issue?: boolean
}

export interface CreateMachineData {
  name: string
  status: 'Operational' | 'Maintenance' | 'Offline' | 'Decommissioned'
  room_id: number
}

export interface UpdateMachineData extends Partial<CreateMachineData> {}

export interface MachineFilters {
  status?: Machine['status']
  room_id?: number
  property_id?: number
  search?: string
  page?: number
  limit?: number
  type?: 'pm' | 'issue'
}

export interface MachinesResponse {
  data?: Machine[]
  total?: number
  page?: number
  limit?: number
  message?: string
}

export interface MachineResponse {
  data: Machine
  message?: string
}

class MachinesAPI {
  private readonly endpoint = '/api/v1/machines'

  /**
   * Get all machines with optional filters
   */
  async getMachines(filters?: MachineFilters): Promise<Machine[]> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    const response: AxiosResponse<Machine[] | MachinesResponse> = await apiClient.get(
      `${this.endpoint}${params.toString() ? `?${params.toString()}` : ''}`
    )
    
    // Handle both array response and object response with data property
    if (Array.isArray(response.data)) {
      return response.data
    } else {
      return response.data.data || []
    }
  }

  /**
   * Get machines by property ID
   */
  async getMachinesByProperty(property_id: number): Promise<Machine[]> {
    const response: AxiosResponse<MachinesResponse> = await apiClient.get(
      `${this.endpoint}/property/${property_id}`
    )
    return response.data.data || []
  }

  /**
   * Get a single machine by ID
   */
  async getMachine(id: number): Promise<MachineResponse> {
    const response: AxiosResponse<MachineResponse> = await apiClient.get(`${this.endpoint}/${id}`)
    return response.data
  }

  /**
   * Create a new machine
   */
  async createMachine(data: CreateMachineData): Promise<MachineResponse> {
    const response: AxiosResponse<MachineResponse> = await apiClient.post(this.endpoint, data)
    return response.data
  }

  /**
   * Update an existing machine
   */
  async updateMachine(id: number, data: UpdateMachineData): Promise<MachineResponse> {
    const response: AxiosResponse<MachineResponse> = await apiClient.patch(`${this.endpoint}/${id}`, data)
    return response.data
  }

  /**
   * Delete a machine
   */
  async deleteMachine(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await apiClient.delete(`${this.endpoint}/${id}`)
    return response.data
  }

  /**
   * Update machine status
   */
  async updateMachineStatus(id: number, status: Machine['status']): Promise<MachineResponse> {
    return this.updateMachine(id, { status })
  }

  /**
   * Get machines by room
   */
  async getMachinesByRoom(room_id: number): Promise<Machine[]> {
    return this.getMachines({ room_id })
  }

  /**
   * Get operational machines only
   */
  async getOperationalMachines(): Promise<Machine[]> {
    return this.getMachines({ status: 'Operational' })
  }

  /**
   * Get machines by status
   */
  async getMachinesByStatus(status: Machine['status']): Promise<Machine[]> {
    return this.getMachines({ status })
  }

  /**
   * Search machines by name
   */
  async searchMachines(query: string): Promise<Machine[]> {
    return this.getMachines({ search: query })
  }
}

// Export singleton instance
export const machinesAPI = new MachinesAPI()
