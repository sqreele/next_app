import React from 'react'

type Message = {
  id: string | number
  text: string
  isMe?: boolean
}

interface ChatScreenProps {
  messages: Message[]
}

export function ChatScreen({ messages }: ChatScreenProps) {
  return (
    <div className="flex flex-col h-full pb-16">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} mb-2`}>
            <div className={`rounded-2xl px-4 py-2 max-w-xs break-words ${msg.isMe ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-900'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="fixed bottom-16 left-0 right-0 bg-white flex items-center p-2 border-t">
        <input className="flex-1 rounded-full border px-4 py-2 mr-2" placeholder="Type a message..." />
        <button className="bg-green-500 text-white rounded-full px-4 py-2 font-bold">Send</button>
      </div>
    </div>
  )
} 