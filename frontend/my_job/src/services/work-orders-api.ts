// frontend/my_job/src/services/work-orders-api.ts
import apiClient, { makeWorkOrderRequest, retryRequest, ApiError } from '@/lib/api-client'
import { AxiosResponse } from 'axios'

export interface WorkOrder {
  id: number
  description: string
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  due_date: string
  machine_id: number | null
  room_id: number
  assigned_to_id: number
  property_id: number
  created_at: string
  completed_at: string | null
  before_image_path: string | null
  after_image_path: string | null
  before_images: string[]
  after_images: string[]
  pdf_file_path: string | null
  type: 'pm' | 'issue' | 'workorder'
  topic_id: number | null
  topics?: Array<{id: number, title: string}>  // Many-to-many topics relationship
}

export interface CreateWorkOrderData {
  description: string
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | null
  due_date?: string
  machine_id?: number | null
  room_id?: number
  assigned_to_id?: number
  property_id?: number
  before_image_path?: string | null
  after_image_path?: string | null
  before_images: string[]
  after_images: string[]
  pdf_file_path?: string | null
  type: 'pm' | 'issue' | 'workorder'
  topic_id?: number | null
  topic_ids?: number[]  // Many-to-many topics relationship
  procedure_id?: number | null
  frequency?: string | null
}

export interface UpdateWorkOrderData extends Partial<CreateWorkOrderData> {}

export interface WorkOrderFilters {
  status?: WorkOrder['status']
  priority?: WorkOrder['priority']
  type?: WorkOrder['type']
  assigned_to_id?: number
  machine_id?: number
  room_id?: number
  property_id?: number
  due_date_from?: string
  due_date_to?: string
  topic_id?: number
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

class WorkOrdersAPI {
  private readonly endpoint = '/api/v1/work_orders'

  async getWorkOrders(filters?: WorkOrderFilters): Promise<WorkOrder[]> {
    return makeWorkOrderRequest(() => {
      const params = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString())
          }
        })
      }

      return apiClient.get<WorkOrder[]>(
        `${this.endpoint}${params.toString() ? `?${params.toString()}` : ''}`
      )
    })
  }

  async getWorkOrder(id: number): Promise<WorkOrder> {
    return makeWorkOrderRequest(() => 
      apiClient.get<WorkOrder>(`${this.endpoint}/${id}`)
    )
  }

  async createWorkOrder(data: CreateWorkOrderData): Promise<WorkOrder> {
    return retryRequest(
      () => makeWorkOrderRequest(() => 
        apiClient.post<WorkOrder>(this.endpoint, data)
      ),
      2 // Retry failed work order creation once
    )
  }

  async updateWorkOrder(id: number, data: UpdateWorkOrderData): Promise<WorkOrder> {
    return makeWorkOrderRequest(() => 
      apiClient.patch<WorkOrder>(`${this.endpoint}/${id}`, data)
    )
  }

  async deleteWorkOrder(id: number): Promise<void> {
    return makeWorkOrderRequest(() => 
      apiClient.delete(`${this.endpoint}/${id}`)
    )
  }

  async updateWorkOrderStatus(id: number, status: WorkOrder['status']): Promise<WorkOrder> {
    const updateData: UpdateWorkOrderData = { status }
    return this.updateWorkOrder(id, updateData)
  }

  async getWorkOrdersByStatus(status: WorkOrder['status']): Promise<WorkOrder[]> {
    return this.getWorkOrders({ status })
  }

  async getWorkOrdersByPriority(priority: WorkOrder['priority']): Promise<WorkOrder[]> {
    return this.getWorkOrders({ priority })
  }

  async getWorkOrdersByTechnician(assigned_to_id: number): Promise<WorkOrder[]> {
    return this.getWorkOrders({ assigned_to_id })
  }

  async getWorkOrdersByMachine(machine_id: number): Promise<WorkOrder[]> {
    return this.getWorkOrders({ machine_id })
  }

  async getWorkOrdersByRoom(room_id: number): Promise<WorkOrder[]> {
    return this.getWorkOrders({ room_id })
  }

  async getWorkOrdersByProperty(property_id: number): Promise<WorkOrder[]> {
    return this.getWorkOrders({ property_id })
  }

  async searchWorkOrders(query: string): Promise<WorkOrder[]> {
    return this.getWorkOrders({ search: query })
  }

  async getOverdueWorkOrders(): Promise<WorkOrder[]> {
    const today = new Date().toISOString().split('T')[0]
    return this.getWorkOrders({ 
      due_date_to: today,
      status: 'Pending'
    })
  }

  async getWorkOrdersByDateRange(from: string, to: string): Promise<WorkOrder[]> {
    return this.getWorkOrders({ 
      due_date_from: from,
      due_date_to: to 
    })
  }

  // Additional utility methods using the new error handling
  async getWorkOrderStats(): Promise<{
    total: number
    byStatus: Record<WorkOrder['status'], number>
    byPriority: Record<WorkOrder['priority'], number>
  }> {
    return makeWorkOrderRequest(async () => {
      const workOrders = await this.getWorkOrders()
      
      const stats = {
        total: workOrders.length,
        byStatus: {
          'Pending': 0,
          'In Progress': 0,
          'Completed': 0,
          'Cancelled': 0
        } as Record<WorkOrder['status'], number>,
        byPriority: {
          'Low': 0,
          'Medium': 0,
          'High': 0,
          'Urgent': 0
        } as Record<WorkOrder['priority'], number>
      }

      workOrders.forEach(wo => {
        stats.byStatus[wo.status]++
        stats.byPriority[wo.priority]++
      })

      return { data: stats } as AxiosResponse<typeof stats>
    })
  }

  async bulkUpdateStatus(ids: number[], status: WorkOrder['status']): Promise<WorkOrder[]> {
    return retryRequest(async () => {
      const updatePromises = ids.map(id => this.updateWorkOrderStatus(id, status))
      return Promise.all(updatePromises)
    })
  }

  async duplicateWorkOrder(id: number, modifications?: Partial<CreateWorkOrderData>): Promise<WorkOrder> {
    return makeWorkOrderRequest(async () => {
      // First get the original work order
      const original = await this.getWorkOrder(id)
      
      // Create new work order data based on original
      const newData: CreateWorkOrderData = {
        description: `Copy of: ${original.description}`,
        status: 'Pending',
        priority: original.priority,
        due_date: undefined, // Don't copy due date
        machine_id: original.machine_id,
        room_id: original.room_id,
        assigned_to_id: original.assigned_to_id,
        property_id: original.property_id,
        type: original.type,
        topic_id: original.topic_id,
        before_images: [], // Don't copy images
        after_images: [],
        before_image_path: null,
        after_image_path: null,
        pdf_file_path: null,
        ...modifications // Allow overrides
      }

      return apiClient.post<WorkOrder>(this.endpoint, newData)
    })
  }
}

