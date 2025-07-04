// src/app/work-orders/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { WorkOrdersList } from '@/components/work-orders/WorkOrdersList'

export default function WorkOrdersPage() {
  return (
    <ProtectedRoute>
      <WorkOrdersList />
    </ProtectedRoute>
  )
}
