// src/services/properties-api.ts
import apiClient, { AxiosResponse, AxiosError } from '@/lib/api-client'

export interface Property {
  id: number
  name: string
}

export interface CreatePropertyData {
  name: string
}

export interface UpdatePropertyData extends Partial<CreatePropertyData> {}

export interface PropertyFilters {
  search?: string
  page?: number
  limit?: number
}

export interface ApiError {
  error: string
  message: string
  errors?: Record<string, string[]>
}

class PropertiesAPI {
  private readonly endpoint = '/v1/properties'

  /**
   * Get all properties with optional filters
   */
  async getProperties(filters?: PropertyFilters): Promise<Property[]> {
    try {
      const params = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString())
          }
        })
      }

      const response: AxiosResponse<Property[]> = await apiClient.get(
        `${this.endpoint}${params.toString() ? `?${params.toString()}` : ''}`
      )
      
      return response.data
    } catch (error) {
      console.error('Error in getProperties:', error)
      throw error
    }
  }

  /**
   * Get a single property by ID
   */
  async getProperty(id: number): Promise<Property> {
    try {
      const response: AxiosResponse<Property> = await apiClient.get(`${this.endpoint}/${id}`)
      return response.data
    } catch (error) {
      console.error('Error in getProperty:', error)
      throw error
    }
  }

  /**
   * Create a new property
   */
  async createProperty(data: CreatePropertyData): Promise<Property> {
    try {
      const response: AxiosResponse<Property> = await apiClient.post(this.endpoint, data)
      return response.data
    } catch (error) {
      console.error('Error in createProperty:', error)
      throw error
    }
  }

  /**
   * Update an existing property
   */
  async updateProperty(id: number, data: UpdatePropertyData): Promise<Property> {
    try {
      const response: AxiosResponse<Property> = await apiClient.patch(`${this.endpoint}/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Error in updateProperty:', error)
      throw error
    }
  }

  /**
   * Delete a property
   */
  async deleteProperty(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.endpoint}/${id}`)
    } catch (error) {
      console.error('Error in deleteProperty:', error)
      throw error
    }
  }

  /**
   * Search properties by name
   */
  async searchProperties(query: string): Promise<Property[]> {
    try {
      return await this.getProperties({ search: query })
    } catch (error) {
      console.error('Error in searchProperties:', error)
      throw error
    }
  }

  /**
   * Batch operations
   */
  async getPropertiesWithPagination(page: number = 1, limit: number = 10): Promise<{
    data: Property[]
    pagination: {
      page: number
      limit: number
      total: number
    }
  }> {
    try {
      const properties = await this.getProperties({ page, limit })
      
      // Since your API returns an array, we'll simulate pagination
      return {
        data: properties,
        pagination: {
          page,
          limit,
          total: properties.length,
        }
      }
    } catch (error) {
      console.error('Error in getPropertiesWithPagination:', error)
      throw error
    }
  }
}

// Export singleton instance
export const propertiesAPI = new PropertiesAPI()

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
      
