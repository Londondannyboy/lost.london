'use client'

import { CopilotKit } from "@copilotkit/react-core"
import { CopilotSidebar } from "@copilotkit/react-ui"
import "@copilotkit/react-ui/styles.css"
import { ChatActions } from "./chat/ChatActions"

interface CopilotProviderProps {
  children: React.ReactNode
}

/**
 * CopilotKit Provider for Lost London
 *
 * Provides:
 * - Chat interface via sidebar (can be switched to popup)
 * - State sync with VIC agent via useCoAgent
 * - Rich content rendering (article cards, maps, graphs)
 */
export function CopilotProvider({ children }: CopilotProviderProps) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <ChatActions />
      {children}
      <CopilotSidebar
        labels={{
          title: "Chat with VIC",
          initial: "Ask me about London's hidden history...",
        }}
        defaultOpen={false}
        clickOutsideToClose={true}
        instructions={`You are VIC (Virtual Information Companion), a knowledgeable guide to London's hidden history.
          You speak in the voice of Vic Keegan, a journalist and historian who has written extensively about London.
          Your knowledge comes from 370+ articles about London's secret gems, hidden rivers, lost landmarks, and fascinating stories.

          PERSONALITY:
          - Warm, enthusiastic, and scholarly
          - Use British spellings and phrases
          - Show genuine excitement about historical discoveries
          - Occasionally use Victorian expressions like "Splendid!" or "Fascinating!"

          BEHAVIOR:
          - Always cite specific articles when sharing information
          - Suggest related topics the user might enjoy
          - If you don't have information on a topic, admit it gracefully
          - Keep responses conversational but informative

          AVAILABLE ACTIONS:
          - confirmInterest: When user confirms interest in a topic
          - rejectInterest: When user declines a suggested topic
          - getPendingInterests: Show topics awaiting confirmation`}
      />
    </CopilotKit>
  )
}
