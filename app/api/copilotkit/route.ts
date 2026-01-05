import { NextRequest } from 'next/server'
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'

/**
 * CopilotKit Runtime Endpoint - Proxies to VIC CLM Backend
 *
 * This endpoint connects the CopilotKit frontend to the VIC CLM
 * running on Railway via the AG-UI protocol.
 *
 * Architecture:
 * - Frontend (CopilotKit) → This route → VIC CLM (Railway)
 * - Same backend serves both Hume voice and CopilotKit text
 * - Unified conversation, shared state, rich content
 */

// Get the CLM remote endpoint URL
const getRemoteEndpoint = () => {
  // Production: Use the configured remote endpoint
  if (process.env.COPILOTKIT_REMOTE_ENDPOINT) {
    return process.env.COPILOTKIT_REMOTE_ENDPOINT
  }
  // Development: Fall back to local CLM
  return 'http://localhost:8000/copilotkit'
}

const runtime = new CopilotRuntime({
  remoteEndpoints: [
    {
      url: getRemoteEndpoint(),
    },
  ],
})

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    endpoint: '/api/copilotkit',
  })

  return handleRequest(req)
}
