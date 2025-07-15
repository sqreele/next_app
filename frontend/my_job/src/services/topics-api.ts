import apiClient from '@/lib/api-client'
import { AxiosResponse } from 'axios'

export interface Topic {
  id: number
  title: string
}

export interface TopicsResponse {
  data?: Topic[]
  total?: number
  page?: number
  limit?: number
  message?: string
}

class TopicsAPI {
  private readonly endpoint = '/api/v1/topics'

  async getTopics(): Promise<Topic[]> {
    try {
      const response: AxiosResponse<TopicsResponse> = await apiClient.get(this.endpoint)
      return response.data.data || []
    } catch (error) {
      console.error('Error in getTopics:', error)
      throw error
    }
  }
}

export const topicsAPI = new TopicsAPI() 