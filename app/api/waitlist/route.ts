import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, source } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await prisma.waitlistEntry.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existing) {
      return NextResponse.json(
        { message: 'You\'re already on the waitlist!', alreadyExists: true },
        { status: 200 }
      )
    }

    // Create new waitlist entry
    await prisma.waitlistEntry.create({
      data: {
        email: email.toLowerCase(),
        source: source || 'landing'
      }
    })

    return NextResponse.json(
      { message: 'Successfully joined the waitlist!', success: true },
      { status: 201 }
    )
  } catch (error) {
    console.error('Waitlist signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// GET endpoint to check waitlist count (optional)
export async function GET() {
  try {
    const count = await prisma.waitlistEntry.count()
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Waitlist count error:', error)
    return NextResponse.json(
      { error: 'Failed to get count' },
      { status: 500 }
    )
  }
}
