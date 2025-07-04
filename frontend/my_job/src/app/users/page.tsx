// src/app/users/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { UsersList } from '@/components/users/UsersList'

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole="Admin">
      <UsersList />
    </ProtectedRoute>
  )
}
