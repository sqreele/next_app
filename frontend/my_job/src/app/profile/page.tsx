'use client'

import React, { useEffect, useState } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'
import { useAuthStore } from '@/stores/auth-store'
import { usersAPI } from '@/services/users-api'
import { User } from '@/types/user'

export default function ProfilePage() {
  const { user, getCurrentUser, loading } = useAuthStore()
  const [profileData, setProfileData] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        // Get current user data
        await getCurrentUser()
        const currentUser = useAuthStore.getState().user
        setProfileData(currentUser)
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [getCurrentUser])

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    )
  }

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
        <div className="text-xl font-semibold mb-1">
          {profileData?.username || 'Loading...'}
        </div>
        <div className="text-gray-500 mb-1">
          {profileData?.email || 'Loading...'}
        </div>
        <div className="text-green-600 mb-4">
          {profileData?.is_active ? 'Active' : 'Inactive'}
        </div>
        {profileData?.profile && (
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600 mb-1">Role</div>
            <div className="text-blue-600 font-medium">
              {profileData.profile.role || 'No role assigned'}
            </div>
            {profileData.profile.position && (
              <>
                <div className="text-sm text-gray-600 mb-1 mt-2">Position</div>
                <div className="text-gray-700">
                  {profileData.profile.position}
                </div>
              </>
            )}
          </div>
        )}
        <button className="bg-green-500 text-white px-6 py-2 rounded-full font-medium shadow hover:bg-green-600 transition">
          Edit Profile
        </button>
      </div>
      <div className="flex-1" />
      <BottomNav />
    </div>
  )
} 