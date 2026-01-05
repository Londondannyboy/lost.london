import { NextRequest } from 'next/server'
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'

/**
 * CopilotKit Runtime - Proxies to VIC CLM backend
 *
 * The CLM backend has the Pydantic AI agent with AG-UI support.
 * This route proxies requests to the CLM's /copilotkit endpoint.
 */

const REMOTE_ENDPOINT = process.env.COPILOTKIT_REMOTE_ENDPOINT || 'https://vic-clm.vercel.app/copilotkit'

const runtime = new CopilotRuntime({
  remoteEndpoints: [
    {
      url: REMOTE_ENDPOINT,
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
