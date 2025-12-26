/**
 * Memory System for VIC
 *
 * Uses Zep Cloud for all memory:
 * - Automatic fact extraction from conversations
 * - Knowledge graph for entity relationships
 * - User memory and preferences
 * - pgvector in vic-clm for article search
 */

export interface UserProfile {
  isReturningUser: boolean;
  userName?: string;
  interests?: string[];
  preferences?: string[];
  source: 'zep';
}

export interface SearchResult {
  // From pgvector - full article content
  articles: Array<{
    title: string;
    content: string;
    excerpt: string;
    slug: string;
    source_type: 'article' | 'thorney_island';
    similarity: number;
  }>;
  // From Zep - related entities and facts
  relatedEntities: Array<{
    name: string;
    type: string;
    summary?: string;
  }>;
  relatedFacts: string[];
}

/**
 * Generate or retrieve user ID from localStorage
 */
export function getUserId(): string {
  if (typeof window === "undefined") return "";

  let userId = localStorage.getItem("vic_user_id");
  if (!userId) {
    userId = `vic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("vic_user_id", userId);
  }
  return userId;
}

/**
 * Get user profile from Zep Cloud
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  if (!userId) {
    return { isReturningUser: false, source: 'zep' };
  }

  try {
    const response = await fetch(`/api/zep/user?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      console.log('[VIC Memory] Zep profile fetch failed:', response.status);
      return { isReturningUser: false, source: 'zep' };
    }
    const data = await response.json();
    console.log('[VIC Memory] Zep profile:', data);
    return { ...data, source: 'zep' };
  } catch (e) {
    console.log('[VIC Memory] Zep profile error:', e);
    return { isReturningUser: false, source: 'zep' };
  }
}

/**
 * Store a memory about the user in Zep
 * Zep automatically extracts facts from conversation context
 */
export async function rememberAboutUser(
  userId: string,
  memory: string,
  type: 'name' | 'interest' | 'preference' | 'general' = 'general'
): Promise<boolean> {
  if (!userId || !memory) return false;

  // Store as a message in Zep - it will extract facts automatically
  return storeMessageInZep(userId, `User ${type}: ${memory}`, 'user');
}

/**
 * Store conversation message in Zep for automatic fact extraction
 */
export async function storeMessageInZep(
  userId: string,
  message: string,
  role: 'user' | 'assistant' = 'user'
): Promise<boolean> {
  if (!userId || !message) return false;

  try {
    const response = await fetch('/api/zep/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message, role }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Store conversation in Zep (end of session)
 * Zep automatically extracts facts and builds the knowledge graph
 */
export async function storeConversation(
  userId: string,
  conversationId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  topicsDiscussed: string[] = []
): Promise<boolean> {
  if (!userId || messages.length === 0) return false;

  // Store each message in Zep - it will extract facts automatically
  try {
    for (const msg of messages) {
      await storeMessageInZep(userId, msg.content, msg.role);
    }
    // Also store topics as explicit interests
    if (topicsDiscussed.length > 0) {
      await storeMessageInZep(userId, `User discussed: ${topicsDiscussed.join(', ')}`, 'user');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Hybrid search: pgvector for content + Zep for relationships
 */
export async function hybridSearch(query: string, limit = 5): Promise<SearchResult> {
  // Query both in parallel
  const [pgvectorResults, zepResults] = await Promise.all([
    searchPgvector(query, limit),
    searchZepGraph(query, limit),
  ]);

  return {
    articles: pgvectorResults,
    relatedEntities: zepResults.entities,
    relatedFacts: zepResults.facts,
  };
}

async function searchPgvector(query: string, limit: number) {
  try {
    const response = await fetch('/api/london-tools/semantic-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}

async function searchZepGraph(query: string, limit: number) {
  try {
    const response = await fetch('/api/zep/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit, scope: 'nodes' }),
    });
    if (!response.ok) return { entities: [], facts: [] };
    const nodeData = await response.json();

    // Also get facts
    const edgeResponse = await fetch('/api/zep/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 5, scope: 'edges' }),
    });
    const edgeData = edgeResponse.ok ? await edgeResponse.json() : { edges: [] };

    return {
      entities: (nodeData.nodes || []).map((n: any) => ({
        name: n.name,
        type: n.labels?.find((l: string) => l !== 'Entity') || 'Entity',
        summary: n.summary,
      })),
      facts: (edgeData.edges || []).map((e: any) => e.fact).filter(Boolean),
    };
  } catch {
    return { entities: [], facts: [] };
  }
}

/**
 * Generate personalized greeting based on user profile
 */
export function generatePersonalizedGreeting(profile: UserProfile): string {
  if (!profile.isReturningUser) {
    return '';
  }

  const name = profile.userName || '';
  const nameGreeting = name ? `, ${name}` : '';

  if (name && profile.interests && profile.interests.length > 0) {
    const interest = profile.interests[0];
    return `Welcome back${nameGreeting}! Last time you were interested in ${interest}. Shall we continue exploring that, or discover something new?`;
  }

  if (name) {
    return `Welcome back${nameGreeting}! Lovely to hear from you again. What aspect of London's history shall we explore today?`;
  }

  if (profile.interests && profile.interests.length > 0) {
    const interest = profile.interests[0];
    return `Welcome back! I remember you were interested in ${interest}. Shall we continue, or explore something new?`;
  }

  return `Welcome back! What would you like to discover about London today?`;
}
