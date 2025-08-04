// src/providers/socket-provider.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
// @ts-ignore
import { io, Socket } from 'socket.io-client'
import { useAuth } from './auth-provider'
import API_CONFIG from '@/config/api-config'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Use configuration for socket URL
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || API_CONFIG.ENDPOINTS.WEBSOCKET
      
      const socketInstance = io(socketUrl, {
        auth: {
          token: localStorage.getItem('auth-token'),
        },
      })

      socketInstance.on('connect', () => {
        setIsConnected(true)
      })

      socketInstance.on('disconnect', () => {
        setIsConnected(false)
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.close()
      }
    }
  }, [user])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}