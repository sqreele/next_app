// src/providers/store-provider.tsx
'use client'

import React, { useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'

interface StoreProviderProps {
  children: React.ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  const initializeApp = useAppStore((state) => state.initializeApp)
  const globalLoading = useAppStore((state) => state.globalLoading)

  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  if (globalLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
