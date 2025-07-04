// src/components/layout/header.tsx (Updated - Continued)
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MagnifyingGlassIcon,
  BellIcon,
  PlusIcon,
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
  const { user, logout, isAuthenticated } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const unreadCount = notifications.filter(n => n.unread).length

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6">
          <div className="bg-green-500 rounded-lg h-8 w-8 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-gray-900 hidden sm:block">PMCS</span>
        </Link>

        {/* Search */}
        <div className="flex flex-1 items-center gap-4">
          <form onSubmit={handleSearch} className="relative max-w-md flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search work orders, assets, users..."
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
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.username}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.profile.role} - {user.profile.position}
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
              {user.profile.role === 'Admin' && (
                <DropdownMenuItem asChild>
                  <Link href="/users">
                    <UserCircleIcon className="mr-2 h-4 w-4" />
                    Manage Users
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
