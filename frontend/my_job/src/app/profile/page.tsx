import React from 'react'
import { BottomNav } from '@/components/layout/BottomNav'

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <header className="w-full bg-green-500 text-white py-6 text-center text-2xl font-bold shadow">
        My Profile
      </header>
      <div className="flex flex-col items-center py-8 w-full px-4">
        <img
          src="https://randomuser.me/api/portraits/men/32.jpg"
          alt="User Avatar"
          className="h-24 w-24 rounded-full shadow mb-4 border-4 border-green-200"
        />
        <div className="text-xl font-semibold mb-1">John Doe</div>
        <div className="text-gray-500 mb-1">john.doe@email.com</div>
        <div className="text-green-600 mb-4">Active</div>
        <button className="bg-green-500 text-white px-6 py-2 rounded-full font-medium shadow hover:bg-green-600 transition">
          Edit Profile
        </button>
      </div>
      <div className="flex-1" />
      <BottomNav />
    </div>
  )
} 