export const workOrdersAPI = new WorkOrdersAPI()

// Helper function to check if error is validation related
export const isValidationError = (error: any): error is ApiError => {
  return error && error.status === 422
}

// Helper function to extract validation details
export const getValidationErrors = (error: ApiError): string[] => {
  if (!error.details) return []
  
  if (Array.isArray(error.details)) {
    return error.details.map(err => err.msg || err.message || err.toString())
  }
  
  if (typeof error.details === 'object') {
    return Object.values(error.details).flat()
  }
  
  return []
}

// Helper function for work order type-specific validation
export const validateWorkOrderData = (data: CreateWorkOrderData): string[] => {
  const errors: string[] = []

  // Type-specific validation
  if (data.type === 'pm') {
    if (!data.procedure_id) {
      errors.push('Procedure is required for Preventive Maintenance')
    }
    if (!data.machine_id) {
      errors.push('Machine is required for Preventive Maintenance')
    }
    if (!data.frequency) {
      errors.push('Frequency is required for Preventive Maintenance')
    }
    if (!data.priority) {
      errors.push('Priority is required for Preventive Maintenance')
    }
  }

  if (data.type === 'issue') {
    if (!data.machine_id) {
      errors.push('Machine is required for Issue reports')
    }
    if (!data.priority) {
      errors.push('Priority is required for Issue reports')
    }
  }

  // Common validation
  if (!data.description || data.description.trim().length < 5) {
    errors.push('Description must be at least 5 characters long')
  }

  if (data.due_date) {
    const dueDate = new Date(data.due_date)
    const now = new Date()
    if (dueDate < now) {
      errors.push('Due date cannot be in the past')
    }
  }

  return errors
}

// Type guards for better type safety
export const isWorkOrder = (obj: any): obj is WorkOrder => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'number' &&
    typeof obj.description === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.type === 'string'
  )
}

export const isCreateWorkOrderData = (obj: any): obj is CreateWorkOrderData => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.description === 'string' &&
    typeof obj.type === 'string' &&
    ['pm', 'issue', 'workorder'].includes(obj.type)
  )
}

// Constants for work order management
export const WORK_ORDER_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'] as const
export const WORK_ORDER_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const
export const WORK_ORDER_TYPES = ['pm', 'issue', 'workorder'] as const

export const WORK_ORDER_STATUS_COLORS = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Completed': 'bg-green-100 text-green-800',
  'Cancelled': 'bg-red-100 text-red-800',
} as const

export const WORK_ORDER_PRIORITY_COLORS = {
  'Low': 'bg-gray-100 text-gray-800',
  'Medium': 'bg-blue-100 text-blue-800',
  'High': 'bg-orange-100 text-orange-800',
  'Urgent': 'bg-red-100 text-red-800',
} as const

// Export additional types for use in components
export type WorkOrderStatus = WorkOrder['status']
export type WorkOrderPriority = WorkOrder['priority']
export type WorkOrderType = WorkOrder['type']
