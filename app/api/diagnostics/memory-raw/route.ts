import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

/**
 * Raw Supermemory search - try different query methods
 * GET /api/diagnostics/memory-raw?userId=xxx
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')

  if (!API_KEY) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 })
  }

  const results: any = {}

  // Try 1: Search with containerTags (plural array)
  try {
    const res1 = await fetch(`${SUPERMEMORY_API}/v4/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: 'topic',
        containerTags: userId ? [userId] : undefined,
        limit: 10,
      }),
    })
    results.containerTags_plural = {
      status: res1.status,
      data: await res1.json(),
    }
  } catch (e: any) {
    results.containerTags_plural = { error: e.message }
  }

  // Try 2: Search with containerTag (singular)
  try {
    const res2 = await fetch(`${SUPERMEMORY_API}/v4/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: 'topic',
        containerTag: userId,
        limit: 10,
      }),
    })
    results.containerTag_singular = {
      status: res2.status,
      data: await res2.json(),
    }
  } catch (e: any) {
    results.containerTag_singular = { error: e.message }
  }

  // Try 3: Search ALL (no container filter) to see what's in the system
  try {
    const res3 = await fetch(`${SUPERMEMORY_API}/v4/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: 'Roman history test topic',
        limit: 10,
      }),
    })
    results.no_container_filter = {
      status: res3.status,
      data: await res3.json(),
    }
  } catch (e: any) {
    results.no_container_filter = { error: e.message }
  }

  // Try 4: List all documents (if API supports it)
  try {
    const res4 = await fetch(`${SUPERMEMORY_API}/v3/documents?limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    })
    results.list_documents = {
      status: res4.status,
      data: res4.ok ? await res4.json() : await res4.text(),
    }
  } catch (e: any) {
    results.list_documents = { error: e.message }
  }

  return NextResponse.json({
    userId,
    apiKeyPresent: !!API_KEY,
    apiKeyPrefix: API_KEY?.substring(0, 10) + '...',
    results,
  })
}
