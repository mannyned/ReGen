'use client'

import { useState } from 'react'
import Link from 'next/link'

type Platform = 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok'

export default function SchedulePage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  const platforms: { name: Platform; label: string; icon: string }[] = [
    { name: 'instagram', label: 'Instagram', icon: '📷' },
    { name: 'twitter', label: 'Twitter', icon: '🐦' },
    { name: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { name: 'facebook', label: 'Facebook', icon: '👥' },
    { name: 'tiktok', label: 'TikTok', icon: '🎵' }
  ]

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const upcomingPosts = [
    { platform: 'Instagram', time: 'Today at 3:00 PM', status: 'scheduled' },
    { platform: 'Twitter', time: 'Tomorrow at 10:00 AM', status: 'scheduled' },
    { platform: 'LinkedIn', time: 'Dec 20 at 9:00 AM', status: 'scheduled' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-teal-600">
              🚀 ReGen
            </Link>
            <nav className="flex gap-6">
              <Link href="/upload" className="text-gray-600 hover:text-gray-900">Upload</Link>
              <Link href="/generate" className="text-gray-600 hover:text-gray-900">Generate</Link>
              <Link href="/schedule" className="text-teal-600 font-semibold">Schedule</Link>
              <Link href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Schedule Posts</h1>
          <p className="text-gray-600">Schedule your content across multiple platforms</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Schedule Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              {/* Media Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Content
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center text-4xl cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-teal-400"
                    >
                      {i === 1 ? '🎬' : i === 2 ? '🖼️' : '📝'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Platforms
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {platforms.map(({ name, label, icon }) => (
                    <button
                      key={name}
                      onClick={() => togglePlatform(name)}
                      className={`flex items-center gap-3 p-4 rounded-lg font-semibold transition-all ${
                        selectedPlatforms.includes(name)
                          ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-2xl">{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time Selection */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Time
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* Quick Time Buttons */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quick Schedule
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <button className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                    Now
                  </button>
                  <button className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                    +1 Hour
                  </button>
                  <button className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                    +1 Day
                  </button>
                  <button className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                    +1 Week
                  </button>
                </div>
              </div>

              {/* Schedule Button */}
              <button
                disabled={selectedPlatforms.length === 0 || !selectedDate || !selectedTime}
                className="w-full bg-gradient-to-r from-teal-400 to-teal-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                📅 Schedule Post
              </button>
            </div>
          </div>

          {/* Right Column - Upcoming Posts */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Upcoming Posts</h2>
              <div className="space-y-4">
                {upcomingPosts.map((post, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-teal-400 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-gray-900">{post.platform}</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                        {post.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{post.time}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                        Edit
                      </button>
                      <button className="flex-1 text-xs py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {upcomingPosts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No upcoming posts
                </div>
              )}
            </div>

            {/* Calendar Preview */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Calendar</h2>
              <div className="aspect-square bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg flex items-center justify-center text-6xl">
                📅
              </div>
              <p className="text-center text-sm text-gray-600 mt-4">
                Calendar view coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
