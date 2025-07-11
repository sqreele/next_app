import apiClient from '@/lib/api-client'
import { AxiosResponse, AxiosError } from 'axios'

export interface WorkOrder {
  id: number
  task: string
  description: string
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  due_date: string
  machine_id: number
  room_id: number
  assigned_to_id: number
  property_id: number
  created_at: string
  completed_at: string | null
}

export interface CreateWorkOrderData {
  task: string
  description: string
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  due_date?: string
  machine_id?: number
  room_id?: number
  assigned_to_id?: number
  property_id: number // Required field
  before_image_path?: string | null
  after_image_path?: string | null
  before_images: string[]
  after_images: string[]
}

export interface UpdateWorkOrderData extends Partial<CreateWorkOrderData> {}

export interface WorkOrderFilters {
  status?: WorkOrder['status']
  priority?: WorkOrder['priority']
  assigned_to_id?: number
  machine_id?: number
  room_id?: number
  property_id?: number
  due_date_from?: string
  due_date_to?: string
  search?: string
  page?: number
  limit?: number
}

export interface WorkOrdersResponse {
  data?: WorkOrder[]
  total?: number
  page?: number
  limit?: number
  message?: string
}

export interface WorkOrderResponse {
  data: WorkOrder
  message?: string
}

export interface ApiError {
  error: string
  message: string
  errors?: Record<string, string[]>
}

class WorkOrdersAPI {
  private readonly endpoint = '/api/v1/work_orders'

  /**
   * Get all work orders with optional filters
   */
  async getWorkOrders(filters?: WorkOrderFilters): Promise<WorkOrder[]> {
    try {
      const params = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString())
          }
        })
      }

      const response: AxiosResponse<WorkOrder[]> = await apiClient.get(
        `${this.endpoint}${params.toString() ? `?${params.toString()}` : ''}`
      )
      
      return response.data
    } catch (error) {
      console.error('Error in getWorkOrders:', error)
      throw error
    }
  }

  /**
   * Get a single work order by ID
   */
  async getWorkOrder(id: number): Promise<WorkOrder> {
    try {
      const response: AxiosResponse<WorkOrder> = await apiClient.get(`${this.endpoint}/${id}`)
      return response.data
    } catch (error) {
      console.error('Error in getWorkOrder:', error)
      throw error
    }
  }

  /**
   * Create a new work order
   */
  async createWorkOrder(data: CreateWorkOrderData): Promise<WorkOrder> {
    try {
      const response: AxiosResponse<WorkOrder> = await apiClient.post(this.endpoint, data)
      return response.data
    } catch (error) {
      console.error('Error in createWorkOrder:', error)
      throw error
    }
  }

  /**
   * Update an existing work order
   */
  async updateWorkOrder(id: number, data: UpdateWorkOrderData): Promise<WorkOrder> {
    try {
      const response: AxiosResponse<WorkOrder> = await apiClient.patch(`${this.endpoint}/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Error in updateWorkOrder:', error)
      throw error
    }
  }

  /**
   * Delete a work order
   */
  async deleteWorkOrder(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.endpoint}/${id}`)
    } catch (error) {
      console.error('Error in deleteWorkOrder:', error)
      throw error
    }
  }

  /**
   * Update work order status
   */
  async updateWorkOrderStatus(id: number, status: WorkOrder['status']): Promise<WorkOrder> {
    try {
      const updateData: UpdateWorkOrderData = { status }
      
      // If marking as completed, set completed_at timestamp
      if (status === 'Completed') {
        // Note: completed_at should be handled by the backend
        // but we can send it for immediate UI update
      }
      
      return await this.updateWorkOrder(id, updateData)
    } catch (error) {
      console.error('Error in updateWorkOrderStatus:', error)
      throw error
    }
  }

  /**
   * Get work orders by status
   */
  async getWorkOrdersByStatus(status: WorkOrder['status']): Promise<WorkOrder[]> {
    try {
      return await this.getWorkOrders({ status })
    } catch (error) {
      console.error('Error in getWorkOrdersByStatus:', error)
      throw error
    }
  }

  /**
   * Get work orders by priority
   */
  async getWorkOrdersByPriority(priority: WorkOrder['priority']): Promise<WorkOrder[]> {
    try {
      return await this.getWorkOrders({ priority })
    } catch (error) {
      console.error('Error in getWorkOrdersByPriority:', error)
      throw error
    }
  }

  /**
   * Get work orders assigned to a technician
   */
  async getWorkOrdersByTechnician(assigned_to_id: number): Promise<WorkOrder[]> {
    try {
      return await this.getWorkOrders({ assigned_to_id })
    } catch (error) {
      console.error('Error in getWorkOrdersByTechnician:', error)
      throw error
    }
  }

  /**
   * Get work orders for a specific machine
   */
  async getWorkOrdersByMachine(machine_id: number): Promise<WorkOrder[]> {
    try {
      return await this.getWorkOrders({ machine_id })
    } catch (error) {
      console.error('Error in getWorkOrdersByMachine:', error)
      throw error
    }
  }

  /**
   * Get work orders for a specific room
   */
  async getWorkOrdersByRoom(room_id: number): Promise<WorkOrder[]> {
    try {
      return await this.getWorkOrders({ room_id })
    } catch (error) {
      console.error('Error in getWorkOrdersByRoom:', error)
      throw error
    }
  }

  /**
   * Get work orders for a specific property
   */
  async getWorkOrdersByProperty(property_id: number): Promise<WorkOrder[]> {
    try {
      return await this.getWorkOrders({ property_id })
    } catch (error) {
      console.error('Error in getWorkOrdersByProperty:', error)
      throw error
    }
  }

  /**
   * Search work orders
   */
  async searchWorkOrders(query: string): Promise<WorkOrder[]> {
    try {
      return await this.getWorkOrders({ search: query })
    } catch (error) {
      console.error('Error in searchWorkOrders:', error)
      throw error
    }
  }

  /**
   * Get overdue work orders
   */
  async getOverdueWorkOrders(): Promise<WorkOrder[]> {
    try {
      const today = new Date().toISOString().split('T')[0]
      return await this.getWorkOrders({ 
        due_date_to: today,
        status: 'Pending' // Only get pending and in-progress orders
      })
    } catch (error) {
      console.error('Error in getOverdueWorkOrders:', error)
      throw error
    }
  }

  /**
   * Get work orders due within a date range
   */
  async getWorkOrdersByDateRange(from: string, to: string): Promise<WorkOrder[]> {
    try {
      return await this.getWorkOrders({ 
        due_date_from: from,
        due_date_to: to 
      })
    } catch (error) {
      console.error('Error in getWorkOrdersByDateRange:', error)
      throw error
    }
  }
}

// Export singleton instance
export const workOrdersAPI = new WorkOrdersAPI()

// Export error handling utilities
export const isApiError = (error: any): error is AxiosError<ApiError> => {
  return error?.response?.data?.error !== undefined
}

export const getApiErrorMessage = (error: any): string => {
  if (isApiError(error)) {
    return error.response?.data?.message || 'An error occurred'
  }
  return error?.message || 'An unexpected error occurred'
}

export const getApiValidationErrors = (error: any): Record<string, string[]> | null => {
  if (isApiError(error) && error.response?.data?.errors) {
    return error.response.data.errors
  }
  return null
}