'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangleIcon, RefreshCwIcon, WiFiOffIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { networkMonitor } from '@/lib/api-client'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
  isOffline: boolean
}

class ErrorBoundary extends Component<Props, State> {
  private networkUnsubscribe?: () => void

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isOffline: false
    }
  }

  componentDidMount() {
    // Monitor network status
    this.setState({ isOffline: !networkMonitor.isNetworkOnline() })
    this.networkUnsubscribe = networkMonitor.onNetworkChange((isOnline) => {
      this.setState({ isOffline: !isOnline })
      if (isOnline && this.state.hasError) {
        // Auto retry when network comes back online
        this.handleRetry()
      }
    })
  }

  componentWillUnmount() {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe()
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error for debugging
    console.error('Error Boundary caught an error:', error, errorInfo)

    // Report to error tracking service if available
    // reportError(error, errorInfo)
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))

    toast.success('Retrying...', { duration: 2000 })
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isNetworkError = this.state.error?.message?.includes('Network') ||
                            this.state.error?.message?.includes('fetch') ||
                            this.state.isOffline

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                {this.state.isOffline ? (
                  <WiFiOffIcon className="w-6 h-6 text-red-600" />
                ) : (
                  <AlertTriangleIcon className="w-6 h-6 text-red-600" />
                )}
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {this.state.isOffline ? 'No Internet Connection' : 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-gray-600">
                {this.state.isOffline ? (
                  <p>Please check your internet connection and try again.</p>
                ) : isNetworkError ? (
                  <p>We're having trouble connecting to our servers. Please try again in a moment.</p>
                ) : (
                  <p>An unexpected error occurred. Our team has been notified.</p>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-gray-100 p-3 rounded-lg text-sm font-mono text-gray-700 max-h-40 overflow-auto">
                  <div className="font-bold mb-1">Error Details:</div>
                  <div>{this.state.error.toString()}</div>
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2">
                      <div className="font-bold">Component Stack:</div>
                      <div className="whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1"
                  disabled={this.state.isOffline && isNetworkError}
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Try Again
                  {this.state.retryCount > 0 && ` (${this.state.retryCount})`}
                </Button>
                <Button
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="flex-1"
                >
                  Refresh Page
                </Button>
              </div>

              {this.state.retryCount > 2 && (
                <div className="text-center">
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant="link"
                    className="text-sm"
                  >
                    Go to Home Page
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary