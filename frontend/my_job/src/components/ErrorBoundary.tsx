// components/ErrorBoundary.tsx
'use client'

import React, { Component, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showRetry?: boolean
  componentName?: string
  isDashboard?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
  lastErrorTime: number
}

class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3
  private retryDelay = 2000

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      lastErrorTime: Date.now()
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      (window as any).errorTracker.captureException(error, {
        extra: errorInfo,
        tags: {
          component: this.props.componentName || 'Unknown',
          errorBoundary: true
        }
      })
    }
  }

  handleRetry = () => {
    const { retryCount, lastErrorTime } = this.state
    const now = Date.now()
    
    // Check if we've exceeded max retries
    if (retryCount >= this.maxRetries) {
      console.warn('Max retries exceeded for error boundary')
      return
    }

    // Implement exponential backoff
    const timeSinceLastError = now - lastErrorTime
    const minDelay = this.retryDelay * Math.pow(2, retryCount)
    
    if (timeSinceLastError < minDelay) {
      setTimeout(this.handleRetry, minDelay - timeSinceLastError)
      return
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      lastErrorTime: now
    }))
  }

  handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  renderDashboardFallback = () => {
    const { componentName } = this.props
    const { retryCount } = this.state
    const canRetry = retryCount < this.maxRetries

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <ExclamationTriangleIcon className="h-5 w-5" />
            {componentName ? `${componentName} Unavailable` : 'Component Unavailable'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <InformationCircleIcon className="h-4 w-4" />
            <AlertDescription>
              This dashboard component is temporarily unavailable due to a loading error. 
              This might be caused by network issues or server maintenance.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {canRetry && (
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Retry ({this.maxRetries - retryCount} left)
              </Button>
            )}
            <Button 
              onClick={this.handleRefresh}
              variant="secondary"
              size="sm"
            >
              Refresh Page
            </Button>
          </div>
          
          {!canRetry && (
            <p className="text-sm text-gray-500">
              Maximum retry attempts reached. Please refresh the page or contact support if the issue persists.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  renderGeneralFallback = () => {
    const { componentName } = this.props
    const { error, retryCount } = this.state
    const canRetry = retryCount < this.maxRetries

    return (
      <div className="w-full p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              {componentName ? `${componentName} Error` : 'Something went wrong'}
            </h3>
            <p className="text-red-700 mb-4">
              An unexpected error occurred while loading this component.
            </p>
            
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-4 p-3 bg-red-100 rounded border">
                <summary className="cursor-pointer font-medium text-red-800">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-700 overflow-auto">
                  {error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex flex-wrap gap-2">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-red-50"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Try Again ({this.maxRetries - retryCount} left)
                </Button>
              )}
              <Button 
                onClick={this.handleRefresh}
                variant="secondary"
                size="sm"
              >
                Refresh Page
              </Button>
            </div>
            
            {!canRetry && (
              <p className="text-sm text-red-600 mt-3">
                This component has failed multiple times. Please refresh the page or contact support.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  render() {
    const { hasError } = this.state
    const { children, fallback, isDashboard } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Use dashboard-specific fallback for dashboard components
      if (isDashboard) {
        return this.renderDashboardFallback()
      }

      // Use general fallback for other components
      return this.renderGeneralFallback()
    }

    return children
  }
}

// Higher-order component for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Dashboard-specific error boundary wrapper
export const DashboardErrorBoundary: React.FC<{
  children: ReactNode
  componentName: string
}> = ({ children, componentName }) => (
  <ErrorBoundary
    isDashboard={true}
    componentName={componentName}
    showRetry={true}
  >
    {children}
  </ErrorBoundary>
)

// Network error fallback component
export const NetworkErrorFallback: React.FC<{
  onRetry?: () => void
  title?: string
  description?: string
}> = ({ 
  onRetry, 
  title = "Connection Issues",
  description = "Unable to load data due to network issues. Please check your connection and try again."
}) => (
  <Card className="w-full">
    <CardContent className="p-6 text-center">
      <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </CardContent>
  </Card>
)

export default ErrorBoundary