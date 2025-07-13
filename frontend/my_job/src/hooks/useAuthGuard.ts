import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export function useAuthGuard() {
  const isTokenExpired = useAuthStore((state) => state.isTokenExpired())
  const logout = useAuthStore((state) => state.logout)
  const router = useRouter()

  useEffect(() => {
    if (isTokenExpired) {
      logout()
      router.push('/login')
    }
  }, [isTokenExpired, logout, router])
}