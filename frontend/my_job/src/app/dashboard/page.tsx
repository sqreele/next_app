// src/app/dashboard/page.tsx
import React from 'react'
import { Metadata } from 'next'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardErrorBoundary } from '@/components/dashboard/error-boundary'
import { TechnicianStatus } from '@/components/dashboard/dashboard-overview'
import { QuickStats } from '@/components/dashboard/quick-stats'
import { RecentWorkOrders } from '@/components/dashboard/recent-work-orders'
import { UpcomingJobs } from '@/components/dashboard/upcoming-jobs'
import { AssetAlerts } from '@/components/dashboard/asset-alerts'
import { PerformanceCharts } from '@/components/dashboard/performance-charts'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { InventoryStatus } from '@/components/dashboard/inventory-status'
import { 
  ChartBarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  CogIcon
} from '@heroicons/react/24/outline'

export const metadata: Metadata = {
  title: 'Dashboard - PMCS',
  description: 'Plant Maintenance Control System Dashboard',
}

// Error fallback component for individual sections
const DashboardSectionError = ({ title, onRetry }: { title: string; onRetry?: () => void }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
    <div className="flex items-center gap-2 mb-6">
      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
    </div>
    <div className="text-center py-8">
      <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <p className="text-gray-600 mb-4">Unable to load {title.toLowerCase()} data</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
)

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
            <QuickActions />
          </div>

          {/* Quick Stats with Error Boundary */}
          <DashboardErrorBoundary
            fallback={<DashboardSectionError title="Quick Stats" />}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
              <QuickStats />
            </div>
          </DashboardErrorBoundary>

          {/* Main Content Grid */}
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
            {/* Left/Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overview Section */}
              <DashboardErrorBoundary
                fallback={<DashboardSectionError title="Overview" />}
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <ChartBarIcon className="w-5 h-5 text-green-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Overview</h2>
                  </div>
                  <TechnicianStatus />
                </div>
              </DashboardErrorBoundary>

              {/* Performance Section */}
              <DashboardErrorBoundary
                fallback={<DashboardSectionError title="Performance" />}
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <CogIcon className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Performance</h2>
                  </div>
                  <PerformanceCharts />
                </div>
              </DashboardErrorBoundary>

              {/* Recent Work Orders Section */}
              <DashboardErrorBoundary
                fallback={<DashboardSectionError title="Recent Work Orders" />}
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <ClockIcon className="w-5 h-5 text-purple-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Recent Work Orders</h2>
                  </div>
                  <RecentWorkOrders />
                </div>
              </DashboardErrorBoundary>
            </div>

            {/* Right/Sidebar */}
            <div className="space-y-8">
              {/* Upcoming Jobs */}
              <DashboardErrorBoundary
                fallback={<DashboardSectionError title="Upcoming Jobs" />}
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ClockIcon className="w-5 h-5 text-orange-600" />
                    <h2 className="text-lg font-semibold text-gray-700">Upcoming Jobs</h2>
                  </div>
                  <UpcomingJobs />
                </div>
              </DashboardErrorBoundary>

              {/* Technician Status */}
              <DashboardErrorBoundary
                fallback={<DashboardSectionError title="Technician Status" />}
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <UserGroupIcon className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-700">Technician Status</h2>
                  </div>
                  <TechnicianStatus />
                </div>
              </DashboardErrorBoundary>

              {/* Asset Alerts */}
              <DashboardErrorBoundary
                fallback={<DashboardSectionError title="Asset Alerts" />}
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    <h2 className="text-lg font-semibold text-gray-700">Asset Alerts</h2>
                  </div>
                  <AssetAlerts />
                </div>
              </DashboardErrorBoundary>

              {/* Inventory Status */}
              <DashboardErrorBoundary
                fallback={<DashboardSectionError title="Inventory Status" />}
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-700">Inventory Status</h2>
                  </div>
                  <InventoryStatus />
                </div>
              </DashboardErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
