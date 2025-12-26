'use client'

import { useState, useCallback, useEffect } from 'react'
import { VoiceProvider, useVoice } from '@humeai/voice-react'

interface CategoryInfo {
  name: string
  description?: string
  articles?: Array<{
    title: string
    excerpt?: string
  }>
  // For Thorney Island book chunks
  chunks?: Array<{
    content: string
  }>
}

function CategoryVoiceInterface({ accessToken, category }: { accessToken: string; category: CategoryInfo }) {
  const { connect, disconnect, status, isPlaying } = useVoice()
  const [manualConnected, setManualConnected] = useState(false)

  useEffect(() => {
    if (status.value === 'connected') setManualConnected(true)
    if (status.value === 'disconnected') setManualConnected(false)
  }, [status.value])

  const handleConnect = useCallback(async () => {
    if (!accessToken) return

    const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID

    // Build content summary from articles or chunks
    let contentSummary = ''
    if (category.articles?.length) {
      contentSummary = category.articles
        .slice(0, 10)
        .map(a => `- "${a.title}": ${a.excerpt || ''}`)
        .join('\n')
    } else if (category.chunks?.length) {
      contentSummary = category.chunks
        .slice(0, 5)
        .map(c => c.content.substring(0, 500))
        .join('\n\n---\n\n')
    }

    // Minimal context - vic-clm owns personality, we just provide category content
    const systemPrompt = `CATEGORY_CONTEXT:
topic: ${category.name}
${category.description ? `description: ${category.description}` : ''}

TOPIC_CONTENT:
${contentSummary}

MODE: category_discussion
Focus responses on this specific topic. User is browsing this category.`

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
      console.error('[VIC Category] Connect error:', e?.message || e)
      setManualConnected(false)
    }
  }, [connect, accessToken, category])

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
            {isConnected ? `Discussing ${category.name}` : `Ask VIC about ${category.name}`}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isPlaying ? 'VIC is speaking...' : isConnected ? 'Listening...' : 'Hear stories about this topic'}
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

interface CategoryVoiceWidgetProps {
  category: CategoryInfo
}

export function CategoryVoiceWidget({ category }: CategoryVoiceWidgetProps) {
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
    return null // Silently fail
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
      onError={(err) => console.error('[VIC Category Error]', err)}
      onClose={(e) => console.warn('[VIC Category Close]', e?.code, e?.reason)}
    >
      <CategoryVoiceInterface accessToken={accessToken} category={category} />
    </VoiceProvider>
  )
}
