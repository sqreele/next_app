import { SimpleWorkOrderForm } from '@/components/SimpleWorkOrderForm'
import { useAuthGuard } from '@/hooks/useAuthGuard'

export default function CreateWorkOrderPage() {
  useAuthGuard()
  return (
    <div className="min-h-full bg-gray-50 py-8">
      <div className="container mx-auto pb-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create Work Order</h1>
          <p className="mt-2 text-gray-600">Fill out the form below to create a new work order</p>
        </div>
        
        <SimpleWorkOrderForm 
          onSubmit={(data) => {
            console.log('Work order submitted:', data)
          }}
          onCancel={() => {
            window.history.back()
          }}
        />
      </div>
    </div>
  )
} 