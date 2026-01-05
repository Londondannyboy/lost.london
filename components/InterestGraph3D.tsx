'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import * as THREE from 'three'
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

interface ArticleNode {
  article_id: number
  article_title: string
  article_slug: string
  count: number
}

interface InterestGraph3DProps {
  articles: ArticleNode[]  // Validated article titles only
  userName: string
  height?: string
}

const groupColors: Record<string, string> = {
  user: '#8B5CF6',     // Purple
  interest: '#EC4899', // Pink
  location: '#3B82F6', // Blue
  topic: '#10B981',    // Green
}

export function InterestGraph3D({ articles, userName, height = '400px' }: InterestGraph3DProps) {
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

  // Set up camera and auto-rotation after graph loads
  useEffect(() => {
    if (!graphRef.current || !shouldLoad) return

    // Wait for graph to initialize
    const timer = setTimeout(() => {
      const fg = graphRef.current
      if (!fg) return

      // Zoom camera closer
      fg.cameraPosition({ x: 0, y: 0, z: 120 })

      // Start auto-rotation
      const controls = fg.controls()
      if (controls) {
        controls.autoRotate = true
        controls.autoRotateSpeed = 1.5
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [shouldLoad, SpriteText])

  // Build graph data from validated articles only
  const graphData = useCallback(() => {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []

    // Add user at center
    nodes.push({
      id: 'user',
      name: userName,
      group: 'user',
      val: 25,
      color: groupColors.user
    })

    // Add validated article titles as nodes
    // These are real articles from our database, not inferred topics
    articles.forEach((article) => {
      // Clean title - remove "Vic Keegan's Lost London XXX: " prefix
      let title = article.article_title
        .replace(/^Vic Keegan's Lost London \d+:\s*/i, '')
        .trim()

      // Limit title length for display
      if (title.length > 30) {
        title = title.slice(0, 27) + '...'
      }

      const nodeId = `article-${article.article_id}`

      // Size based on how many times user asked about it
      const size = Math.min(8 + article.count * 3, 18)

      nodes.push({
        id: nodeId,
        name: title,
        group: 'interest',
        val: size,
        color: groupColors.interest
      })
      links.push({ source: 'user', target: nodeId })
    })

    return {
      nodes: nodes.slice(0, 15),
      links: links.slice(0, 15)
    }
  }, [articles, userName])

  // Custom node with sphere + floating label
  const nodeThreeObject = useCallback((node: any): THREE.Object3D => {
    // Create a group to hold sphere and label
    const group = new THREE.Group()

    if (!SpriteText) return group

    // Create the sphere
    const sphereRadius = node.group === 'user' ? 8 : 5
    const geometry = new THREE.SphereGeometry(sphereRadius, 32, 32)
    const material = new THREE.MeshLambertMaterial({
      color: node.color || groupColors[node.group] || '#6366f1',
      transparent: true,
      opacity: 0.9
    })
    const sphere = new THREE.Mesh(geometry, material)
    group.add(sphere)

    // Create floating label below sphere
    const sprite = new SpriteText(node.name)
    sprite.color = '#ffffff'
    sprite.textHeight = node.group === 'user' ? 5 : 3.5
    sprite.backgroundColor = 'rgba(0,0,0,0.6)'
    sprite.padding = 1.5
    sprite.borderRadius = 3
    sprite.position.y = -(sphereRadius + 6) // Position below sphere
    group.add(sprite)

    return group
  }, [SpriteText])

  // Animation tick for rotation
  const onEngineTick = useCallback(() => {
    if (!graphRef.current) return
    const controls = graphRef.current.controls()
    if (controls && controls.update) {
      controls.update()
    }
  }, [])

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

  if (articles.length === 0) {
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
        nodeLabel=""
        nodeVal="val"
        nodeRelSize={1}
        nodeOpacity={0}
        linkWidth={2}
        linkColor={() => '#6B7280'}
        linkOpacity={0.6}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
        onEngineTick={onEngineTick}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={50}
        cooldownTime={3000}
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
