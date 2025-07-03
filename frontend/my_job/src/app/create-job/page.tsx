'use client'
import React, { useState } from 'react'

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
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-green-100 to-white px-4">
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
    </div>
  )
} 