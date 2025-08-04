'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WiFiIcon, SignalSlashIcon, CloudIcon } from '@heroicons/react/24/outline'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useNetworkStatus } from '@/hooks/use-api-state'
import { healthCheck } from '@/lib/api-client'

interface NetworkStatusProps {
  className?: string
  showWhenOnline?: boolean
}

export function NetworkStatus({ className = '', showWhenOnline = false }: NetworkStatusProps) {
  const { isOnline, isOffline } = useNetworkStatus()
  const [apiStatus, setApiStatus] = useState<'healthy' | 'unhealthy' | 'checking'>('checking')
  const [showStatus, setShowStatus] = useState(false)

  // Check API health when network comes back online
  useEffect(() => {
    const checkApiHealth = async () => {
      if (isOnline) {
        setApiStatus('checking')
        try {
          const healthy = await healthCheck()
          setApiStatus(healthy ? 'healthy' : 'unhealthy')
        } catch {
          setApiStatus('unhealthy')
        }
      }
    }

    checkApiHealth()
  }, [isOnline])

  // Show status for offline, API issues, or when explicitly requested
  useEffect(() => {
    setShowStatus(isOffline || apiStatus === 'unhealthy' || (showWhenOnline && isOnline))
  }, [isOffline, apiStatus, showWhenOnline, isOnline])

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (isOnline && apiStatus === 'healthy' && showStatus) {
      const timer = setTimeout(() => {
        if (!showWhenOnline) {
          setShowStatus(false)
        }
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, apiStatus, showStatus, showWhenOnline])

  const getStatusConfig = () => {
    if (isOffline) {
      return {
        icon: SignalSlashIcon,
        title: 'No Internet Connection',
        description: 'You\'re currently offline. Some features may not be available.',
        variant: 'destructive' as const,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-700'
      }
    }

    if (apiStatus === 'unhealthy') {
      return {
        icon: CloudIcon,
        title: 'Server Connection Issues',
        description: 'We\'re having trouble connecting to our servers. Please try again in a moment.',
        variant: 'destructive' as const,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-700'
      }
    }

    if (apiStatus === 'checking') {
      return {
        icon: WiFiIcon,
        title: 'Checking Connection',
        description: 'Verifying server connectivity...',
        variant: 'default' as const,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700'
      }
    }

    // Online and healthy
    return {
      icon: WiFiIcon,
      title: 'Connected',
      description: 'You\'re back online and connected to our servers.',
      variant: 'default' as const,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700'
    }
  }

  const config = getStatusConfig()

  const handleRetry = async () => {
    setApiStatus('checking')
    try {
      const healthy = await healthCheck()
      setApiStatus(healthy ? 'healthy' : 'unhealthy')
    } catch {
      setApiStatus('unhealthy')
    }
  }

  if (!showStatus) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3 }}
        className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 ${className}`}
      >
        <Alert variant={config.variant} className={`${config.bgColor} ${config.borderColor}`}>
          <config.icon className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-medium ${config.textColor}`}>
                  {config.title}
                </div>
                <div className={`text-sm ${config.textColor} opacity-90`}>
                  {config.description}
                </div>
              </div>
              
              {(isOffline || apiStatus === 'unhealthy') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isOffline}
                  className="ml-3"
                >
                  Retry
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  )
}

// Simpler inline network indicator for use in other components
export function NetworkIndicator({ className = '' }: { className?: string }) {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  return (
    <div className={`inline-flex items-center gap-1 text-red-600 text-xs ${className}`}>
      <SignalSlashIcon className="h-3 w-3" />
      <span>Offline</span>
    </div>
  )
}

export default NetworkStatus