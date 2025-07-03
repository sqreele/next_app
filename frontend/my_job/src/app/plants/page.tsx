import React from 'react'
import Link from 'next/link'
import { BottomNav } from '@/components/layout/BottomNav'
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { categories } from '@/components/plants/plantCategories'
import { PlantCard } from '@/components/plants/PlantCard'

export default function PlantsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Colorful gradient blobs */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-gradient-to-br from-blue-400 to-purple-400 opacity-30 rounded-full z-0" />
      <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 bg-gradient-to-tr from-green-400 to-yellow-300 opacity-30 rounded-full z-0" />
      <div className="absolute top-1/2 left-[-40px] w-32 h-32 bg-gradient-to-br from-pink-400 to-yellow-400 opacity-20 rounded-full z-0" />
      {/* Top menu bar */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center bg-white rounded-full px-3 py-1 shadow w-full max-w-xs">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search plants..."
            className="bg-transparent outline-none flex-1 text-sm text-green-900 placeholder-gray-400"
          />
        </div>
        <button className="ml-4 bg-white rounded-full p-2 shadow relative">
          <BellIcon className="h-6 w-6 text-green-500" />
          {/* Notification dot */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
      <header className="relative z-10 text-center py-4 text-2xl font-semibold text-green-900 tracking-wide">
        PMCS
      </header>
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <div className="grid grid-cols-2 gap-5 w-full max-w-md">
          {categories.map((cat) => (
            <PlantCard key={cat.slug} label={cat.label} image={cat.image} href={`/plants/${cat.slug}`} />
          ))}
        </div>
      </main>
      {/* Floating Action Button */}
      <button className="fixed bottom-24 right-6 z-20 bg-green-500 text-white rounded-full shadow-lg p-4 hover:bg-green-600 transition">
        + Add Job
      </button>
      <BottomNav />
    </div>
  )
} 