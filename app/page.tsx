import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="ReGen Logo" width={168} height={168} className="object-contain" />
              <span className="text-2xl font-bold text-primary">ReGen</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-text-secondary hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-text-secondary hover:text-primary transition-colors">Pricing</a>
              <a href="/login" className="text-text-secondary hover:text-primary transition-colors">Login</a>
              <a href="#waitlist" className="btn-primary text-sm">Get Early Access</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-brand text-white py-20 lg:py-32">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Regenerate your content.<br />
              <span className="text-white/90">Rule every platform.</span>
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-white/90 max-w-3xl mx-auto">
              Upload once — ReGen instantly turns your videos, images, and text into scroll-stopping posts for TikTok, Instagram, YouTube, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all hover:scale-105 shadow-xl"
              >
                → Get Early Access
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold text-lg hover:bg-white/30 transition-all hover:scale-105"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent"></div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 text-3xl mb-6">
              ⚠️
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
              The Problem
            </h2>
            <p className="text-xl text-text-secondary mb-6 leading-relaxed">
              Creators spend <span className="text-primary font-semibold">hours</span> cutting clips, rewriting captions, resizing images, and rewriting the same posts for every platform.
            </p>
            <p className="text-2xl md:text-3xl font-bold text-primary">
              ReGen does all that — automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Key Features
            </h2>
            <p className="text-xl text-text-secondary">
              Everything you need to dominate every platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-32 h-32 flex items-center justify-center mb-6">
                <Image src="/feature-icon.png" alt="All-in-One Repurposing" width={128} height={128} className="object-contain" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4">
                All-in-One Repurposing
              </h3>
              <p className="text-text-secondary text-lg">
                One upload → multiple formats. Transform your content for every platform instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-32 h-32 flex items-center justify-center mb-6">
                <Image src="/ai-caption-bubble.png" alt="Smart Captions" width={128} height={128} className="object-contain" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4">
                Smart Captions
              </h3>
              <p className="text-text-secondary text-lg">
                Three tone options: engaging, professional, and casual. Perfect for any audience.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-32 h-32 flex items-center justify-center mb-6">
                <Image src="/voice-shield.png" alt="Brand Voice AI" width={128} height={128} className="object-contain" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4">
                Brand Voice AI
              </h3>
              <p className="text-text-secondary text-lg">
                ReGen learns your tone from past posts. Stay authentic, stay consistent.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-brand flex items-center justify-center text-3xl mb-6">
                🚀
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4">
                One-Tap Publish
              </h3>
              <p className="text-text-secondary text-lg">
                Export or post directly to TikTok, IG, YouTube, X. No more copy-pasting.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-brand flex items-center justify-center text-3xl mb-6">
                📊
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4">
                Insights Dashboard
              </h3>
              <p className="text-text-secondary text-lg">
                Track engagement and see which repurposed style works best for your audience.
              </p>
            </div>

            {/* Bonus feature slot */}
            <div className="bg-gradient-brand rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl mb-6">
                ⚡
              </div>
              <h3 className="text-2xl font-bold mb-4">
                Lightning Fast
              </h3>
              <p className="text-white/90 text-lg">
                From upload to publish in under 60 seconds. Spend less time editing, more time creating.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-text-secondary">
              Choose the plan that fits your content creation needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Tier */}
            <div className="bg-background rounded-2xl p-8 border-2 border-gray-200 hover:border-primary transition-colors">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-text-primary mb-2">Free</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-text-primary">$0</span>
                  <span className="text-text-secondary">/month</span>
                </div>
                <p className="text-text-secondary">For new creators</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">5 repurposes per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">Basic caption generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">3 platforms</span>
                </li>
              </ul>
              <a href="#waitlist" className="block text-center btn-secondary w-full">
                Get Started
              </a>
            </div>

            {/* Creator Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-primary shadow-xl relative transform scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-text-primary mb-2">Creator Plan</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-primary">$9</span>
                  <span className="text-text-secondary">/month</span>
                </div>
                <p className="text-text-secondary">For active creators</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">Unlimited repurposes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">All caption formats & tones</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">All platforms</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">Basic analytics</span>
                </li>
              </ul>
              <a href="#waitlist" className="block text-center btn-primary w-full">
                Start Creating
              </a>
            </div>

            {/* Pro Plan */}
            <div className="bg-background rounded-2xl p-8 border-2 border-gray-200 hover:border-primary transition-colors">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-text-primary mb-2">Pro Plan</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-text-primary">$15</span>
                  <span className="text-text-secondary">/month</span>
                </div>
                <p className="text-text-secondary">For agencies & power users</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">Everything in Creator</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">Advanced AI features</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">Full analytics dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">Content scheduling</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✓</span>
                  <span className="text-text-secondary">Team access (3 seats)</span>
                </li>
              </ul>
              <a href="#waitlist" className="block text-center btn-secondary w-full">
                Go Pro
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="waitlist" className="py-20 bg-gradient-brand text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Join the Waitlist
          </h2>
          <p className="text-xl mb-10 text-white/90">
            Be among the first to experience the future of content repurposing. Limited spots available.
          </p>
          <form className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 rounded-lg text-text-primary focus:ring-2 focus:ring-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-xl whitespace-nowrap"
              >
                Join Now →
              </button>
            </div>
          </form>
          <p className="text-sm text-white/70 mt-6">
            No credit card required • Early access perks • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-text-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image src="/logo.png" alt="ReGen Logo" width={144} height={144} className="object-contain" />
                <span className="text-2xl font-bold">ReGen</span>
              </div>
              <p className="text-gray-400">
                Regenerate your content. Rule every platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/upload" className="hover:text-white transition-colors">Upload</a></li>
                <li><a href="/analytics" className="hover:text-white transition-colors">Analytics</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
            <p>© 2025 ReGen. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
