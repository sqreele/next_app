# Network Resilience and Error Handling Improvements

## Overview

This document outlines the comprehensive improvements made to handle the 502/525 API errors, token refresh failures, and general network resilience issues identified in the NextJS frontend application.

## Issues Addressed

### 1. API Error Types Encountered
- **502 Bad Gateway**: Service temporarily unavailable
- **525 SSL Handshake Failed**: SSL connection errors  
- **401 Unauthorized**: Token refresh failures
- **Network Errors**: Connection timeouts, socket errors
- **Token Expiry**: Session management failures

### 2. Root Causes
- External API calls to `pmcs.site` with inconsistent availability
- Poor error handling and retry logic
- No circuit breaker pattern for failing services
- Insufficient token refresh mechanisms
- Lack of network status monitoring

## Implemented Solutions

### 1. Enhanced API Client (`/lib/api-client.ts`)

#### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private readonly threshold: number = 5
  private readonly timeout: number = 60000 // 1 minute
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
}
```

- **CLOSED**: Normal operation
- **OPEN**: Service blocked after 5 failures
- **HALF_OPEN**: Testing recovery after timeout

#### Network Monitoring
```typescript
class NetworkMonitor {
  private isOnline: boolean = true
  private listeners: Array<(online: boolean) => void> = []
}
```

- Real-time network status detection
- Automatic retry when connection restored
- Event-driven architecture for status changes

#### Enhanced Retry Logic
```typescript
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<T> => {
  // Exponential backoff with jitter
  // Circuit breaker integration
  // Network status checking
}
```

**Features:**
- Exponential backoff with jitter (1s, 2s, 4s, max 30s)
- Smart retry logic (don't retry 4xx errors)
- Circuit breaker integration
- Network status awareness

#### Specific Error Handling
- **502/503/504/525**: Retryable server errors
- **401**: Token refresh triggered
- **Network errors**: Automatic retry with backoff
- **Timeout errors**: Retry with longer timeout

### 2. Custom Hooks (`/hooks/use-api-state.ts`)

#### `useApiState` Hook
```typescript
export function useApiState<T = any>(
  apiFunction: (...args: any[]) => Promise<AxiosResponse<T>>,
  options: UseApiStateOptions = {}
): UseApiStateReturn<T>
```

**Features:**
- Automatic retry on network restoration
- Loading state management
- Error state handling
- Network status integration

#### `useApiData` Hook
```typescript
export function useApiData<T = any>(
  apiFunction: (...args: any[]) => Promise<AxiosResponse<T>>,
  dependencies: any[] = [],
  options: UseApiStateOptions & {
    autoExecute?: boolean
    executeArgs?: any[]
  } = {}
)
```

**Features:**
- Automatic execution on mount
- Dependency-based refetching
- Built-in retry and error handling

#### `useNetworkStatus` Hook
```typescript
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(networkMonitor.isNetworkOnline())
  // Real-time network status monitoring
}
```

### 3. Enhanced Authentication (`/stores/auth-store.ts`)

#### Token Refresh with Retry
```typescript
async function refreshTokenWithRetry(refreshToken: string, maxRetries: number = 3): Promise<LoginResponse> {
  // Retry logic for token refresh
  // Handle 401, 500+ errors differently
  // Exponential backoff
}
```

**Improvements:**
- Retry failed token refreshes (except 401)
- Better error messages for users
- Automatic token refresh before expiry (5-minute buffer)
- Periodic token checking (every 5 minutes)
- Race condition prevention

#### Session Management
- **Concurrent refresh protection**: Single refresh promise
- **Automatic logout**: Only on 401/invalid token
- **User feedback**: Toast notifications for refresh status
- **Graceful degradation**: Continue with expired token until refresh fails

### 4. Error Boundary (`/components/error/error-boundary.tsx`)

#### Global Error Handling
```typescript
class ErrorBoundary extends Component<Props, State> {
  // Catches React errors
  // Network status integration
  // Automatic retry on network restoration
  // User-friendly error messages
}
```

**Features:**
- Catches all React component errors
- Network-aware error messages
- Retry functionality
- Development error details
- Automatic recovery on network restoration

### 5. Network Status Component (`/components/common/network-status.tsx`)

#### Real-time Status Display
```typescript
export function NetworkStatus({ className = '', showWhenOnline = false }: NetworkStatusProps) {
  // Visual network status indicator
  // API health checking
  // Auto-hide success messages
}
```

**Features:**
- Fixed position status bar
- Animated transitions
- API health verification
- Manual retry button
- Auto-dismissing success messages

### 6. Component Updates

#### Dashboard Components
Updated `TechnicianStatus` and `QuickStats` components:

```typescript
const {
  data: technicians,
  loading,
  error,
  retry,
  retryCount,
  isOffline
} = useApiData<Technician[]>(
  () => apiClient.get('/api/v1/users?role=Technician'),
  [], // dependencies
  {
    showErrorToast: false, // Handle in UI
    maxRetries: 3,
    autoRetryOnNetworkRestore: true
  }
)
```

**Improvements:**
- Loading skeletons
- Error states with retry buttons
- Network status indicators
- Graceful degradation
- User-friendly error messages

## User Experience Improvements

### 1. Loading States
- **Skeleton Components**: Smooth loading transitions
- **Progressive Loading**: Show partial data while loading
- **Loading Indicators**: Clear feedback during operations

### 2. Error States
- **Contextual Errors**: Specific error messages per component
- **Retry Actions**: Easy retry buttons for failed operations
- **Graceful Degradation**: App remains functional with cached data

### 3. Network Awareness
- **Connection Status**: Real-time network monitoring
- **Automatic Recovery**: Auto-retry when connection restored
- **Offline Indicators**: Clear offline state communication

### 4. Performance
- **Request Deduplication**: Prevent concurrent identical requests
- **Circuit Breaking**: Avoid overwhelming failing services
- **Smart Caching**: Preserve data during network issues

## Configuration

### Timeouts and Limits
```typescript
const apiClient: AxiosInstance = axios.create({
  timeout: 30000, // 30 seconds (increased from 10s)
  headers: {
    'Content-Type': 'application/json',
  },
})
```

### Retry Configuration
- **Max Retries**: 3 attempts
- **Base Delay**: 1 second
- **Max Delay**: 30 seconds
- **Circuit Breaker Threshold**: 5 failures
- **Circuit Breaker Timeout**: 60 seconds

### Token Management
- **Refresh Buffer**: 5 minutes before expiry
- **Periodic Check**: Every 5 minutes
- **Max Refresh Retries**: 3 attempts
- **Refresh Timeout**: 10 seconds

## Testing Recommendations

### 1. Network Conditions
- Test with poor network connectivity
- Simulate intermittent connection loss
- Test with slow API responses
- Verify offline functionality

### 2. Error Scenarios
- Force 502/503/504 errors
- Test token expiry scenarios
- Simulate server downtime
- Test refresh token failures

### 3. User Interactions
- Test retry button functionality
- Verify loading state transitions
- Check error message clarity
- Test automatic recovery

## Monitoring and Logging

### 1. Error Tracking
- Circuit breaker state logging
- Network status change events
- API error patterns
- Token refresh metrics

### 2. Performance Metrics
- Request success rates
- Retry attempt counts
- Response times
- Network connectivity uptime

## Future Enhancements

### 1. Advanced Features
- **Request Queuing**: Queue requests during offline periods
- **Background Sync**: Sync data when connection restored
- **Smart Caching**: Intelligent cache invalidation
- **Predictive Retry**: Learn from error patterns

### 2. User Experience
- **Offline Mode**: Full offline functionality
- **Data Persistence**: Local storage for critical data
- **Progressive Web App**: Enhanced mobile experience
- **Real-time Updates**: WebSocket fallbacks

### 3. Monitoring
- **Error Reporting**: Integrate with Sentry/LogRocket
- **Performance Monitoring**: Real user monitoring
- **Analytics**: User behavior during errors
- **Alerting**: Proactive error notifications

## Conclusion

These improvements provide a robust foundation for handling network issues and API failures. The implementation includes:

- **Resilient API Layer**: Circuit breaker, retry logic, network monitoring
- **Enhanced User Experience**: Loading states, error handling, status feedback
- **Improved Authentication**: Robust token refresh with retry logic
- **Global Error Handling**: Application-wide error boundary
- **Real-time Status**: Network and API health monitoring

The application now gracefully handles the 502/525 errors and provides users with clear feedback and recovery options, significantly improving the overall reliability and user experience.