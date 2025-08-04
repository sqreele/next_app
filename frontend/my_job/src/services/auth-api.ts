import axios from 'axios'

export interface RefreshTokenResponse {
  access_token: string
  token_type: string
}

class AuthAPI {
  private readonly baseURL = typeof window !== 'undefined' ? '' : 'http://localhost:8000'

  async refreshToken(): Promise<RefreshTokenResponse> {
    const response = await axios.post(`${this.baseURL}/api/v1/auth/refresh-token`, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Include the current token in the request
      ...(typeof window !== 'undefined' && {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getCurrentToken()}`,
        },
      }),
    })
    return response.data
  }

  private getCurrentToken(): string | null {
    if (typeof window === 'undefined') return null
    
    try {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        const parsed = JSON.parse(authStorage)
        return parsed.state?.token || null
      }
    } catch (error) {
      console.error('Error parsing auth storage:', error)
    }
    return null
  }
}

export const authAPI = new AuthAPI()