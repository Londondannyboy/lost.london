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

    // Store the conversation
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
      console.error('[Memory] Conversation API error:', response.status)
    }

    // ALSO store topics as searchable documents so they show up in profile
    // This ensures VIC can greet returning users with their interests
    if (topicsDiscussed && topicsDiscussed.length > 0) {
      const topicsContent = `User discussed topics: ${topicsDiscussed.join(', ')}`

      await fetch(`${SUPERMEMORY_API}/v3/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: topicsContent,
          containerTag: userId,
          metadata: {
            userId,
            type: 'conversation_topic',
            topics: topicsDiscussed,
            timestamp: new Date().toISOString(),
            source: 'vic_lost_london',
            conversationId,
          },
        }),
      }).catch(e => console.error('[Memory] Failed to store topics:', e))

      console.log('[Memory] Stored conversation topics:', topicsDiscussed)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Memory] Conversation store error:', error)
    return NextResponse.json({ success: false, error: 'Failed to store conversation' })
  }
}
