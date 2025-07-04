// src/types/user.ts
export interface UserProfile {
  id: number
  user_id: number
  role: 'Admin' | 'Technician' | 'Manager' | 'Supervisor'
  position: string
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

export interface LoginCredentials {
  username?: string
  email?: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}
