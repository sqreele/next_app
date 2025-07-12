"use client"
import React, { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export default function ProfilePage() {
  const { user, getCurrentUser, loading } = useAuthStore()

  useEffect(() => {
    if (!user) getCurrentUser()
  }, [user, getCurrentUser])

  const handleRefresh = () => {
    getCurrentUser()
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!user) return <div className="p-8 text-red-500">Not logged in.</div>

  const properties = user.profile?.properties || []
  const hasProperty = properties.length > 0

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="mb-2"><b>Username:</b> {user.username}</div>
      <div className="mb-2"><b>Email:</b> {user.email}</div>
      <div className="mb-2"><b>Role:</b> {user.profile?.role}</div>
      <div className="mb-2"><b>Position:</b> {user.profile?.position}</div>
      <div className="mb-2">
        <b>Property Assignment:</b>
        {hasProperty ? (
          <ul className="list-disc ml-6">
            {properties.map((prop) => (
              <li key={prop.id}>
                <b>ID:</b> {prop.id} <b>Name:</b> {prop.name}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-red-500 ml-2">No property assigned!</span>
        )}
      </div>
      {!hasProperty && (
        <div className="mt-4 p-2 bg-yellow-100 text-yellow-800 rounded">
          You do not have a property assigned. Please contact an administrator.
        </div>
      )}
      <button
        className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleRefresh}
        disabled={loading}
      >
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  )
}