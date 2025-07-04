// src/services/properties-api.ts
import apiClient from '@/lib/api-client'
import { AxiosResponse } from 'axios'

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

export interface PropertiesResponse {
  data?: Property[]
  total?: number
  page?: number
  limit?: number
  message?: string
}

export interface PropertyResponse {
  data: Property
  message?: string
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
        })const response: AxiosResponse<Property[] | PropertiesResponse> = await apiClient.get(
       `${this.endpoint}${params.toString() ? `?${params.toString()}` : ''}`
     )
     
     // Handle both array response and object response with data property
     if (Array.isArray(response.data)) {
       return response.data
     } else {
       return response.data.data || []
     }
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
     const response: AxiosResponse<PropertyResponse> = await apiClient.get(`${this.endpoint}/${id}`)
     return response.data.data || response.data
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
     const response: AxiosResponse<PropertyResponse> = await apiClient.post(this.endpoint, data)
     return response.data.data || response.data
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
     const response: AxiosResponse<PropertyResponse> = await apiClient.patch(`${this.endpoint}/${id}`, data)
     return response.data.data || response.data
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
}

// Export singleton instance
export const propertiesAPI = new PropertiesAPI()
      }

      
