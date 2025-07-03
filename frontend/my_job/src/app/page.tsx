// src/app/dashboard/page.tsx
import React from 'react'
import { Metadata } from 'next'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { QuickStats } from '@/components/dashboard/quick-stats'
import { RecentWorkOrders } from '@/components/dashboard/recent-work-orders'
import { UpcomingJobs } from '@/components/dashboard/upcoming-jobs'
import { TechnicianStatus } from '@/components/dashboard/technician-status'
import { AssetAlerts } from '@/components/dashboard/asset-alerts'
import { PerformanceCharts } from '@/components/dashboard/performance-charts'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { InventoryStatus } from '@/components/dashboard/inventory-status'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'WorkOrder Pro Dashboard - Overview of work orders, jobs, and system status',
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening with your work orders today.
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Quick Stats Grid */}
      <QuickStats />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dashboard Overview */}
          <DashboardOverview />
          
          {/* Performance Charts */}
          <PerformanceCharts />
          
          {/* Recent Work Orders */}
          <RecentWorkOrders />
        </div>

        {/* Right Column - Sidebar Content */}
        <div className="space-y-6">
          {/* Upcoming Jobs */}
          <UpcomingJobs />
          
          {/* Technician Status */}
          <TechnicianStatus />
          
          {/* Asset Alerts */}
          <AssetAlerts />
          
          {/* Inventory Status */}
          <InventoryStatus />
        </div>
      </div>
    </div>
  )
}