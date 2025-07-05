// src/app/dashboard/layout.tsx (Updated)
'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/auth-store'
import { Header } from '@/components/layout/header'
import {
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CubeIcon,
  MapPinIcon,
  UserCircleIcon,
  ChartBarIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  HomeIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { 
  ClipboardDocumentListIcon as ClipboardSolid,
  WrenchScrewdriverIcon as WrenchSolid,
  BuildingOfficeIcon as BuildingSolid,
  UsersIcon as UsersSolid,
  CubeIcon as CubeSolid,
  MapPinIcon as MapSolid,
  UserCircleIcon as UserSolid,
  ChartBarIcon as ChartSolid,
  CogIcon as CogSolid,
  QuestionMarkCircleIcon as QuestionSolid,
  HomeIcon as HomeSolid,
  DevicePhoneMobileIcon as MobileSolid,
} from '@heroicons/react/24/solid'

// Types
interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  iconSolid: React.ComponentType<{ className?: string }>
  badge?: number
  children?: NavigationItem[]
  adminOnly?: boolean
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

// Navigation configuration
const getNavigation = (userRole: string): NavigationItem[] => [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    iconSolid: HomeSolid,
  },
  {
    name: 'Work Orders',
    href: '/work-orders',
    icon: ClipboardDocumentListIcon,
    iconSolid: ClipboardSolid,
    badge: 12,
    children: [
      { name: 'All Work Orders', href: '/work-orders', icon: ClipboardDocumentListIcon, iconSolid: ClipboardSolid },
      { name: 'Create New', href: '/work-orders/create', icon: PlusIcon, iconSolid: PlusIcon },
      { name: 'Templates', href: '/work-orders/templates', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Categories', href: '/work-orders/categories', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Recurring', href: '/work-orders/recurring', icon: ClockIcon, iconSolid: ClockIcon },
    ],
  },
  {
    name: 'Jobs',
    href: '/jobs',
    icon: WrenchScrewdriverIcon,
    iconSolid: WrenchSolid,
    badge: 8,
    children: [
      { name: 'All Jobs', href: '/jobs', icon: WrenchScrewdriverIcon, iconSolid: WrenchSolid },
      { name: 'Calendar', href: '/jobs/calendar', icon: CalendarIcon, iconSolid: CalendarIcon },
      { name: 'Scheduler', href: '/jobs/scheduler', icon: ClockIcon, iconSolid: ClockIcon },
      { name: 'Kanban Board', href: '/jobs/board', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Gantt Chart', href: '/jobs/gantt', icon: ChartBarIcon, iconSolid: ChartSolid },
    ],
  },
  {
    name: 'Assets',
    href: '/assets',
    icon: CubeIcon,
    iconSolid: CubeSolid,
    children: [
      { name: 'All Assets', href: '/assets', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Categories', href: '/assets/categories', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Maintenance', href: '/assets/maintenance', icon: WrenchScrewdriverIcon, iconSolid: WrenchSolid },
      { name: 'Inventory', href: '/assets/inventory', icon: CubeIcon, iconSolid: CubeSolid },
    ],
  },
  {
    name: 'Machines',
    href: '/machines',
    icon: CubeIcon,
    iconSolid: CubeSolid,
    children: [
      { name: 'All Machines', href: '/machines', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Add Machine', href: '/machines/create', icon: PlusIcon, iconSolid: PlusIcon },
    ],
  },
  {
    name: 'Technicians',
    href: '/technicians',
    icon: UsersIcon,
    iconSolid: UsersSolid,
    children: [
      { name: 'All Technicians', href: '/technicians', icon: UsersIcon, iconSolid: UsersSolid },
      { name: 'Teams', href: '/technicians/teams', icon: UsersIcon, iconSolid: UsersSolid },
      { name: 'Skills', href: '/technicians/skills', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Schedules', href: '/technicians/schedules', icon: CalendarIcon, iconSolid: CalendarIcon },
      { name: 'Availability', href: '/technicians/availability', icon: ClockIcon, iconSolid: ClockIcon },
    ],
  },
  {
    name: 'Users',
    href: '/users',
    icon: UserCircleIcon,
    iconSolid: UserSolid,
    adminOnly: true,
    children: [
      { name: 'All Users', href: '/users', icon: UserCircleIcon, iconSolid: UserSolid },
      { name: 'Add User', href: '/users/create', icon: PlusIcon, iconSolid: PlusIcon },
      { name: 'Roles', href: '/users/roles', icon: CubeIcon, iconSolid: CubeSolid },
    ],
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: CubeIcon,
    iconSolid: CubeSolid,
    children: [
      { name: 'Overview', href: '/inventory', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Parts', href: '/inventory/parts', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Tools', href: '/inventory/tools', icon: WrenchScrewdriverIcon, iconSolid: WrenchSolid },
      { name: 'Suppliers', href: '/inventory/suppliers', icon: BuildingOfficeIcon, iconSolid: BuildingSolid },
      { name: 'Purchase Orders', href: '/inventory/purchase-orders', icon: ClipboardDocumentListIcon, iconSolid: ClipboardSolid },
      { name: 'Stock Levels', href: '/inventory/stock-levels', icon: ChartBarIcon, iconSolid: ChartSolid },
    ],
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: UserCircleIcon,
    iconSolid: UserSolid,
    children: [
      { name: 'All Customers', href: '/customers', icon: UserCircleIcon, iconSolid: UserSolid },
      { name: 'Customer Types', href: '/customers/types', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Contacts', href: '/customers/contacts', icon: UsersIcon, iconSolid: UsersSolid },
    ],
  },
  {
    name: 'Locations',
    href: '/locations',
    icon: MapPinIcon,
    iconSolid: MapSolid,
    children: [
      { name: 'All Locations', href: '/locations', icon: MapPinIcon, iconSolid: MapSolid },
      { name: 'Buildings', href: '/locations/buildings', icon: BuildingOfficeIcon, iconSolid: BuildingSolid },
      { name: 'Work Zones', href: '/locations/zones', icon: MapPinIcon, iconSolid: MapSolid },
    ],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: ChartBarIcon,
    iconSolid: ChartSolid,
    children: [
      { name: 'Dashboard', href: '/reports', icon: ChartBarIcon, iconSolid: ChartSolid },
      { name: 'Work Orders', href: '/reports/work-orders', icon: ClipboardDocumentListIcon, iconSolid: ClipboardSolid },
      { name: 'Productivity', href: '/reports/productivity', icon: ChartBarIcon, iconSolid: ChartSolid },
      { name: 'Costs', href: '/reports/costs', icon: ChartBarIcon, iconSolid: ChartSolid },
      { name: 'Downtime', href: '/reports/downtime', icon: ExclamationTriangleIcon, iconSolid: ExclamationTriangleIcon },
      { name: 'Custom Reports', href: '/reports/custom', icon: CogIcon, iconSolid: CogSolid },
    ],
  },
  {
    name: 'Mobile App',
    href: '/mobile',
    icon: DevicePhoneMobileIcon,
    iconSolid: MobileSolid,
    children: [
      { name: 'Work Orders', href: '/mobile/work-orders', icon: ClipboardDocumentListIcon, iconSolid: ClipboardSolid },
      { name: 'Checklist', href: '/mobile/checklist', icon: CheckCircleIcon, iconSolid: CheckCircleIcon },
      { name: 'Time Tracking', href: '/mobile/time-tracking', icon: ClockIcon, iconSolid: ClockIcon },
      { name: 'Inventory', href: '/mobile/inventory', icon: CubeIcon, iconSolid: CubeSolid },
      { name: 'Offline Sync', href: '/mobile/offline', icon: DevicePhoneMobileIcon, iconSolid: MobileSolid },
    ],
  },
].filter(item => !item.adminOnly || userRole === 'Admin')

const secondaryNavigation: NavigationItem[] = [
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    iconSolid: CogSolid,
  },
  {
    name: 'Help',
    href: '/help',
    icon: QuestionMarkCircleIcon,
    iconSolid: QuestionSolid,
  },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

// Sidebar Component
function Sidebar({ 
  sidebarOpen, 
  setSidebarOpen, 
  user 
}: { 
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  user: any
}) {
  const pathname = usePathname()
  const navigation = getNavigation(user?.profile?.role || '')

  return (
    <>
      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl"
              >
                <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
                  <div className="flex items-center">
                    <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600" />
                    <span className="ml-2 text-xl font-bold text-gray-900">PMCS</span>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <SidebarContent pathname={pathname} navigation={navigation} user={user} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-6 border-b border-gray-200">
            <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">PMCS</span>
          </div>
          <SidebarContent pathname={pathname} navigation={navigation} user={user} />
        </div>
      </div>
    </>
  )
}

// Sidebar Content Component
function SidebarContent({ 
  pathname, 
  navigation,
  user 
}: { 
  pathname: string
  navigation: NavigationItem[]
  user: any
}) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto py-4">
      <nav className="flex-1 space-y-1 px-4">
        {navigation.map((item) => {
          const isExpanded = expandedItems.includes(item.name)
          const isItemActive = isActive(item.href)
          const IconComponent = isItemActive ? item.iconSolid : item.icon

          return (
            <div key={item.name}>
              <div className="group">
                {item.children ? (
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={classNames(
                      isItemActive
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex w-full items-center rounded-lg border-l-4 py-2 pl-4 pr-3 text-left text-sm font-medium transition-colors duration-150'
                    )}
                  >
                    <IconComponent
                      className={classNames(
                        isItemActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                        'mr-3 h-5 w-5 flex-shrink-0'
                      )}
                    />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={classNames(
                      isItemActive
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center rounded-lg border-l-4 py-2 pl-4 pr-3 text-sm font-medium transition-colors duration-150'
                    )}
                  >
                    <IconComponent
                      className={classNames(
                        isItemActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                        'mr-3 h-5 w-5 flex-shrink-0'
                      )}
                    />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}
              </div>

              {/* Submenu */}
              <AnimatePresence>
                {item.children && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 space-y-1 pl-8">
                      {item.children.map((child) => {
                        const isChildActive = isActive(child.href)
                        const ChildIcon = isChildActive ? child.iconSolid : child.icon

                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={classNames(
                              isChildActive
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                              'group flex items-center rounded-md py-2 pl-4 pr-3 text-sm font-medium transition-colors duration-150'
                            )}
                          >
                            <ChildIcon
                              className={classNames(
                                isChildActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                                'mr-3 h-4 w-4 flex-shrink-0'
                              )}
                            />
                            {child.name}
                          </Link>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Secondary Navigation */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          {secondaryNavigation.map((item) => {
            const isItemActive = isActive(item.href)
            const IconComponent = isItemActive ? item.iconSolid : item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={classNames(
                  isItemActive
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  'group flex items-center rounded-lg border-l-4 py-2 pl-4 pr-3 text-sm font-medium transition-colors duration-150'
                )}
              >
                <IconComponent
                  className={classNames(
                    isItemActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 h-5 w-5 flex-shrink-0'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="mt-auto border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {user?.username?.substring(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.username || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.profile?.role || 'Role'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Layout Component
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, isAuthenticated } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)

  // Hydration check
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user} />

      <div className="lg:pl-80">
        <Header />

        {/* Mobile menu button */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            <h1 className="text-lg font-medium text-gray-900">Dashboard</h1>
            <div className="w-6"></div> {/* Spacer for centering */}
          </div>
        </div>

        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
