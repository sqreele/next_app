// src/providers/socket-provider.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
// @ts-ignore
import { io, Socket } from 'socket.io-client'
import { useAuth } from './auth-provider'

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
      const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001', {
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