'use client'

import { useEffect } from 'react'
import { useSocket } from '../../providers/socket-provider'
import { toast } from 'sonner'
import { useNotificationStore } from '../../stores/use-notification-store'
import type { Notification } from '../../stores/use-notification-store'

type NotificationData = Omit<Notification, 'id' | 'timestamp' | 'read'>
type WorkOrderUpdatedData = { workOrderNumber: string; }
type JobAssignedData = { jobTitle: string; }

export function NotificationHandler() {
  const { socket } = useSocket()
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    if (socket) {
      socket.on('notification', (data: NotificationData) => {
        addNotification(data)
        
        const toastAction = {
          'success': toast.success,
          'error': toast.error,
          'warning': toast.warning,
          'info': toast.info,
        }[data.type]

        toastAction(data.title, {
          description: data.message,
        })
      })

      socket.on('work-order-updated', (data: WorkOrderUpdatedData) => {
        toast.info('Work Order Updated', {
          description: `Work order ${data.workOrderNumber} has been updated`,
        })
      })

      socket.on('job-assigned', (data: JobAssignedData) => {
        toast.info('New Job Assigned', {
          description: `You have been assigned job: ${data.jobTitle}`,
        })
      })

      return () => {
        socket.off('notification')
        socket.off('work-order-updated')
        socket.off('job-assigned')
      }
    }
  }, [socket, addNotification])

  return null
} 