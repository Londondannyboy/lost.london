/**
 * Hybrid Memory System for VIC
 *
 * Combines multiple systems for best results:
 * - Supermemory: Simple, free user memory for anonymous sessions
 * - Zep: Automatic fact extraction + knowledge graph
 * - pgvector: Full article content search
 *
 * This gives us:
 * - Rich article content (pgvector)
 * - Entity relationships (Zep graph)
 * - Persistent user memory (Supermemory + Zep)
 */

export interface UserProfile {
  isReturningUser: boolean;
  userName?: string;
  interests?: string[];
  preferences?: string[];
  source: 'supermemory' | 'zep' | 'both';
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
 * Get user profile from BOTH Supermemory and Zep
 * Returns combined/best data from both sources
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  if (!userId) {
    return { isReturningUser: false, source: 'supermemory' };
  }

  // Query both in parallel
  const [supermemoryProfile, zepProfile] = await Promise.all([
    getSupermemoryProfile(userId),
    getZepProfile(userId),
  ]);

  // Combine results - prefer data from whichever has more
  const hasSupermemory = supermemoryProfile.isReturningUser;
  const hasZep = zepProfile.isReturningUser;

  if (!hasSupermemory && !hasZep) {
    return { isReturningUser: false, source: 'supermemory' };
  }

  // Merge data from both sources
  return {
    isReturningUser: true,
    userName: supermemoryProfile.userName || zepProfile.userName,
    interests: [
      ...(supermemoryProfile.interests || []),
      ...(zepProfile.interests || []),
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5), // Unique, max 5
    preferences: supermemoryProfile.preferences,
    source: hasSupermemory && hasZep ? 'both' : hasSupermemory ? 'supermemory' : 'zep',
  };
}

async function getSupermemoryProfile(userId: string): Promise<UserProfile> {
  try {
    const response = await fetch('/api/memory/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) return { isReturningUser: false, source: 'supermemory' };
    const data = await response.json();
    return { ...data, source: 'supermemory' };
  } catch {
    return { isReturningUser: false, source: 'supermemory' };
  }
}

async function getZepProfile(userId: string): Promise<UserProfile> {
  try {
    const response = await fetch(`/api/zep/user?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) return { isReturningUser: false, source: 'zep' };
    const data = await response.json();
    return { ...data, source: 'zep' };
  } catch {
    return { isReturningUser: false, source: 'zep' };
  }
}

/**
 * Store a memory about the user in Supermemory
 * (Explicit memory - name, interests, preferences)
 */
export async function rememberAboutUser(
  userId: string,
  memory: string,
  type: 'name' | 'interest' | 'preference' | 'general' = 'general'
): Promise<boolean> {
  if (!userId || !memory) return false;

  try {
    const response = await fetch('/api/memory/remember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, memory, type }),
    });
    return response.ok;
  } catch {
    return false;
  }
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
 * Store conversation in Supermemory (end of session)
 */
export async function storeConversation(
  userId: string,
  conversationId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  topicsDiscussed: string[] = []
): Promise<boolean> {
  if (!userId || messages.length === 0) return false;

  try {
    const response = await fetch('/api/memory/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, conversationId, messages, topicsDiscussed }),
    });
    return response.ok;
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
