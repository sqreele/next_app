import React from 'react'

type Chat = {
  id: string | number
  avatar: string
  name: string
  lastMessage: string
  time: string
  unread: number
}

interface ChatListProps {
  chats: Chat[]
}

export function ChatList({ chats }: ChatListProps) {
  return (
    <div className="pb-16"> {/* padding for bottom nav */}
      {chats.map(chat => (
        <div key={chat.id} className="flex items-center px-4 py-3 border-b hover:bg-gray-50">
          <img src={chat.avatar} className="h-12 w-12 rounded-full mr-3" alt="" />
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="font-medium">{chat.name}</span>
              <span className="text-xs text-gray-400">{chat.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm truncate">{chat.lastMessage}</span>
              {chat.unread > 0 && (
                <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-0.5">{chat.unread}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 