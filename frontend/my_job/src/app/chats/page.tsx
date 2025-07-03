import React from 'react'
import { ChatList } from '@/components/chats/ChatList'
import { BottomNav } from '@/components/layout/BottomNav'

const mockChats = [
  {
    id: 1,
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    name: 'Alice',
    lastMessage: 'See you soon!',
    time: '09:30',
    unread: 2,
  },
  {
    id: 2,
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    name: 'Bob',
    lastMessage: 'Thanks for the update.',
    time: '08:15',
    unread: 0,
  },
  {
    id: 3,
    avatar: 'https://randomuser.me/api/portraits/men/65.jpg',
    name: 'Charlie',
    lastMessage: 'Let me know!',
    time: 'Yesterday',
    unread: 1,
  },
]

export default function ChatsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-green-500 text-white p-4 text-lg font-bold shadow">
        Chats
      </header>
      <ChatList chats={mockChats} />
      <BottomNav />
    </div>
  )
} 