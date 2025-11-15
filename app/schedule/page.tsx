'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image src="/logo.png" alt="ReGen Logo" width={168} height={168} className="object-contain" />
                <span className="text-2xl font-bold text-primary">ReGen</span>
              </Link>
              <span className="text-text-secondary text-sm">/ Schedule</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-text-secondary hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/upload" className="text-text-secondary hover:text-primary transition-colors">Upload</Link>
              <Link href="/schedule" className="text-primary font-semibold">Schedule</Link>
              <Link href="/analytics" className="text-text-secondary hover:text-primary transition-colors">Analytics</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Schedule Posts</h1>
          <p className="text-text-secondary">Schedule your content across multiple platforms</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Schedule Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              {/* Media Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Select Content
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-4xl cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary"
                    >
                      {i === 1 ? '🎬' : i === 2 ? '🖼️' : '📝'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Select Platforms
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {platforms.map(({ name, label, icon }) => (
                    <button
                      key={name}
                      onClick={() => togglePlatform(name)}
                      className={`flex items-center gap-3 p-4 rounded-lg font-semibold transition-all ${
                        selectedPlatforms.includes(name)
                          ? 'bg-primary text-white shadow-lg hover:bg-primary-hover'
                          : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
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
                  <label className="block text-sm font-medium text-text-secondary mb-3">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">
                    Time
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
                  />
                </div>
              </div>

              {/* Quick Time Buttons */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Quick Schedule
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <button className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg text-sm font-medium transition-colors">
                    Now
                  </button>
                  <button className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg text-sm font-medium transition-colors">
                    +1 Hour
                  </button>
                  <button className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg text-sm font-medium transition-colors">
                    +1 Day
                  </button>
                  <button className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg text-sm font-medium transition-colors">
                    +1 Week
                  </button>
                </div>
              </div>

              {/* Schedule Button */}
              <button
                disabled={selectedPlatforms.length === 0 || !selectedDate || !selectedTime}
                className="w-full btn-primary"
              >
                📅 Schedule Post
              </button>
            </div>
          </div>

          {/* Right Column - Upcoming Posts */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-text-primary mb-6">Upcoming Posts</h2>
              <div className="space-y-4">
                {upcomingPosts.map((post, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-text-primary">{post.platform}</span>
                      <span className="badge-primary text-xs">
                        {post.status}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mb-3">{post.time}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg font-medium transition-colors">
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
                <div className="text-center py-8 text-text-secondary">
                  No upcoming posts
                </div>
              )}
            </div>

            {/* Calendar Preview */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
              <h2 className="text-xl font-bold text-text-primary mb-4">Calendar</h2>
              <div className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center text-6xl">
                📅
              </div>
              <p className="text-center text-sm text-text-secondary mt-4">
                Calendar view coming soon
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
