import { SimpleWorkOrderForm } from '@/components/SimpleWorkOrderForm'

export default function CreateWorkOrderPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
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