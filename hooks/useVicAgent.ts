import { useCoAgent } from "@copilotkit/react-core"

/**
 * Pending interest waiting for user confirmation
 */
export interface PendingInterest {
  id: number
  topic: string
  articleId?: number
  articleTitle?: string
  articleSlug?: string
  confidence: number
  createdAt: string
}

/**
 * Article search result from the knowledge base
 */
export interface ArticleResult {
  id: number
  title: string
  slug: string
  author: string
  excerpt: string
  categories?: string[]
  featuredImageUrl?: string
  score: number
}

/**
 * VIC Agent State
 *
 * This state is synced bidirectionally between the frontend and the CLM backend.
 * Changes here trigger re-renders; changes from the agent update this state.
 */
export interface VicAgentState {
  // Current topic being discussed
  currentTopic: string | null

  // Interests pending user confirmation
  pendingInterests: PendingInterest[]

  // Whether we're waiting for user to approve/reject something
  awaitingApproval: boolean

  // IDs of interests the user has confirmed
  approvedInterestIds: number[]

  // Recent search results
  searchResults: ArticleResult[]

  // Rich content to display (maps, graphs, etc.)
  richContent: {
    type: 'article' | 'map' | 'graph' | null
    data: any
  } | null

  // Session info
  sessionId: string | null
  userName: string | null
  isReturningUser: boolean
}

const INITIAL_STATE: VicAgentState = {
  currentTopic: null,
  pendingInterests: [],
  awaitingApproval: false,
  approvedInterestIds: [],
  searchResults: [],
  richContent: null,
  sessionId: null,
  userName: null,
  isReturningUser: false,
}

/**
 * Hook for syncing state with the VIC agent
 *
 * Usage:
 * ```tsx
 * const { state, setState, approveInterest, rejectInterest } = useVicAgent()
 *
 * // Read state
 * if (state.awaitingApproval) {
 *   // Show approval UI
 * }
 *
 * // User actions
 * approveInterest(123)  // Confirms interest ID 123
 * rejectInterest(123)   // Rejects interest ID 123
 * ```
 */
export function useVicAgent() {
  const { state, setState, run } = useCoAgent<VicAgentState>({
    name: "vic_agent",
    initialState: INITIAL_STATE,
  })

  /**
   * Approve a pending interest
   */
  const approveInterest = (id: number) => {
    setState(prev => {
      const current = prev ?? INITIAL_STATE
      return {
        ...current,
        approvedInterestIds: [...current.approvedInterestIds, id],
        pendingInterests: current.pendingInterests.filter(i => i.id !== id),
        awaitingApproval: false,
      }
    })
  }

  /**
   * Reject a pending interest
   */
  const rejectInterest = (id: number) => {
    setState(prev => {
      const current = prev ?? INITIAL_STATE
      return {
        ...current,
        pendingInterests: current.pendingInterests.filter(i => i.id !== id),
        awaitingApproval: false,
      }
    })
  }

  /**
   * Set the current topic being discussed
   */
  const setCurrentTopic = (topic: string | null) => {
    setState(prev => {
      const current = prev ?? INITIAL_STATE
      return {
        ...current,
        currentTopic: topic,
      }
    })
  }

  /**
   * Clear all pending interests
   */
  const clearPendingInterests = () => {
    setState(prev => {
      const current = prev ?? INITIAL_STATE
      return {
        ...current,
        pendingInterests: [],
        awaitingApproval: false,
      }
    })
  }

  /**
   * Set rich content to display
   */
  const setRichContent = (type: 'article' | 'map' | 'graph' | null, data: any = null) => {
    setState(prev => {
      const current = prev ?? INITIAL_STATE
      return {
        ...current,
        richContent: type ? { type, data } : null,
      }
    })
  }

  /**
   * Update search results
   */
  const setSearchResults = (results: ArticleResult[]) => {
    setState(prev => {
      const current = prev ?? INITIAL_STATE
      return {
        ...current,
        searchResults: results,
      }
    })
  }

  /**
   * Initialize session info
   */
  const initSession = (sessionId: string, userName: string | null, isReturning: boolean) => {
    setState(prev => {
      const current = prev ?? INITIAL_STATE
      return {
        ...current,
        sessionId,
        userName,
        isReturningUser: isReturning,
      }
    })
  }

  return {
    state,
    setState,
    run,
    approveInterest,
    rejectInterest,
    setCurrentTopic,
    clearPendingInterests,
    setRichContent,
    setSearchResults,
    initSession,
  }
}
