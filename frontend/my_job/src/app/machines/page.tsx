// src/app/machines/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { MachinesList } from '@/components/machines/MachinesList'

export default function MachinesPage() {
  return (
    <ProtectedRoute>
      <MachinesList />
    </ProtectedRoute>
  )
}
