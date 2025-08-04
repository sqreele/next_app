// src/components/dashboard/error-boundary.tsx
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangleIcon, RefreshCwIcon, WifiIcon } from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  isRetrying: boolean
}

export class DashboardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRetrying: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null,
      isRetrying: false
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  private handleRetry = async () => {
    this.setState({ isRetrying: true })
    
    try {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Reset the error state
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        isRetrying: false 
      })
    } catch (error) {
      console.error('Error during retry:', error)
      this.setState({ isRetrying: false })
    }
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  private isNetworkError = (error: Error): boolean => {
    const networkErrorMessages = [
      'Network Error',
      'fetch failed',
      'Request failed',
      'Connection refused',
      'ECONNREFUSED',
      'ENOTFOUND',
      'timeout',
      'SSL handshake failed',
      '525',
      '502',
      '503',
      '504'
    ]
    
    return networkErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    )
  }

  private isAuthError = (error: Error): boolean => {
    const authErrorMessages = [
      '401',
      '403',
      'unauthorized',
      'forbidden',
      'token',
      'session expired'
    ]
    
    return authErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    )
  }

  public render() {
    if (this.state.hasError) {
      const { error } = this.state
      const isNetwork = error && this.isNetworkError(error)
      const isAuth = error && this.isAuthError(error)

      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangleIcon className="h-5 w-5" />
              {isNetwork ? 'Connection Error' : isAuth ? 'Authentication Error' : 'Something went wrong'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-red-700">
              {isNetwork ? (
                <div className="space-y-2">
                  <p>Unable to connect to the server. This could be due to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Network connectivity issues</li>
                    <li>Server maintenance</li>
                    <li>SSL certificate problems</li>
                    <li>Temporary service outage</li>
                  </ul>
                </div>
              ) : isAuth ? (
                <div className="space-y-2">
                  <p>Authentication error. This could be due to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Session expired</li>
                    <li>Invalid credentials</li>
                    <li>Token refresh failure</li>
                  </ul>
                </div>
              ) : (
                <p>An unexpected error occurred while loading the dashboard data.</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={this.handleRetry}
                disabled={this.state.isRetrying}
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCwIcon className={`h-4 w-4 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
                {this.state.isRetrying ? 'Retrying...' : 'Try Again'}
              </Button>
              
              {isNetwork && (
                <Button
                  onClick={this.handleRefresh}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <WifiIcon className="h-4 w-4" />
                  Refresh Page
                </Button>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-red-600">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                  {error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error)
    setError(error)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  return { error, handleError, clearError }
}

// Higher-order component for wrapping components with error handling
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  return (props: P) => (
    <DashboardErrorBoundary fallback={fallback}>
      <Component {...props} />
    </DashboardErrorBoundary>
  )
}