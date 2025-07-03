import React from 'react'

export default function ChartPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <header className="w-full bg-green-500 text-white py-6 text-center text-2xl font-bold shadow">
        Chart
      </header>
      <main className="flex-1 flex flex-col items-center justify-center w-full px-4">
        <div className="w-full max-w-md bg-gray-100 rounded-xl shadow p-8 flex flex-col items-center">
          <div className="text-gray-400 text-lg mb-4">[Chart Placeholder]</div>
          <div className="w-full h-48 bg-gradient-to-r from-green-200 to-green-400 rounded-lg flex items-center justify-center">
            <span className="text-white text-2xl font-bold opacity-60">Chart Area</span>
          </div>
        </div>
      </main>
    </div>
  )
} 