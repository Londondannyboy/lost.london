'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type SpriteTextType from 'three-spritetext'

// Dynamically import 3D graph with SSR disabled
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-900 rounded-xl">
      <div className="text-gray-400">Loading 3D graph...</div>
    </div>
  )
})

interface GraphNode {
  id: string
  name: string
  group: 'user' | 'interest' | 'location' | 'topic'
  val: number
  color?: string
}

interface GraphLink {
  source: string
  target: string
  label?: string
}

interface InterestGraph3DProps {
  facts: Array<{ fact: string; created_at: string }>
  userName: string
  height?: string
}

const groupColors: Record<string, string> = {
  user: '#8B5CF6',     // Purple
  interest: '#EC4899', // Pink
  location: '#3B82F6', // Blue
  topic: '#10B981',    // Green
}

export function InterestGraph3D({ facts, userName, height = '400px' }: InterestGraph3DProps) {
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 700, height: 400 })
  const [SpriteText, setSpriteText] = useState<typeof SpriteTextType | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  // Defer loading for performance
  useEffect(() => {
    const timer = setTimeout(() => setShouldLoad(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Load SpriteText dynamically
  useEffect(() => {
    if (!shouldLoad) return
    import('three-spritetext').then(mod => {
      setSpriteText(() => mod.default)
    })
  }, [shouldLoad])

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: parseInt(height) || 400
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [height])

  // Build graph data from facts
  const graphData = useCallback(() => {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []
    const seen = new Set<string>()

    // Add user at center
    nodes.push({
      id: 'user',
      name: userName,
      group: 'user',
      val: 30,
      color: groupColors.user
    })

    // Extract topics from facts
    facts.forEach((fact, i) => {
      const factLower = fact.fact.toLowerCase()

      // Skip VIC/assistant facts
      if (factLower.includes('vic ') || factLower.includes('assistant')) return

      // Extract interests
      const interestMatch = fact.fact.match(/interest(?:ed)?\s+(?:in\s+)?(?:learning\s+)?(?:about\s+)?([^.]+)/i)
      if (interestMatch) {
        const topic = interestMatch[1].trim().replace(/^the\s+/i, '').slice(0, 30)
        const topicId = `interest-${topic.toLowerCase().replace(/\s+/g, '-')}`

        if (!seen.has(topicId) && topic.length > 2) {
          seen.add(topicId)
          nodes.push({
            id: topicId,
            name: topic,
            group: 'interest',
            val: 15,
            color: groupColors.interest
          })
          links.push({ source: 'user', target: topicId, label: 'interested in' })
        }
        return
      }

      // Extract locations/places
      const locationMatch = fact.fact.match(/(?:about|exploring|discussing)\s+([A-Z][^.]{3,30})/i)
      if (locationMatch) {
        const location = locationMatch[1].trim().slice(0, 25)
        const locId = `loc-${location.toLowerCase().replace(/\s+/g, '-')}`

        if (!seen.has(locId) && location.length > 2) {
          seen.add(locId)
          nodes.push({
            id: locId,
            name: location,
            group: 'location',
            val: 12,
            color: groupColors.location
          })
          links.push({ source: 'user', target: locId, label: 'explored' })
        }
      }
    })

    // Limit for performance
    return {
      nodes: nodes.slice(0, 20),
      links: links.slice(0, 25)
    }
  }, [facts, userName])

  // Custom node object with text labels
  const nodeThreeObject = useCallback((node: any) => {
    if (!SpriteText) return null

    const sprite = new SpriteText(node.name)
    sprite.color = '#ffffff'
    sprite.textHeight = node.group === 'user' ? 4 : 3
    sprite.backgroundColor = node.color || groupColors[node.group] || '#6366f1'
    sprite.padding = 2
    sprite.borderRadius = 4
    return sprite
  }, [SpriteText])

  if (!shouldLoad) {
    return (
      <div
        ref={containerRef}
        className="bg-gray-900 rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-gray-400">Loading visualization...</div>
      </div>
    )
  }

  const data = graphData()

  if (data.nodes.length <= 1) {
    return (
      <div
        ref={containerRef}
        className="bg-gray-900 rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-gray-400">Chat with VIC to build your interest graph</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative rounded-xl overflow-hidden" style={{ height }}>
      <ForceGraph3D
        ref={graphRef}
        graphData={data}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#111827"
        nodeLabel="name"
        nodeVal="val"
        nodeColor={(node: any) => node.color || groupColors[node.group] || '#6366f1'}
        nodeOpacity={0.9}
        linkWidth={1}
        linkColor={() => '#4B5563'}
        linkOpacity={0.4}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={true}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
      />

      {/* Legend */}
      <div className="absolute top-3 left-3 bg-black/60 rounded-lg p-2 text-xs">
        <div className="flex flex-col gap-1">
          {Object.entries(groupColors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-white capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default InterestGraph3D
