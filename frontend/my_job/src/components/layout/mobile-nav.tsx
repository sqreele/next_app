// src/components/layout/mobile-nav.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  WrenchScrewdriverIcon as WrenchSolid,
  CubeIcon as CubeSolid,
  UsersIcon as UsersSolid,
  ChartBarIcon as ChartSolid,
} from '@heroicons/react/24/solid'

const mobileNavigation = [
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
  },
  {
    name: 'Jobs',
    href: '/jobs',
    icon: WrenchScrewdriverIcon,
    iconSolid: WrenchSolid,
  },
  {
    name: 'Assets',
    href: '/assets',
    icon: CubeIcon,
    iconSolid: CubeSolid,
  },
  {
    name: 'Team',
    href: '/technicians',
    icon: UsersIcon,
    iconSolid: UsersSolid,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: ChartBarIcon,
    iconSolid: ChartSolid,
  },
]

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200">
      <div className="grid grid-cols-6 gap-1 px-2 py-1">
        {mobileNavigation.map((item) => {
          const isItemActive = isActive(item.href)
          const IconComponent = isItemActive ? item.iconSolid : item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center px-2 py-2 text-xs font-medium rounded-lg transition-colors duration-150',
                isItemActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <IconComponent className="h-5 w-5 mb-1" />
              <span className="truncate">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}