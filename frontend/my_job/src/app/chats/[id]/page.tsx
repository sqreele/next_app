import React from 'react'
import { ChatScreen } from '@/components/chats/ChatScreen'
import { BottomNav } from '@/components/layout/BottomNav'

const mockMessages = [
  { id: 1, text: 'Hello!', isMe: false },
  { id: 2, text: 'Hi, how are you?', isMe: true },
  { id: 3, text: 'I am good, thanks!', isMe: false },
  { id: 4, text: 'See you soon!', isMe: true },
]

export default function ChatDetailPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-green-500 text-white p-4 text-lg font-bold shadow">
        Chat
      </header>
      <ChatScreen messages={mockMessages} />
      <BottomNav />
    </div>
  )
} 