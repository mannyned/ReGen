'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

// Icon Components for professional look
const CheckIcon = () => (
  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
)

const XIcon = () => (
  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
)

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// Feature data
const features = [
  {
    icon: '/feature-icon.png',
    title: 'All-in-One Repurposing',
    description: 'One upload transforms into multiple formats. Instantly optimize your content for every platform.',
    gradient: false,
  },
  {
    icon: '/ai-caption-bubble.png',
    title: 'Smart Captions',
    description: 'AI-powered captions in three tones: engaging, professional, and casual. Perfect for any audience.',
    gradient: false,
  },
  {
    icon: '/voice-shield.png',
    title: 'Brand Voice AI',
    description: 'ReGenr learns your unique tone from past posts. Stay authentic and consistent across all platforms.',
    gradient: false,
  },
  {
    icon: '/tap-ripple.png',
    title: 'One-Tap Publish',
    description: 'Export or post directly to TikTok, Instagram, YouTube, and X. No more tedious copy-pasting.',
    gradient: false,
  },
  {
    icon: '/insight-analytics.png',
    title: 'Insights Dashboard',
    description: 'Track engagement metrics and discover which repurposed styles resonate best with your audience.',
    gradient: false,
  },
  {
    emoji: 'lightning',
    title: 'Lightning Fast',
    description: 'From upload to publish in under 60 seconds. Spend less time editing, more time creating.',
    gradient: true,
  },
]

