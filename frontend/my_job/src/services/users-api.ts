// src/services/users-api.ts (Updated for your backend)
import apiClient from '@/lib/api-client'
import { AxiosResponse } from 'axios'
import { User, CreateUserData, LoginCredentials, LoginResponse } from '@/types/user'

export interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
  profile: {
    role: 'Admin' | 'Technician' | 'Manager' | 'Supervisor'
    position: string
  }
}

export interface RegisterResponse {
  user: User
  access_token?: string
  message: string
}

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
   * Register new user
   */
  async register(data: RegisterData): Promise<RegisterResponse> {
    // Transform the data to match your API structure
    const apiData = {
      username: data.username,
      email: data.email,
      password: data.password,
      confirm_password: data.confirmPassword, // snake_case for API
      profile: {
        role: data.profile.role,
        position: data.profile.position
      }
    }

    try {
      // Try the users endpoint for registration
      const response: AxiosResponse<User> = await apiClient.post(this.endpoint, apiData)
      
      return {
        user: response.data,
        message: 'User registered successfully'
      }
    } catch (error: any) {
      console.error('Registration API error:', error)
      throw error
    }
  }

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
   * Create a new user (admin function)
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
   * Check if username is available
   */
  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    try {
      const response: AxiosResponse<{ available: boolean }> = await apiClient.get(
        `${this.endpoint}/check-username?username=${encodeURIComponent(username)}`
      )
      return response.data
    } catch (error: any) {
      // If endpoint doesn't exist, try checking by getting all users
      if (error?.response?.status === 404) {
        try {
          const users = await this.getUsers({ search: username })
          const exists = users.some(user => user.username.toLowerCase() === username.toLowerCase())
          return { available: !exists }
        } catch {
          return { available: true }
        }
      }
      throw error
    }
  }

  /**
   * Check if email is available
   */
  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    try {
      const response: AxiosResponse<{ available: boolean }> = await apiClient.get(
        `${this.endpoint}/check-email?email=${encodeURIComponent(email)}`
      )
      return response.data
    } catch (error: any) {
      // If endpoint doesn't exist, try checking by getting all users
      if (error?.response?.status === 404) {
        try {
          const users = await this.getUsers()
          const exists = users.some(user => user.email.toLowerCase() === email.toLowerCase())
          return { available: !exists }
        } catch {
          return { available: true }
        }
      }
      throw error
    }
  }

  /**
   * Update user status (active/inactive)
   */
  async updateUserStatus(id: number, is_active: boolean): Promise<User> {
    const response: AxiosResponse<User> = await apiClient.patch(
      `${this.endpoint}/${id}`, 
      { is_active }
    )
    return response.data
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

// Export types
export type { RegisterData, RegisterResponse }
