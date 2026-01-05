import { NextRequest } from 'next/server'
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'

/**
 * CopilotKit Runtime Endpoint
 *
 * Enables AG-UI features for human-in-the-loop interactions:
 * - Interest confirmation via chat
 * - Interactive topic exploration
 * - Guided validation flows
 */

const runtime = new CopilotRuntime({
  actions: [
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
      handler: async ({ interestId }) => {
        // This will be called when user confirms via chat
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/interests`, {
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
      handler: async ({ interestId }) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/interests`, {
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
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/interests?status=pending`)
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