// Pricing data
const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For new creators',
    features: [
      { text: '10 uploads per month', included: true },
      { text: '2 platforms', included: true },
      { text: '1 file per post', included: true },
      { text: 'No scheduling', included: false },
      { text: 'No analytics', included: false },
    ],
    cta: 'Get Started',
    popular: false,
    highlight: false,
  },
  {
    name: 'Creator',
    price: '$9',
    description: 'For active creators',
    features: [
      { text: 'Unlimited uploads', included: true },
      { text: '5 platforms', included: true },
      { text: '6 files per post', included: true },
      { text: 'Content scheduling', included: true },
      { text: 'Save Rate Analytics', included: true },
      { text: 'Platform Performance', included: true },
      { text: 'Top Formats Insights', included: true },
    ],
    cta: 'Start Creating',
    popular: true,
    highlight: true,
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For agencies & power users',
    features: [
      { text: 'Everything in Creator', included: true },
      { text: 'Location Analytics', included: true },
      { text: 'Retention Graphs', included: true },
      { text: 'AI Recommendations', included: true },
      { text: 'Advanced Metrics', included: true },
      { text: 'Calendar Insights', included: true },
      { text: 'Team access (3 seats)', included: true },
    ],
    cta: 'Go Pro',
    popular: false,
    highlight: false,
  },
]

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-lg shadow-lg'
          : 'bg-white border-b border-gray-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 group">
              <div className="relative h-8 lg:h-10 transition-transform group-hover:scale-105">
                <Image
                  src="/logo-regenr-header.svg"
                  alt="ReGenr Logo"
                  width={140}
                  height={40}
                  className="h-full w-auto"
                  priority
                />
              </div>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="nav-link">Features</a>
              <a href="#pricing" className="nav-link">Pricing</a>
              <a href="/login" className="nav-link">Login</a>
              <a
                href="#waitlist"
                className="group inline-flex items-center btn-primary text-sm"
              >
                Get Early Access
                <ArrowRightIcon />
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileMenuOpen ? 'max-h-64 border-t border-gray-100' : 'max-h-0'
        }`}>
          <div className="px-4 py-4 space-y-3 bg-white">
            <a href="#features" className="block py-2 text-text-secondary hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="block py-2 text-text-secondary hover:text-primary transition-colors">Pricing</a>
            <a href="/login" className="block py-2 text-text-secondary hover:text-primary transition-colors">Login</a>
            <a href="#waitlist" className="block btn-primary text-center mt-4">
              Get Early Access
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-brand text-white pt-32 lg:pt-40 pb-24 lg:pb-32">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-float-delayed" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium">Now accepting beta users</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight animate-slide-up">
              Regenerate your content.
              <br />
              <span className="text-white/90">Rule every platform.</span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl mb-10 text-white/85 max-w-3xl mx-auto leading-relaxed animate-slide-up stagger-1">
              Upload once — ReGenr instantly transforms your videos, images, and text into scroll-stopping posts for TikTok, Instagram, YouTube, and more.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up stagger-2">
              <a
                href="#waitlist"
                className="group inline-flex items-center justify-center px-8 py-4 bg-white text-primary rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 hover:-translate-y-1 shadow-xl hover:shadow-2xl"
              >
                Get Early Access
                <ArrowRightIcon />
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 bg-white/15 backdrop-blur-sm text-white rounded-xl font-semibold text-lg hover:bg-white/25 transition-all duration-300 border border-white/20"
              >
                Learn More
              </a>
            </div>

            {/* Social Proof */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-white/70 animate-fade-in stagger-3">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-white/30 to-white/10 border-2 border-white/30 flex items-center justify-center text-xs font-medium">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm sm:text-base">
                <span className="text-white font-semibold">500+</span> creators already on the waitlist
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f8fafc"/>
          </svg>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 lg:py-28 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-8">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 tracking-tight">
              The Problem
            </h2>
            <p className="text-xl text-text-secondary mb-8 leading-relaxed">
              Creators spend <span className="text-primary font-semibold">hours</span> cutting clips, rewriting captions, resizing images, and reformatting the same posts for every platform.
            </p>
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/5 border border-primary/20">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-xl md:text-2xl font-bold text-primary">
                ReGenr does all that — automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="badge-primary mb-4 inline-block">Features</span>
            <h2 className="section-title">
              Everything you need to
              <span className="text-gradient"> dominate</span>
            </h2>
            <p className="section-subtitle">
              Powerful tools designed to help creators save time and maximize reach
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative rounded-2xl p-8 transition-all duration-300 ${
                  feature.gradient
                    ? 'bg-gradient-brand text-white shadow-lg hover:shadow-2xl hover:-translate-y-1'
                    : 'bg-white shadow-lg hover:shadow-2xl hover:-translate-y-1 border border-gray-100'
                }`}
              >
                {/* Icon */}
                <div className={`mb-6 ${feature.gradient ? '' : ''}`}>
                  {feature.gradient ? (
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-16 h-16 relative">
                      <Image
                        src={feature.icon || ''}
                        alt={feature.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <h3 className={`text-xl font-bold mb-3 ${feature.gradient ? 'text-white' : 'text-text-primary'}`}>
                  {feature.title}
                </h3>
                <p className={`text-base leading-relaxed ${feature.gradient ? 'text-white/90' : 'text-text-secondary'}`}>
                  {feature.description}
                </p>

                {/* Hover indicator */}
                {!feature.gradient && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent-purple rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="badge-primary mb-4 inline-block">Pricing</span>
            <h2 className="section-title">
              Simple, transparent pricing
            </h2>
            <p className="section-subtitle">
              Choose the plan that fits your content creation needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl p-8 transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-white border-2 border-primary shadow-xl shadow-primary/10 md:-mt-4 md:mb-4'
                    : 'bg-background border-2 border-gray-100 hover:border-primary/50'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="badge-gradient">Most Popular</span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-text-primary mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-5xl font-bold text-text-primary">{plan.price}</span>
                    <span className="text-text-secondary">/month</span>
                  </div>
                  <p className="text-text-secondary">{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      {feature.included ? <CheckIcon /> : <XIcon />}
                      <span className={feature.included ? 'text-text-primary' : 'text-text-secondary'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href="#waitlist"
                  className={`block text-center w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    plan.highlight
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="waitlist" className="py-20 lg:py-28 bg-gradient-brand text-white relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            Join the Waitlist
          </h2>
          <p className="text-xl mb-10 text-white/85 max-w-2xl mx-auto">
            Be among the first to experience the future of content repurposing. Limited spots available.
          </p>

          <form className="max-w-lg mx-auto" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 rounded-xl text-text-primary bg-white focus:ring-4 focus:ring-white/30 focus:outline-none transition-all shadow-lg"
                required
              />
              <button
                type="submit"
                className="group inline-flex items-center justify-center px-8 py-4 bg-white text-primary rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 hover:-translate-y-0.5 shadow-xl whitespace-nowrap"
              >
                Join Now
                <ArrowRightIcon />
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70 mt-8">
            <span className="flex items-center gap-2">
              <CheckIcon />
              No credit card required
            </span>
            <span className="flex items-center gap-2">
              <CheckIcon />
              Early access perks
            </span>
            <span className="flex items-center gap-2">
              <CheckIcon />
              Cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <a href="/" className="flex items-center gap-2 mb-4">
                <div className="relative h-8">
                  <Image src="/logo-regenr-header.svg" alt="ReGenr Logo" width={120} height={32} className="h-full w-auto brightness-0 invert" />
                </div>
              </a>
              <p className="text-gray-400 text-sm leading-relaxed">
                Regenerate your content. Rule every platform.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Product</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/upload" className="hover:text-white transition-colors">Upload</a></li>
                <li><a href="/analytics" className="hover:text-white transition-colors">Analytics</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Company</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Legal</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              © 2025 ReGenr. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {/* Social Icons */}
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
