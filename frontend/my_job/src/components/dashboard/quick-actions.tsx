// src/components/dashboard/quick-actions.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  PlusIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

const quickActions = [
  {
    label: 'New Work Order',
    href: '/work-orders/create',
    icon: ClipboardDocumentListIcon,
    description: 'Create a new work order',
  },
  {
    label: 'Schedule Job',
    href: '/jobs/create',
    icon: WrenchScrewdriverIcon,
    description: 'Schedule a new job or task',
  },
  {
    label: 'Add Asset',
    href: '/assets/create',
    icon: CubeIcon,
    description: 'Register a new asset',
  },
  {
    label: 'Add Technician',
    href: '/technicians/create',
    icon: UsersIcon,
    description: 'Add a new team member',
  },
]

export function QuickActions() {
  return (
    <div className="flex gap-2">
      {/* Primary Action */}
      <Link href="/work-orders/create">
        <Button>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Work Order
        </Button>
      </Link>

      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            <ChevronDownIcon className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {quickActions.map((action) => (
            <DropdownMenuItem key={action.label} asChild>
              <Link href={action.href} className="flex items-center">
                <action.icon className="h-4 w-4 mr-3" />
                <div>
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </div>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}