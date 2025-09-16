import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TreeNode {
  id: string
  parentId: string | null
  player: number
  street: number
  sequence: Array<{
    player: number
    type: string
    amount: number
    street: number
  }>
  actions: Array<{
    type: string
    amount: number
    node?: string
  }>
  children: string[]
  depth: number
  path: string
  isTerminal: boolean
  hasHandData: boolean
}

interface OptimizedTree {
  nodes: Record<string, TreeNode>
  root: string
  maxDepth: number
  playerCount: number
  metadata: {
    totalNodes: number
    terminalNodes: number
    generatedAt: string
    version: string
  }
}

class TreeGenerator {
  private nodes: Map<string, any> = new Map()
  private processedNodes: Map<string, TreeNode> = new Map()
  private settings: any = null
  private equity: any = null

  constructor(private zipData: Record<string, any>) {
    this.loadData()
  }

  private loadData(): void {
    // Load settings and equity
    this.settings = this.zipData['settings.json'] || this.zipData['icm/settings.json']
    this.equity = this.zipData['equity.json'] || this.zipData['icm/equity.json']

    // Load all node files
    Object.keys(this.zipData).forEach(path => {
      if (path.includes('nodes/') && path.endsWith('.json')) {
        const nodeId = path.split('/').pop()?.replace('.json', '') || ''
        this.nodes.set(nodeId, this.zipData[path])
      }
    })
  }

  public generateTree(): OptimizedTree {
    const startTime = Date.now()
    
    // Find root node (typically node 0 or the one with empty sequence)
    const rootId = this.findRootNode()
    
    // Build tree structure
    this.buildTreeStructure(rootId)
    
    // Calculate metadata
    const terminalNodes = Array.from(this.processedNodes.values())
      .filter(node => node.isTerminal).length

    const tree: OptimizedTree = {
      nodes: Object.fromEntries(this.processedNodes),
      root: rootId,
      maxDepth: Math.max(...Array.from(this.processedNodes.values()).map(n => n.depth)),
      playerCount: this.settings?.handdata?.stacks?.length || 3,
      metadata: {
        totalNodes: this.processedNodes.size,
        terminalNodes,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    }

    console.log(`Tree generation completed in ${Date.now() - startTime}ms`)
    return tree
  }

  private findRootNode(): string {
    // Look for node with empty sequence or node "0"
    for (const [nodeId, nodeData] of this.nodes) {
      if (nodeData.sequence?.length === 0 || nodeId === '0') {
        return nodeId
      }
    }
    
    // Fallback: find node that's not referenced as a child
    const childNodes = new Set<string>()
    for (const nodeData of this.nodes.values()) {
      nodeData.actions?.forEach((action: any) => {
        if (action.node) childNodes.add(action.node)
      })
    }
    
    for (const nodeId of this.nodes.keys()) {
      if (!childNodes.has(nodeId)) {
        return nodeId
      }
    }
    
    throw new Error('Could not find root node')
  }

  private buildTreeStructure(nodeId: string, parentId: string | null = null, depth: number = 0): void {
    const rawNode = this.nodes.get(nodeId)
    if (!rawNode || this.processedNodes.has(nodeId)) {
      return
    }

    // Extract children from actions
    const children: string[] = []
    const actions = rawNode.actions || []
    
    actions.forEach((action: any) => {
      if (action.node && typeof action.node === 'string') {
        children.push(action.node)
      }
    })

    // Build path for navigation
    const path = this.buildNodePath(rawNode.sequence || [])

    // Create optimized node
    const treeNode: TreeNode = {
      id: nodeId,
      parentId,
      player: rawNode.player || 0,
      street: rawNode.street || 0,
      sequence: rawNode.sequence || [],
      actions: actions.map((action: any) => ({
        type: action.type,
        amount: action.amount || 0,
        ...(action.node && { node: action.node })
      })),
      children,
      depth,
      path,
      isTerminal: children.length === 0,
      hasHandData: !!(rawNode.hands && Object.keys(rawNode.hands).length > 0)
    }

    this.processedNodes.set(nodeId, treeNode)

    // Recursively process children
    children.forEach(childId => {
      this.buildTreeStructure(childId, nodeId, depth + 1)
    })
  }

  private buildNodePath(sequence: any[]): string {
    if (!sequence || sequence.length === 0) return 'Root'
    
    return sequence.map(action => {
      const playerName = this.getPlayerName(action.player)
      const actionName = this.getActionName(action.type, action.amount)
      return `${playerName}: ${actionName}`
    }).join(' → ')
  }

  private getPlayerName(player: number): string {
    // You can customize this based on your settings
    const positions = ['SB', 'BB', 'BTN', 'CO', 'MP', 'UTG']
    return positions[player] || `P${player}`
  }

  private getActionName(type: string, amount: number): string {
    switch (type) {
      case 'F': return 'Fold'
      case 'C': return 'Call'
      case 'X': return 'Check'
      case 'R': return amount > 0 ? `Raise ${this.formatAmount(amount)}` : 'Raise'
      default: return type
    }
  }

  private formatAmount(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`
    }
    return amount.toString()
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { zipData, spotId, userId } = await req.json()

    if (!zipData || !spotId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate optimized tree
    const generator = new TreeGenerator(zipData)
    const tree = generator.generateTree()

    // Store tree in database
    const { error: updateError } = await supabase
      .from('poker_spots')
      .update({ 
        tree_data: tree,
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', spotId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save tree data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Return success response with tree metadata
    return new Response(
      JSON.stringify({
        success: true,
        metadata: tree.metadata,
        treeSize: JSON.stringify(tree).length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Tree generation error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Tree generation failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})