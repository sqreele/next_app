// src/app/unauthorized/page.tsx
'use client'
import React from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function UnauthorizedPage() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. Your current role is{' '}
          <span className="font-medium text-gray-900">
            {user?.profile?.role || 'Unknown'}
          </span>
          .
        </p>
        
        <div className="space-y-3">
          <Link href="/" className="block">
            <Button className="w-full">
              Go to Dashboard
            </Button>
          </Link>
          
          <Link href="/profile" className="block">
            <Button variant="secondary" className="w-full">
              View Profile
            </Button>
          </Link>
        </div>
        
        <p className="text-sm text-gray-500 mt-6">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  )
}
