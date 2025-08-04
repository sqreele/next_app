'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { makeResilientRequest, networkMonitor, ApiError } from '@/lib/api-client'
import type { AxiosResponse } from 'axios'

interface UseApiStateOptions {
  showSuccessToast?: boolean
  showErrorToast?: boolean
  successMessage?: string
  onSuccess?: (data: any) => void
  onError?: (error: ApiError) => void
  maxRetries?: number
  autoRetryOnNetworkRestore?: boolean
}

interface UseApiStateReturn<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  retryCount: number
  isOffline: boolean
  execute: (...args: any[]) => Promise<T | undefined>
  retry: () => Promise<T | undefined>
  reset: () => void
  clearError: () => void
}

export function useApiState<T = any>(
  apiFunction: (...args: any[]) => Promise<AxiosResponse<T>>,
  options: UseApiStateOptions = {}
): UseApiStateReturn<T> {
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Operation completed successfully',
    onSuccess,
    onError,
    maxRetries = 3,
    autoRetryOnNetworkRestore = true
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isOffline, setIsOffline] = useState(!networkMonitor.isNetworkOnline())
  
  const lastArgsRef = useRef<any[]>([])
  const networkUnsubscribeRef = useRef<(() => void) | null>(null)

  // Monitor network status
  useEffect(() => {
    const unsubscribe = networkMonitor.onNetworkChange((online) => {
      setIsOffline(!online)
      if (online && autoRetryOnNetworkRestore && error && retryCount < maxRetries) {
        // Auto retry when network comes back online
        setTimeout(() => {
          retry()
        }, 1000) // Small delay to ensure connection is stable
      }
    })

    networkUnsubscribeRef.current = unsubscribe
    return () => {
      if (networkUnsubscribeRef.current) {
        networkUnsubscribeRef.current()
      }
    }
  }, [error, retryCount, maxRetries, autoRetryOnNetworkRestore])

  const execute = useCallback(async (...args: any[]): Promise<T | undefined> => {
    lastArgsRef.current = args
    setLoading(true)
    setError(null)

    try {
      const result = await makeResilientRequest(
        () => apiFunction(...args),
        {
          maxRetries,
          showLoadingToast: false // We handle loading state ourselves
        }
      )

      setData(result)
      setRetryCount(0) // Reset retry count on success

      if (showSuccessToast) {
        toast.success(successMessage)
      }

      if (onSuccess) {
        onSuccess(result)
      }

      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      setRetryCount(prev => prev + 1)

      if (showErrorToast) {
        toast.error(apiError.message || 'An error occurred')
      }

      if (onError) {
        onError(apiError)
      }

      throw apiError
    } finally {
      setLoading(false)
    }
  }, [apiFunction, maxRetries, showSuccessToast, showErrorToast, successMessage, onSuccess, onError])

  const retry = useCallback(async (): Promise<T | undefined> => {
    if (lastArgsRef.current.length === 0) {
      throw new Error('No previous request to retry')
    }
    return execute(...lastArgsRef.current)
  }, [execute])

  const reset = useCallback(() => {
    setData(null)
    setLoading(false)
    setError(null)
    setRetryCount(0)
    lastArgsRef.current = []
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    data,
    loading,
    error,
    retryCount,
    isOffline,
    execute,
    retry,
    reset,
    clearError
  }
}

// Specialized hook for data fetching with automatic execution
export function useApiData<T = any>(
  apiFunction: (...args: any[]) => Promise<AxiosResponse<T>>,
  dependencies: any[] = [],
  options: UseApiStateOptions & {
    autoExecute?: boolean
    executeArgs?: any[]
  } = {}
): UseApiStateReturn<T> & {
  refresh: () => Promise<T | undefined>
} {
  const {
    autoExecute = true,
    executeArgs = [],
    ...apiStateOptions
  } = options

  const apiState = useApiState(apiFunction, apiStateOptions)

  // Auto-execute on mount and when dependencies change
  useEffect(() => {
    if (autoExecute) {
      apiState.execute(...executeArgs)
    }
  }, dependencies)

  const refresh = useCallback(() => {
    return apiState.execute(...executeArgs)
  }, [apiState.execute, executeArgs])

  return {
    ...apiState,
    refresh
  }
}

// Hook for handling mutations (POST, PUT, DELETE operations)
export function useApiMutation<T = any>(
  apiFunction: (...args: any[]) => Promise<AxiosResponse<T>>,
  options: UseApiStateOptions & {
    invalidateQueries?: () => void
  } = {}
): UseApiStateReturn<T> & {
  mutate: (...args: any[]) => Promise<T | undefined>
} {
  const { invalidateQueries, ...apiStateOptions } = options

  const apiState = useApiState(apiFunction, {
    showSuccessToast: true,
    ...apiStateOptions,
    onSuccess: (data) => {
      if (invalidateQueries) {
        invalidateQueries()
      }
      if (options.onSuccess) {
        options.onSuccess(data)
      }
    }
  })

  return {
    ...apiState,
    mutate: apiState.execute
  }
}

// Connection status hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(networkMonitor.isNetworkOnline())

  useEffect(() => {
    const unsubscribe = networkMonitor.onNetworkChange(setIsOnline)
    return unsubscribe
  }, [])

  return { isOnline, isOffline: !isOnline }
}