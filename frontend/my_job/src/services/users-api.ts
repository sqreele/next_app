// src/services/users-api.ts
import apiClient from '@/lib/api-client'
import { AxiosResponse } from 'axios'
import { User, CreateUserData, LoginCredentials, LoginResponse } from '@/types/user'

export interface UsersFilters {
  role?: string
  is_active?: boolean
  search?: string
  page?: number
  limit?: number
}

class UsersAPI {
  private readonly endpoint = '/v1/users'
  private readonly authEndpoint = '/auth'

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await apiClient.post(
      `${this.authEndpoint}/login`, 
      credentials
    )
    return response.data
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.get(`${this.authEndpoint}/me`)
    return response.data
  }

  /**
   * Get all users with optional filters
   */
  async getUsers(filters?: UsersFilters): Promise<User[]> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    const response: AxiosResponse<User[]> = await apiClient.get(
      `${this.endpoint}${params.toString() ? `?${params.toString()}` : ''}`
    )
    
    return response.data
  }

  /**
   * Get a single user by ID
   */
  async getUser(id: number): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.get(`${this.endpoint}/${id}`)
    return response.data
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.post(this.endpoint, data)
    return response.data
  }

  /**
   * Update an existing user
   */
  async updateUser(id: number, data: Partial<CreateUserData>): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.patch(`${this.endpoint}/${id}`, data)
    return response.data
  }

  /**
   * Delete a user
   */
  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`${this.endpoint}/${id}`)
  }

  /**
   * Update user status (active/inactive)
   */
  async updateUserStatus(id: number, is_active: boolean): Promise<User> {
    return this.updateUser(id, { 
      email: undefined, // Don't update email
      username: undefined, // Don't update username
      profile: undefined // Don't update profile
    })
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: string): Promise<User[]> {
    return this.getUsers({ role })
  }

  /**
   * Get active users only
   */
  async getActiveUsers(): Promise<User[]> {
    return this.getUsers({ is_active: true })
  }

  /**
   * Search users
   */
  async searchUsers(query: string): Promise<User[]> {
    return this.getUsers({ search: query })
  }
}

// Export singleton instance
export const usersAPI = new UsersAPI()
