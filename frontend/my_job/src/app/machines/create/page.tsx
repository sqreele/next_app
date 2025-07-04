// src/app/machines/create/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CreateMachineForm } from '@/components/forms/CreateMachineForm'

export default function CreateMachinePage() {
  return (
    <ProtectedRoute>
      <CreateMachineForm />
    </ProtectedRoute>
  )
}
