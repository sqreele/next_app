import { HomeIcon, ChatBubbleLeftRightIcon, UserIcon, PlusCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 z-50">
      <Link href="/home" className="flex flex-col items-center text-gray-500 hover:text-green-500">
        <HomeIcon className="h-6 w-6" />
        <span className="text-xs">Home</span>
      </Link>
      <Link href="/chats" className="flex flex-col items-center text-gray-500 hover:text-green-500">
        <ChatBubbleLeftRightIcon className="h-6 w-6" />
        <span className="text-xs">Chats</span>
      </Link>
      <Link href="/create-job" className="flex flex-col items-center text-gray-500 hover:text-green-500">
        <PlusCircleIcon className="h-6 w-6" />
        <span className="text-xs">Create Job</span>
      </Link>
      <Link href="/chart" className="flex flex-col items-center text-gray-500 hover:text-green-500">
        <ChartBarIcon className="h-6 w-6" />
        <span className="text-xs">Chart</span>
      </Link>
      <Link href="/profile" className="flex flex-col items-center text-gray-500 hover:text-green-500">
        <UserIcon className="h-6 w-6" />
        <span className="text-xs">Profile</span>
      </Link>
    </nav>
  )
} 