'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function UploadPage() {
  const [uploadType, setUploadType] = useState<'video' | 'image' | 'text'>('video')
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    // Handle file drop
  }

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
              <Link href="/upload" className="text-teal-600 font-semibold">Upload</Link>
              <Link href="/generate" className="text-gray-600 hover:text-gray-900">Generate</Link>
              <Link href="/schedule" className="text-gray-600 hover:text-gray-900">Schedule</Link>
              <Link href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Upload Content</h1>
          <p className="text-gray-600">Upload your videos, images, or describe your content</p>
        </div>

        {/* Upload Type Selector */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setUploadType('video')}
            className={`flex-1 py-4 px-6 rounded-lg font-semibold transition-all ${
              uploadType === 'video'
                ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🎬 Video
          </button>
          <button
            onClick={() => setUploadType('image')}
            className={`flex-1 py-4 px-6 rounded-lg font-semibold transition-all ${
              uploadType === 'image'
                ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🖼️ Image
          </button>
          <button
            onClick={() => setUploadType('text')}
            className={`flex-1 py-4 px-6 rounded-lg font-semibold transition-all ${
              uploadType === 'text'
                ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📝 Text
          </button>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {uploadType !== 'text' ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-300 hover:border-teal-400'
              }`}
            >
              <div className="text-6xl mb-4">
                {uploadType === 'video' ? '🎬' : '🖼️'}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Drop your {uploadType} here
              </h3>
              <p className="text-gray-600 mb-6">
                or click to browse from your computer
              </p>
              <input
                type="file"
                accept={uploadType === 'video' ? 'video/*' : 'image/*'}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block bg-gradient-to-r from-teal-400 to-teal-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
              >
                Choose File
              </label>
              <p className="text-sm text-gray-500 mt-4">
                {uploadType === 'video'
                  ? 'Supported formats: MP4, MOV, AVI (Max 500MB)'
                  : 'Supported formats: JPG, PNG, GIF (Max 10MB)'}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Describe your content
              </label>
              <textarea
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Enter your content description here..."
              />
              <div className="mt-6 flex justify-end">
                <button className="bg-gradient-to-r from-teal-400 to-teal-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  Continue to Generate
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Uploads */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Uploads</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center text-6xl">
                  {i % 3 === 0 ? '🎬' : i % 3 === 1 ? '🖼️' : '📝'}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">Sample {i % 3 === 0 ? 'Video' : i % 3 === 1 ? 'Image' : 'Text'}</h3>
                  <p className="text-sm text-gray-600 mt-1">Uploaded 2 days ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
