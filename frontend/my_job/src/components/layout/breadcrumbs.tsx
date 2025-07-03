// src/components/layout/breadcrumbs.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  name: string
  href: string
  current?: boolean
}

const pathNameMap: Record<string, string> = {
  dashboard: 'Dashboard',
  'work-orders': 'Work Orders',
  jobs: 'Jobs',
  assets: 'Assets',
  technicians: 'Technicians',
  inventory: 'Inventory',
  customers: 'Customers',
  locations: 'Locations',
  reports: 'Reports',
  settings: 'Settings',
  create: 'Create',
  edit: 'Edit',
  templates: 'Templates',
  categories: 'Categories',
  calendar: 'Calendar',
  scheduler: 'Scheduler',
  board: 'Kanban Board',
  gantt: 'Gantt Chart',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  
  // Don't show breadcrumbs on dashboard
  if (pathname === '/dashboard') {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  
// src/components/layout/breadcrumbs.tsx (continued)
const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Dashboard', href: '/dashboard' },
  ]
 
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1
    
    // Skip dynamic routes like [id]
    if (segment.startsWith('[') && segment.endsWith(']')) {
      return
    }
    
    breadcrumbs.push({
      name: pathNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: currentPath,
      current: isLast,
    })
  })
 
  return (
    <nav className="flex border-b border-gray-200 bg-white px-4 py-3 sm:px-6 lg:px-8" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-500">
            <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {breadcrumbs.slice(1).map((item) => (
          <li key={item.name}>
            <div className="flex items-center">
              <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
              <Link
                href={item.href}
                className={cn(
                  'ml-2 text-sm font-medium',
                  item.current
                    ? 'text-gray-500'
                    : 'text-gray-700 hover:text-gray-900'
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.name}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
 }