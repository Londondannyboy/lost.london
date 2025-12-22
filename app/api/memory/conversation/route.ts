import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ success: false, error: 'API not configured' })
  }

  try {
    const { userId, conversationId, messages, topicsDiscussed } = await request.json()

    if (!userId || !conversationId || !messages || messages.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing required fields' })
    }

    const response = await fetch(`${SUPERMEMORY_API}/v4/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: `${userId}_${conversationId}`,
        messages: messages.map((m: Message) => ({
          role: m.role,
          content: m.content,
        })),
        containerTags: [userId],
        metadata: {
          userId,
          timestamp: new Date().toISOString(),
          topicsDiscussed: topicsDiscussed || [],
          source: 'vic_lost_london',
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Supermemory API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Memory] Conversation store error:', error)
    return NextResponse.json({ success: false, error: 'Failed to store conversation' })
  }
}
