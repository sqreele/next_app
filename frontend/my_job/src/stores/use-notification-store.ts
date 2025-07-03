import { create } from 'zustand'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
  actionUrl?: string
}

interface NotificationState {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (notificationData) => {
    const notification: Notification = {
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
      ...notificationData,
    }
    set(state => ({ notifications: [notification, ...state.notifications] }))
  },
  markAsRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      ),
    }))
  },
  markAllAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(notification => ({ ...notification, read: true })),
    }))
  },
  deleteNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(notification => notification.id !== id),
    }))
  },
  unreadCount: () => {
    return get().notifications.filter(n => !n.read).length
  },
})) 