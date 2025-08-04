// src/app/dashboard/page.tsx
import React from 'react'
import { Metadata } from 'next'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { 
  ChartBarIcon, 
} from '@heroicons/react/24/outline'

export const metadata: Metadata = {
  title: 'Dashboard - PMCS',
  description: 'Plant Maintenance Control System Dashboard',
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-full bg-gradient-to-br from-gray-50 via-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-8">
          {/* Page Header */}
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-gray-600">
                    Welcome back! Here's what's happening with your work orders today.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Content with Error Boundary */}
          <DashboardErrorBoundary componentName="Dashboard">
            <DashboardContent />
          </DashboardErrorBoundary>
        </div>
      </div>
    </ProtectedRoute>
  )
}
