import React from 'react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-green-100 to-white px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <div className="bg-green-500 rounded-full h-16 w-16 flex items-center justify-center mb-2">
            <span className="text-2xl font-bold text-white">PMCS</span>
          </div>
          <h1 className="text-2xl font-semibold text-green-900">Sign in to PMCS</h1>
        </div>
        <form className="w-full flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            type="submit"
            className="w-full bg-green-500 text-white font-semibold py-2 rounded-lg mt-2 hover:bg-green-600 transition"
          >
            Login
          </button>
        </form>
        <div className="mt-4 text-sm text-gray-500">
          Forgot your password?
        </div>
      </div>
    </div>
  )
} 