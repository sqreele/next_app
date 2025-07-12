import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Work Order Management System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Streamline your maintenance operations with our easy-to-use work order system.
            Create, track, and manage work orders efficiently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📝</span>
                Create Work Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Create a new work order with all the necessary details including location, 
                priority, and photo documentation.
              </p>
              <Link href="/create-work-order">
                <Button className="w-full">
                  Create New Work Order
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                View Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                View all work orders, track progress, and manage your maintenance tasks 
                from a centralized dashboard.
              </p>
              <Link href="/dashboard">
                <Button variant="secondary" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚙️</span>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Access frequently used features and quick actions to streamline your workflow.
              </p>
              <div className="space-y-2">
                <Link href="/create-work-order">
                  <Button variant="secondary" size="sm" className="w-full">
                    Quick Work Order
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary" size="sm" className="w-full">
                    View All Orders
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Getting Started
          </h2>
          <div className="max-w-2xl mx-auto text-gray-600 space-y-2">
            <p>1. Click "Create Work Order" to start a new maintenance request</p>
            <p>2. Fill in the required information including title, description, and location</p>
            <p>3. Upload before and after photos to document the work</p>
            <p>4. Assign the work order to a team member</p>
            <p>5. Track progress through the dashboard</p>
          </div>
        </div>
      </div>
    </div>
  )
}
