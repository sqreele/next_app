// src/components/layout/header.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  MagnifyingGlassIcon,
  BellIcon,
  PlusIcon,
  Bars3Icon,
  UserCircleIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'

const quickStats = [
  { name: 'Open', value: 12, color: 'bg-red-50 text-red-700 border-red-200' },
  { name: 'In Progress', value: 8, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { name: 'Completed', value: 15, color: 'bg-green-50 text-green-700 border-green-200' },
  { name: 'Overdue', value: 3, color: 'bg-red-50 text-red-700 border-red-200' },
]

const notifications = [
  { id: 1, title: 'New work order assigned', message: 'WO-2024-001 has been assigned to you', time: '2 min ago', unread: true },
  { id: 2, title: 'Asset maintenance due', message: 'HVAC Unit #3 requires maintenance', time: '5 min ago', unread: true },
  { id: 3, title: 'Low inventory alert', message: 'Filter cartridges running low', time: '10 min ago', unread: false },
]

export function Header() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="lg:hidden">
              <Bars3Icon className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            {/* Mobile navigation content */}
            <div className="mt-6">
              <nav className="space-y-2">
                {/* Add mobile navigation items here */}
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        {/* Search */}
        <div className="flex flex-1 items-center gap-4">
          <form onSubmit={handleSearch} className="relative max-w-md flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search work orders, assets, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </form>

          {/* Quick Stats - Hidden on mobile */}
          <div className="hidden xl:flex items-center gap-2">
            {quickStats.map((stat) => (
              <div
                key={stat.name}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${stat.color}`}
              >
                <div className="text-lg font-semibold">{stat.value}</div>
                <div className="text-xs font-medium">{stat.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Quick Action */}
          <Link href="/work-orders/create" className="hidden sm:inline-flex">
            <Button type="button" className="flex items-center">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Work Order
            </Button>
          </Link>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
                <span className="sr-only">View notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex flex-col items-start p-4 cursor-pointer"
                  >
                    <div className="flex w-full items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{notification.title}</span>
                          {notification.unread && (
                            <div className="h-2 w-2 rounded-full bg-blue-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/notifications" className="w-full text-center">
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">JD</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">John Doe</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    john.doe@company.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserCircleIcon className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <CogIcon className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Properties Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserCircleIcon className="h-5 w-5 text-blue-600" />
                </div>
                <span className="sr-only">Open user properties</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-white">JD</span>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">John Doe</div>
                  <div className="text-sm text-gray-500">john.doe@company.com</div>
                  <div className="text-xs text-gray-400 mt-1">Role: Admin</div>
                </div>
                <div className="w-full mt-4">
                  <div className="font-medium mb-2 text-gray-700">Quick Settings</div>
                  <div className="space-y-2">
                    <Button variant="secondary" className="w-full">Profile</Button>
                    <Button variant="secondary" className="w-full">Settings</Button>
                    <Button variant="default" className="w-full">Log out</Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}