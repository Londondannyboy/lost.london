/**
 * Supermemory integration for VIC - persistent user memory
 * Enables VIC to remember returning users and personalize greetings
 */

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY || ''

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface UserProfile {
  isReturningUser: boolean
  lastVisit?: string
  topicsDiscussed?: string[]
  conversationCount?: number
  profile?: string
}

interface ConversationData {
  conversationId: string
  messages: Message[]
  metadata?: Record<string, any>
}

/**
 * Generate or retrieve user ID from localStorage
 */
export function getUserId(): string {
  if (typeof window === 'undefined') return ''

  let userId = localStorage.getItem('vic_user_id')
  if (!userId) {
    userId = `vic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('vic_user_id', userId)
  }
  return userId
}

/**
 * Get user profile to check if returning user
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  if (!API_KEY || !userId) {
    return { isReturningUser: false }
  }

  try {
    const response = await fetch(`${SUPERMEMORY_API}/v4/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        containerTag: userId,
      }),
    })

    if (!response.ok) {
      // User not found = new user
      if (response.status === 404) {
        return { isReturningUser: false }
      }
      throw new Error(`Profile fetch failed: ${response.status}`)
    }

    const data = await response.json()

    // Parse profile data
    return {
      isReturningUser: true,
      profile: data.profile || '',
      lastVisit: data.metadata?.lastVisit,
      topicsDiscussed: data.metadata?.topicsDiscussed || [],
      conversationCount: data.metadata?.conversationCount || 0,
    }
  } catch (error) {
    console.error('[Supermemory] Profile fetch error:', error)
    return { isReturningUser: false }
  }
}

/**
 * Store conversation in Supermemory
 */
export async function storeConversation(
  userId: string,
  conversationId: string,
  messages: Message[],
  topicsDiscussed: string[] = []
): Promise<boolean> {
  if (!API_KEY || !userId || messages.length === 0) {
    return false
  }

  try {
    const response = await fetch(`${SUPERMEMORY_API}/v4/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: `${userId}_${conversationId}`,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        containerTags: [userId],
        metadata: {
          userId,
          timestamp: new Date().toISOString(),
          topicsDiscussed,
          source: 'vic_lost_london',
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Conversation store failed: ${response.status}`)
    }

    console.log('[Supermemory] Conversation stored successfully')
    return true
  } catch (error) {
    console.error('[Supermemory] Conversation store error:', error)
    return false
  }
}

/**
 * Add a memory/document about the user
 */
export async function addUserMemory(
  userId: string,
  content: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  if (!API_KEY || !userId) {
    return false
  }

  try {
    const response = await fetch(`${SUPERMEMORY_API}/v3/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        containerTag: userId,
        metadata: {
          ...metadata,
          userId,
          timestamp: new Date().toISOString(),
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Memory store failed: ${response.status}`)
    }

    return true
  } catch (error) {
    console.error('[Supermemory] Memory store error:', error)
    return false
  }
}

/**
 * Search user's memories
 */
export async function searchUserMemories(
  userId: string,
  query: string,
  limit: number = 5
): Promise<string[]> {
  if (!API_KEY || !userId) {
    return []
  }

  try {
    const response = await fetch(`${SUPERMEMORY_API}/v4/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        containerTags: [userId],
        limit,
      }),
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }

    const data = await response.json()
    return data.results?.map((r: any) => r.content) || []
  } catch (error) {
    console.error('[Supermemory] Search error:', error)
    return []
  }
}

/**
 * Generate a personalized greeting based on user profile
 */
export function generatePersonalizedGreeting(profile: UserProfile): string {
  if (!profile.isReturningUser) {
    return '' // Use default greeting
  }

  const greetings = [
    "Welcome back! ",
    "Good to see you again! ",
    "Ah, you've returned! ",
  ]

  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)]

  if (profile.topicsDiscussed && profile.topicsDiscussed.length > 0) {
    const lastTopic = profile.topicsDiscussed[profile.topicsDiscussed.length - 1]
    return `${randomGreeting}Last time we talked about ${lastTopic}. Shall we continue, or explore something new?`
  }

  if (profile.conversationCount && profile.conversationCount > 1) {
    return `${randomGreeting}This is conversation number ${profile.conversationCount + 1}. What aspect of London's history shall we explore today?`
  }

  return `${randomGreeting}What would you like to discover about London today?`
}
