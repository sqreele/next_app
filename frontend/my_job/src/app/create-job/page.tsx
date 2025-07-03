'use client'
import React, { useState } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function CreateJobPage() {
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);

  function handleBeforeImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setBeforeImagePreview(URL.createObjectURL(file));
    } else {
      setBeforeImagePreview(null);
    }
  }

  function handleAfterImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAfterImagePreview(URL.createObjectURL(file));
    } else {
      setAfterImagePreview(null);
    }
  }

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
            placeholder="Search jobs..."
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
        Create Job Order
      </header>
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
          <h1 className="text-2xl font-semibold text-green-900 mb-6">Create Job Order</h1>
          <form className="w-full flex flex-col gap-4">
            <input
              type="text"
              placeholder="Task Title"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <textarea
              placeholder="Task Description"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 min-h-[80px]"
            />
            <select
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              defaultValue="Pending"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <select
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              defaultValue="Medium"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
            <input
              type="text"
              placeholder="Room"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {/* Before Image */}
            {beforeImagePreview && (
              <img
                src={beforeImagePreview}
                alt="Before Preview"
                className="w-full max-h-40 object-contain mb-2 rounded-lg border"
              />
            )}
            <label className="block">
              <span className="text-gray-700">Before Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleBeforeImageChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </label>
            {/* After Image */}
            {afterImagePreview && (
              <img
                src={afterImagePreview}
                alt="After Preview"
                className="w-full max-h-40 object-contain mb-2 rounded-lg border"
              />
            )}
            <label className="block">
              <span className="text-gray-700">After Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAfterImageChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </label>
            <button
              type="submit"
              className="w-full bg-green-500 text-white font-semibold py-2 rounded-lg mt-2 hover:bg-green-600 transition"
            >
              Submit Job Order
            </button>
          </form>
        </div>
      </main>
      <BottomNav />
    </div>
  )
} 