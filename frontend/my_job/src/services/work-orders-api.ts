// src/services/work-orders-api.ts
import apiClient from '@/lib/api-client'
import { AxiosResponse } from 'axios'

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
  work_order_number?: string
  created_at?: string
  updated_at?: string
}

export interface CreateWorkOrderData {
  task: string
  description: string
  status: WorkOrder['status']
  priority: WorkOrder['priority']
  due_date: string
  machine_id: number
  room_id: number
  assigned_to_id: number
}

class WorkOrdersAPI {
  private readonly endpoint = '/work-orders'

  async getWorkOrders(): Promise<{ data: WorkOrder[]; total: number }> {
    const response: AxiosResponse = await apiClient.get(this.endpoint)
    return response.data
  }

  async getWorkOrder(id: number): Promise<{ data: WorkOrder }> {
    const response: AxiosResponse = await apiClient.get(`${this.endpoint}/${id}`)
    return response.data
  }

  async createWorkOrder(data: CreateWorkOrderData): Promise<{ data: WorkOrder }> {
    const response: AxiosResponse = await apiClient.post(this.endpoint, data)
    return response.data
  }

  async updateWorkOrder(id: number, data: Partial<WorkOrder>): Promise<{ data: WorkOrder }> {
    const response: AxiosResponse = await apiClient.patch(`${this.endpoint}/${id}`, data)
    return response.data
  }

  async deleteWorkOrder(id: number): Promise<{ message: string }> {
    const response: AxiosResponse = await apiClient.delete(`${this.endpoint}/${id}`)
    return response.data
  }
}

export const workOrdersAPI = new WorkOrdersAPI()
