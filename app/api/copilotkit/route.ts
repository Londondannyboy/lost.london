import { NextRequest } from 'next/server'
import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'

/**
 * CopilotKit Runtime - Simple working pattern
 *
 * Uses Gemini for chat + local action to search articles.
 * This is the stable approach that works.
 */

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

const runtime = new CopilotRuntime({
  actions: [
    {
      name: 'searchArticles',
      description: 'Search Lost London articles for a topic. ALWAYS use this when the user asks about any London topic, place, or historical event.',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'The search query (topic, place, or question about London)',
          required: true,
        },
      ],
      handler: async ({ query }: { query: string }) => {
        try {
          const response = await fetch(`${getBaseUrl()}/api/london-tools/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, limit: 3 }),
          })
          const data = await response.json()

          if (data.articles && data.articles.length > 0) {
            const formatted = data.articles.map((a: any) =>
              `ARTICLE: ${a.title}\n${a.excerpt || ''}\n\nCONTENT:\n${a.content?.substring(0, 1500) || 'No content available'}...\n---`
            ).join('\n\n')

            return `Found ${data.articles.length} article(s):\n\n${formatted}`
          }

          return `No articles found for "${query}". I don't have information on that topic.`
        } catch (error) {
          console.error('[CopilotKit] Search error:', error)
          return `Search failed. Please try again.`
        }
      },
    },
  ],
})

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new GoogleGenerativeAIAdapter({
      model: 'gemini-2.0-flash-exp',
    }),
    endpoint: '/api/copilotkit',
  })

  return handleRequest(req)
}
