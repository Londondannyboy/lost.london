import { NextRequest } from 'next/server'
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'

// Helper to get base URL for API calls
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/**
 * CopilotKit Runtime Endpoint
 *
 * Enables AG-UI features for human-in-the-loop interactions:
 * - Article search and display with rich cards
 * - Interest confirmation via chat
 * - Interactive topic exploration
 * - Guided validation flows
 */

const runtime = new CopilotRuntime({
  actions: [
    // ==========================================
    // Article Search & Display Actions
    // ==========================================
    {
      name: 'searchArticles',
      description: 'Search Lost London articles for a topic. Use this when the user asks about a London topic, place, or historical event.',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'The search query (topic, place, or question about London)',
          required: true,
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Maximum number of results (default 3)',
          required: false,
        },
      ],
      handler: async ({ query, limit = 3 }: { query: string; limit?: number }) => {
        try {
          const response = await fetch(`${getBaseUrl()}/api/london-tools/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, limit }),
          })
          const data = await response.json()

          if (data.articles && data.articles.length > 0) {
            // Return structured data for rendering
            return {
              found: true,
              count: data.articles.length,
              articles: data.articles.map((a: any) => ({
                title: a.title,
                slug: a.slug,
                author: a.author || 'Vic Keegan',
                excerpt: a.excerpt,
                featuredImageUrl: a.featured_image_url,
                categories: a.categories,
              })),
              // Also return a text summary for the LLM
              summary: `Found ${data.articles.length} article(s): ${data.articles.map((a: any) => a.title).join(', ')}`,
            }
          }

          return {
            found: false,
            count: 0,
            articles: [],
            summary: `No articles found for "${query}". Try a different search term.`,
          }
        } catch (error) {
          console.error('[CopilotKit] Search error:', error)
          return {
            found: false,
            count: 0,
            articles: [],
            summary: 'Search failed. Please try again.',
          }
        }
      },
    },
    {
      name: 'showArticle',
      description: 'Display a specific article as a rich card in the chat. Use after finding an article to show it to the user.',
      parameters: [
        {
          name: 'title',
          type: 'string',
          description: 'Article title',
          required: true,
        },
        {
          name: 'slug',
          type: 'string',
          description: 'Article URL slug',
          required: true,
        },
        {
          name: 'author',
          type: 'string',
          description: 'Article author',
          required: false,
        },
        {
          name: 'excerpt',
          type: 'string',
          description: 'Brief excerpt from the article',
          required: false,
        },
        {
          name: 'featuredImageUrl',
          type: 'string',
          description: 'URL of the featured image',
          required: false,
        },
        {
          name: 'categories',
          type: 'string[]',
          description: 'Article categories',
          required: false,
        },
      ],
      handler: async (args: {
        title: string
        slug: string
        author?: string
        excerpt?: string
        featuredImageUrl?: string
        categories?: string[]
      }) => {
        // This action's primary purpose is to render a card via the frontend render function
        // The handler returns data that can be used by the LLM to continue the conversation
        return {
          displayed: true,
          article: args,
          message: `Showing article: ${args.title}`,
        }
      },
    },
    {
      name: 'showSearchResults',
      description: 'Display multiple search results as article cards. Use after searchArticles to show results.',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'The search query that was used',
          required: true,
        },
        {
          name: 'results',
          type: 'object[]',
          description: 'Array of article objects to display',
          required: true,
        },
      ],
      handler: async ({ query, results }: { query: string; results: any[] }) => {
        return {
          displayed: true,
          count: results.length,
          query,
          message: `Showing ${results.length} results for "${query}"`,
        }
      },
    },

    // ==========================================
    // Interest Confirmation Actions
    // ==========================================
    {
      name: 'confirmInterest',
      description: 'Confirm a pending interest topic for the user',
      parameters: [
        {
          name: 'interestId',
          type: 'number',
          description: 'The ID of the interest to confirm',
          required: true,
        },
      ],
      handler: async ({ interestId }: { interestId: number }) => {
        const response = await fetch(`${getBaseUrl()}/api/interests`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interestId, action: 'confirm' }),
        })
        const data = await response.json()
        return data.success ? 'Interest confirmed!' : 'Failed to confirm interest'
      },
    },
    {
      name: 'rejectInterest',
      description: 'Reject a pending interest topic for the user',
      parameters: [
        {
          name: 'interestId',
          type: 'number',
          description: 'The ID of the interest to reject',
          required: true,
        },
      ],
      handler: async ({ interestId }: { interestId: number }) => {
        const response = await fetch(`${getBaseUrl()}/api/interests`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interestId, action: 'reject' }),
        })
        const data = await response.json()
        return data.success ? 'Interest removed' : 'Failed to remove interest'
      },
    },
    {
      name: 'getPendingInterests',
      description: 'Get the list of pending interests awaiting confirmation',
      parameters: [],
      handler: async () => {
        const response = await fetch(`${getBaseUrl()}/api/interests?status=pending`)
        const data = await response.json()
        if (data.interests && data.interests.length > 0) {
          return `You have ${data.interests.length} pending interests: ${data.interests.map((i: any) => i.topic).join(', ')}`
        }
        return 'No pending interests to confirm'
      },
    },
  ],
})

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new OpenAIAdapter(),
    endpoint: '/api/copilotkit',
  })

  return handleRequest(req)
}
