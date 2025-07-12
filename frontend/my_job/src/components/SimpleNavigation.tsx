import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function SimpleNavigation() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Work Order System
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/create-work-order">
              <Button>
                Create Work Order
              </Button>
            </Link>
            
            <Link href="/dashboard">
              <Button variant="secondary">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
} 