// src/app/(dashboard)/layout.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
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
  BellIcon,
  MagnifyingGlassIcon,
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
}

interface User {
  name: string
  email: string
  role: string
  avatar?: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

// Navigation configuration
const navigation: NavigationItem[] = [
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
]

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

// Mock user data
const user: User = {
  name: 'John Technician',
  email: 'john@company.com',
  role: 'Senior Technician',
  avatar: '/avatars/john.jpg',
}

// Quick stats for dashboard
const quickStats = [
  { name: 'Open Work Orders', value: 12, color: 'text-red-600', bgColor: 'bg-red-50' },
  { name: 'In Progress', value: 8, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  { name: 'Completed Today', value: 15, color: 'text-green-600', bgColor: 'bg-green-50' },
  { name: 'Overdue', value: 3, color: 'text-red-600', bgColor: 'bg-red-50' },
]

// Recent notifications
const notifications = [
  { id: 1, message: 'New work order assigned', time: '2 min ago', type: 'info' },
  { id: 2, message: 'Asset maintenance due', time: '5 min ago', type: 'warning' },
  { id: 3, message: 'Low inventory alert', time: '10 min ago', type: 'error' },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

// Sidebar Component
function Sidebar({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void }) {
  const pathname = usePathname()

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
                    <span className="ml-2 text-xl font-bold text-gray-900">WorkOrder Pro</span>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <SidebarContent pathname={pathname} />
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
            <span className="ml-2 text-xl font-bold text-gray-900">WorkOrder Pro</span>
          </div>
          <SidebarContent pathname={pathname} />
        </div>
      </div>
    </>
  )
}

// Sidebar Content Component
function SidebarContent({ pathname }: { pathname: string }) {
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
              {user.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.role}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Header Component
function Header({ setSidebarOpen }: { setSidebarOpen: (open: boolean) => void }) {
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search */}
        <div className="relative flex flex-1 items-center">
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              placeholder="Search work orders, assets, customers..."
              type="search"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="hidden lg:flex lg:items-center lg:gap-x-4">
          {quickStats.map((stat) => (
            <div key={stat.name} className={classNames(stat.bgColor, 'rounded-lg px-3 py-2')}>
              <div className="text-xs font-medium text-gray-600">{stat.name}</div>
              <div className={classNames(stat.color, 'text-lg font-semibold')}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Quick Action Button */}
          <Link
            href="/work-orders/create"
            className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            New Work Order
          </Link>

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="px-4 py-3 hover:bg-gray-50">
                        <p className="text-sm text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-200">
                    <Link href="/notifications" className="text-sm text-blue-600 hover:text-blue-500">
                      View all notifications
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              className="-m-1.5 flex items-center p-1.5"
            >
              <span className="sr-only">Open user menu</span>
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
                  {user.name}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Layout Component
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="lg:pl-80">
        <Header setSidebarOpen={setSidebarOpen} />

        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}