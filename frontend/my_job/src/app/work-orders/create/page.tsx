// src/app/work-orders/create/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CreateWorkOrderForm } from '@/components/forms/CreateWorkOrderForm'

export default function CreateWorkOrderPage() {
  return (
    <ProtectedRoute>
      <CreateWorkOrderForm />
    </ProtectedRoute>
  )
}
