export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-400 to-teal-900 text-white p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">🚀 ReGen</h1>
        <p className="text-2xl mb-8">AI-Powered Content Repurposing Platform</p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-8 py-3 bg-white text-teal-900 rounded-lg font-semibold hover:bg-gray-100 transition-all hover:scale-105"
          >
            Login
          </a>
          <a
            href="/signup"
            className="px-8 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold hover:bg-white/30 transition-all hover:scale-105"
          >
            Sign Up
          </a>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-3">🎬</div>
            <h3 className="font-bold text-xl mb-2">Upload Content</h3>
            <p className="text-white/80">Upload videos, images, or describe your content</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="font-bold text-xl mb-2">AI Generation</h3>
            <p className="text-white/80">Generate platform-specific captions and hashtags</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-3">📅</div>
            <h3 className="font-bold text-xl mb-2">Schedule Posts</h3>
            <p className="text-white/80">Schedule content across all platforms</p>
          </div>
        </div>
      </div>
    </div>
  )
}
