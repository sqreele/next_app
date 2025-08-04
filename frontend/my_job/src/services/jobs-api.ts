// src/services/jobs-api.ts
import apiClient, { AxiosResponse, AxiosError } from '@/lib/api-client'

export interface Job {
  id: number
  user_id: number
  property_id: number
  topic_id: number
  room_id?: number
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  notes?: string
  export_data?: string
  pdf_file_path?: string
  before_image?: string
  after_image?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
  user?: {
    id: number
    username: string
    first_name: string
    last_name: string
    role: string
    is_active: boolean
  }
  property?: {
    id: number
    name: string
    address?: string
    is_active: boolean
  }
  topic?: {
    id: number
    title: string
    description?: string
    is_active: boolean
  }
  room?: {
    id: number
    name: string
    room_number?: string
    is_active: boolean
  }
}

export interface CreateJobData {
  property_id: number
  topic_id: number
  room_id?: number
  title: string
  description?: string
  notes?: string
}

export interface UpdateJobData extends Partial<CreateJobData> {
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  export_data?: string
  pdf_file_path?: string
  before_image?: string
  after_image?: string
  started_at?: string
  completed_at?: string
}

export interface JobFilters {
  property?: string
  status?: string
  user_id?: number
  page?: number
  limit?: number
}

export interface ApiError {
  error: string
  message: string
  errors?: Record<string, string[]>
}

class JobsAPI {
  private readonly endpoint = '/api/v1/jobs'

  /**
   * Get all jobs with optional filters
   */
  async getJobs(filters?: JobFilters): Promise<Job[]> {
    try {
      const params = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString())
          }
        })
      }

      const response: AxiosResponse<Job[]> = await apiClient.get(
        `${this.endpoint}${params.toString() ? `?${params.toString()}` : ''}`
      )
      
      return response.data
    } catch (error) {
      console.error('Error in getJobs:', error)
      throw error
    }
  }

  /**
   * Get a single job by ID
   */
  async getJob(id: number): Promise<Job> {
    try {
      const response: AxiosResponse<Job> = await apiClient.get(`${this.endpoint}/${id}`)
      return response.data
    } catch (error) {
      console.error('Error in getJob:', error)
      throw error
    }
  }

  /**
   * Create a new job
   */
  async createJob(data: CreateJobData): Promise<Job> {
    try {
      const response: AxiosResponse<Job> = await apiClient.post(this.endpoint, data)
      return response.data
    } catch (error) {
      console.error('Error in createJob:', error)
      throw error
    }
  }

  /**
   * Update an existing job
   */
  async updateJob(id: number, data: UpdateJobData): Promise<Job> {
    try {
      const response: AxiosResponse<Job> = await apiClient.put(`${this.endpoint}/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Error in updateJob:', error)
      throw error
    }
  }

  /**
   * Delete a job
   */
  async deleteJob(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.endpoint}/${id}`)
    } catch (error) {
      console.error('Error in deleteJob:', error)
      throw error
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(id: number, status: Job['status']): Promise<Job> {
    try {
      const response: AxiosResponse<Job> = await apiClient.patch(`${this.endpoint}/${id}/status`, { status })
      return response.data
    } catch (error) {
      console.error('Error in updateJobStatus:', error)
      throw error
    }
  }

  /**
   * Get jobs by property
   */
  async getJobsByProperty(propertyId: string): Promise<Job[]> {
    return this.getJobs({ property: propertyId })
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: Job['status']): Promise<Job[]> {
    return this.getJobs({ status })
  }

  /**
   * Get jobs by user
   */
  async getJobsByUser(userId: number): Promise<Job[]> {
    return this.getJobs({ user_id: userId })
  }

  /**
   * Search jobs
   */
  async searchJobs(query: string): Promise<Job[]> {
    try {
      const response: AxiosResponse<Job[]> = await apiClient.get(`${this.endpoint}/search?q=${encodeURIComponent(query)}`)
      return response.data
    } catch (error) {
      console.error('Error in searchJobs:', error)
      throw error
    }
  }

  /**
   * Batch operations
   */
  async getJobsWithPagination(page: number = 1, limit: number = 10): Promise<{
    data: Job[]
    pagination: {
      page: number
      limit: number
      total: number
    }
  }> {
    try {
      const jobs = await this.getJobs({ page, limit })
      
      // Since your API returns an array, we'll simulate pagination
      return {
        data: jobs,
        pagination: {
          page,
          limit,
          total: jobs.length,
        }
      }
    } catch (error) {
      console.error('Error in getJobsWithPagination:', error)
      throw error
    }
  }
}

// Export singleton instance
export const jobsAPI = new JobsAPI()

// Export error handling utility
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