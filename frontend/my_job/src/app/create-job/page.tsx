// frontend/my_job/src/app/create-job/page.tsx
'use client'

import { Suspense } from 'react'
import { ImprovedWorkOrderForm } from '@/components/forms/ImprovedWorkOrderForm'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent } from '@/components/ui/card'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'

function CreateJobPageContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Work Order</h1>
          <p className="text-gray-600">Fill out the form to create a new work order</p>
        </div>
      </div>
      
      <ImprovedWorkOrderForm />
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CreateWorkOrderPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <CreateJobPageContent />
      </Suspense>
    </ProtectedRoute>
  )
}
