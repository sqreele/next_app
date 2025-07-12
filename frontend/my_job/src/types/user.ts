// src/types/user.ts
export interface Property {
  id: number
  name: string
}

export interface UserProfile {
  id: number
  user_id: number
  role: 'Admin' | 'Technician' | 'Manager' | 'Supervisor'
  position: string
  properties: Property[]
}

export interface User {
  id: number
  username: string
  email: string
  is_active: boolean
  profile: UserProfile
}

export interface CreateUserData {
  username: string
  email: string
  profile: {
    role: 'Admin' | 'Technician' | 'Manager' | 'Supervisor'
    position: string
  }
}

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

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface RegisterResponse {
  user: User
  access_token?: string
  message: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}