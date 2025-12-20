import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY
  const secretKey = process.env.HUME_SECRET_KEY

  if (!apiKey || !secretKey) {
    return NextResponse.json(
      { error: 'Hume API credentials not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch('https://api.hume.ai/oauth2-cc/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: apiKey,
        client_secret: secretKey,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Hume token error:', error)
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 500 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ accessToken: data.access_token })
  } catch (error) {
    console.error('Hume token error:', error)
    return NextResponse.json(
      { error: 'Failed to get access token' },
      { status: 500 }
    )
  }
}
