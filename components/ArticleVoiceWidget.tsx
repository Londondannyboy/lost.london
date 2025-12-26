'use client'

import { useState, useCallback, useEffect } from 'react'
import { VoiceProvider, useVoice } from '@humeai/voice-react'

interface ArticleInfo {
  title: string
  author: string
  content: string
  excerpt?: string
  categories?: string[]
  location_name?: string
  historical_era?: string
}

function ArticleVoiceInterface({ accessToken, article }: { accessToken: string; article: ArticleInfo }) {
  const { connect, disconnect, status, isPlaying } = useVoice()
  const [manualConnected, setManualConnected] = useState(false)

  useEffect(() => {
    if (status.value === 'connected') setManualConnected(true)
    if (status.value === 'disconnected') setManualConnected(false)
  }, [status.value])

  const handleConnect = useCallback(async () => {
    if (!accessToken) return

    const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID

    // Minimal context - vic-clm owns personality, we just provide article content
    const systemPrompt = `ARTICLE_CONTEXT:
title: ${article.title}
${article.location_name ? `location: ${article.location_name}` : ''}
${article.historical_era ? `era: ${article.historical_era}` : ''}
${article.categories?.length ? `topics: ${article.categories.join(', ')}` : ''}

ARTICLE_CONTENT:
${article.content.substring(0, 4000)}${article.content.length > 4000 ? '...' : ''}

MODE: article_discussion
Focus responses on this specific article. User is reading it now.`

    try {
      await connect({
        auth: { type: 'accessToken', value: accessToken },
        configId: configId,
        sessionSettings: {
          type: 'session_settings' as const,
          systemPrompt,
        }
      })
      setManualConnected(true)
    } catch (e: any) {
      console.error('[VIC Article] Connect error:', e?.message || e)
      setManualConnected(false)
    }
  }, [connect, accessToken, article])

  const handleDisconnect = useCallback(() => {
    disconnect()
    setManualConnected(false)
  }, [disconnect])

  const isConnected = status.value === 'connected' || manualConnected
  const isConnecting = status.value === 'connecting' && !manualConnected

  return (
    <div className="bg-stone-100 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-4">
        {/* Mini VIC Avatar */}
        <button
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          className="relative flex-shrink-0 focus:outline-none group"
        >
          <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
            isConnected ? 'border-black shadow-lg' : 'border-gray-400 group-hover:border-black'
          }`}>
            <img
              src="/vic-avatar.jpg"
              alt="VIC"
              className={`w-full h-full object-cover ${isPlaying ? 'animate-pulse' : ''}`}
            />
          </div>
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          )}
        </button>

        {/* Text and Button */}
        <div className="flex-1 min-w-0">
          <p className="font-serif font-bold text-gray-900 text-sm">
            {isConnected ? 'Speaking with VIC' : 'Ask VIC about this article'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isPlaying ? 'VIC is speaking...' : isConnected ? 'Listening...' : 'Hear the story behind this piece'}
          </p>
        </div>

        {/* Connect/Disconnect Button */}
        <button
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            isConnected
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {isConnecting ? '...' : isConnected ? 'End' : 'Talk'}
        </button>
      </div>
    </div>
  )
}

interface ArticleVoiceWidgetProps {
  article: ArticleInfo
}

export function ArticleVoiceWidget({ article }: ArticleVoiceWidgetProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getAccessToken() {
      try {
        const response = await fetch('/api/hume-token')
        if (!response.ok) throw new Error('Failed to get access token')
        const data = await response.json()
        setAccessToken(data.accessToken)
      } catch (err) {
        setError('Voice unavailable')
        console.error('Error getting Hume token:', err)
      }
    }
    getAccessToken()
  }, [])

  if (error) {
    return null // Silently fail - don't show broken widget
  }

  if (!accessToken) {
    return (
      <div className="bg-stone-100 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-48 mt-2 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <VoiceProvider
      onError={(err) => console.error('[VIC Article Error]', err)}
      onClose={(e) => console.warn('[VIC Article Close]', e?.code, e?.reason)}
    >
      <ArticleVoiceInterface accessToken={accessToken} article={article} />
    </VoiceProvider>
  )
}
