'use client'

import { useCopilotAction } from "@copilotkit/react-core"
import { ChatArticleCard, type ChatArticle } from './ChatArticleCard'

/**
 * Registers CopilotKit actions for rendering rich content in chat
 *
 * This component should be rendered inside CopilotProvider to register
 * the render actions that display articles, maps, and other rich content.
 */
export function ChatActions() {
  // Render article cards when the backend calls showArticle
  useCopilotAction({
    name: "showArticle",
    description: "Display an article card with image and details",
    available: "disabled", // Only for rendering backend tool calls
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Article title",
        required: true,
      },
      {
        name: "slug",
        type: "string",
        description: "Article URL slug",
        required: true,
      },
      {
        name: "author",
        type: "string",
        description: "Article author",
        required: false,
      },
      {
        name: "excerpt",
        type: "string",
        description: "Article excerpt or summary",
        required: false,
      },
      {
        name: "featuredImageUrl",
        type: "string",
        description: "URL of the featured image",
        required: false,
      },
      {
        name: "categories",
        type: "string[]",
        description: "Article categories",
        required: false,
      },
    ],
    render: ({ status, args }) => {
      const article: ChatArticle = {
        title: args.title || 'Untitled',
        slug: args.slug || '',
        author: args.author,
        excerpt: args.excerpt,
        featuredImageUrl: args.featuredImageUrl,
        categories: args.categories,
      }

      return <ChatArticleCard article={article} status={status} />
    },
  })

  // Render search results (multiple articles)
  useCopilotAction({
    name: "showSearchResults",
    description: "Display search results as article cards",
    available: "disabled",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query",
        required: true,
      },
      {
        name: "results",
        type: "object[]",
        description: "Array of article results",
        required: true,
      },
    ],
    render: ({ status, args }) => {
      if (status === 'inProgress') {
        return (
          <div className="my-3 p-4 bg-stone-50 rounded-lg">
            <p className="text-sm text-stone-600">
              Searching for "{args.query}"...
            </p>
          </div>
        )
      }

      const results = (args.results || []) as ChatArticle[]

      if (results.length === 0) {
        return (
          <div className="my-3 p-4 bg-stone-50 rounded-lg">
            <p className="text-sm text-stone-600">
              No articles found for "{args.query}"
            </p>
          </div>
        )
      }

      return (
        <div className="my-3 space-y-2">
          <p className="text-xs text-stone-500 px-1">
            Found {results.length} article{results.length !== 1 ? 's' : ''} for "{args.query}"
          </p>
          {results.slice(0, 3).map((article, i) => (
            <ChatArticleCard key={i} article={article} status={status} />
          ))}
        </div>
      )
    },
  })

  // Render interest confirmation prompt
  useCopilotAction({
    name: "confirmInterestPrompt",
    description: "Ask user to confirm interest in a topic",
    available: "disabled",
    parameters: [
      {
        name: "article",
        type: "object",
        description: "The article to confirm interest in",
        required: true,
      },
      {
        name: "interestId",
        type: "number",
        description: "ID of the pending interest",
        required: true,
      },
    ],
    render: ({ status, args }) => {
      const article = args.article as ChatArticle
      const interestId = args.interestId as number

      const handleConfirm = async () => {
        // Call the confirm endpoint
        await fetch('/api/interests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interestId, action: 'confirm' }),
        })
      }

      const handleReject = async () => {
        // Call the reject endpoint
        await fetch('/api/interests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interestId, action: 'reject' }),
        })
      }

      return (
        <div className="my-3">
          <p className="text-sm text-stone-700 mb-2">
            Is this what you're interested in?
          </p>
          <ChatArticleCard
            article={article}
            status={status}
            showActions={status === 'complete'}
            onConfirm={handleConfirm}
            onReject={handleReject}
          />
        </div>
      )
    },
  })

  // Component renders nothing - just registers the actions
  return null
}
