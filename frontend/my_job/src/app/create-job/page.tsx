// In your page component
import { DynamicWorkOrderForm } from '@/components/forms/DynamicWorkOrderForm'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
export default function CreateWorkOrderPage() {
  return (
  <ProtectedRoute>
    <DynamicWorkOrderForm />
  </ProtectedRoute>
  )
}
