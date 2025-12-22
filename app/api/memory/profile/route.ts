import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ isReturningUser: false })
  }

  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ isReturningUser: false })
    }

    const response = await fetch(`${SUPERMEMORY_API}/v4/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        containerTag: userId,
      }),
    })

    if (!response.ok) {
      // User not found = new user
      return NextResponse.json({ isReturningUser: false })
    }

    const data = await response.json()

    return NextResponse.json({
      isReturningUser: true,
      profile: data.profile || '',
      lastVisit: data.metadata?.lastVisit,
      topicsDiscussed: data.metadata?.topicsDiscussed || [],
      conversationCount: data.metadata?.conversationCount || 0,
    })
  } catch (error) {
    console.error('[Memory] Profile fetch error:', error)
    return NextResponse.json({ isReturningUser: false })
  }
}
