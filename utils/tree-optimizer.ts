import type { OptimizedTree, TreeNode, TreeIndex } from '../types/tree'

export class TreeOptimizer {
  /**
   * Create performance indexes for fast lookups
   */
  static createIndexes(tree: OptimizedTree): TreeIndex {
    const byDepth: Record<number, string[]> = {}
    const byPlayer: Record<number, string[]> = {}
    const terminals: string[] = []
    const withHandData: string[] = []

    Object.entries(tree.nodes).forEach(([nodeId, node]) => {
      // Index by depth
      if (!byDepth[node.depth]) byDepth[node.depth] = []
      byDepth[node.depth].push(nodeId)

      // Index by player
      if (!byPlayer[node.player]) byPlayer[node.player] = []
      byPlayer[node.player].push(nodeId)

      // Terminal nodes
      if (node.isTerminal) terminals.push(nodeId)

      // Nodes with hand data
      if (node.hasHandData) withHandData.push(nodeId)
    })

    return { byDepth, byPlayer, terminals, withHandData }
  }

  /**
   * Compress tree by removing redundant data
   */
  static compressTree(tree: OptimizedTree): OptimizedTree {
    const compressedNodes: Record<string, TreeNode> = {}

    Object.entries(tree.nodes).forEach(([nodeId, node]) => {
      // Create compressed version of node
      const compressed: TreeNode = {
        id: node.id,
        parentId: node.parentId,
        player: node.player,
        street: node.street,
        sequence: this.compressSequence(node.sequence),
        actions: this.compressActions(node.actions),
        children: node.children,
        depth: node.depth,
        path: node.path,
        isTerminal: node.isTerminal,
        hasHandData: node.hasHandData
      }

      compressedNodes[nodeId] = compressed
    })

    return {
      ...tree,
      nodes: compressedNodes
    }
  }

  /**
   * Validate tree structure integrity
   */
  static validateTree(tree: OptimizedTree): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const nodeIds = new Set(Object.keys(tree.nodes))

    // Check root exists
    if (!nodeIds.has(tree.root)) {
      errors.push(`Root node ${tree.root} not found in nodes`)
    }

    Object.entries(tree.nodes).forEach(([nodeId, node]) => {
      // Check parent references
      if (node.parentId && !nodeIds.has(node.parentId)) {
        errors.push(`Node ${nodeId} references non-existent parent ${node.parentId}`)
      }

      // Check child references
      node.children.forEach(childId => {
        if (!nodeIds.has(childId)) {
          errors.push(`Node ${nodeId} references non-existent child ${childId}`)
        }
      })

      // Check action node references
      node.actions.forEach((action, index) => {
        if (action.node && !nodeIds.has(action.node)) {
          errors.push(`Node ${nodeId} action ${index} references non-existent node ${action.node}`)
        }
      })

      // Check depth consistency
      if (node.parentId) {
        const parent = tree.nodes[node.parentId]
        if (parent && parent.depth + 1 !== node.depth) {
          errors.push(`Node ${nodeId} has inconsistent depth (${node.depth}) relative to parent (${parent.depth})`)
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Calculate tree performance metrics
   */
  static calculateMetrics(tree: OptimizedTree) {
    const nodes = Object.values(tree.nodes)
    const nonTerminalNodes = nodes.filter(n => !n.isTerminal)
    const branchingFactors = nonTerminalNodes.map(n => n.children.length)
    
    const avgBranchingFactor = branchingFactors.length > 0 
      ? branchingFactors.reduce((a, b) => a + b, 0) / branchingFactors.length 
      : 0

    const maxBranchingFactor = branchingFactors.length > 0 
      ? Math.max(...branchingFactors) 
      : 0

    // Calculate balance score (how evenly distributed the tree is)
    const depthCounts = nodes.reduce((acc, node) => {
      acc[node.depth] = (acc[node.depth] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const depthValues = Object.values(depthCounts)
    const avgNodesPerDepth = depthValues.reduce((a, b) => a + b, 0) / depthValues.length
    const variance = depthValues.reduce((acc, count) => acc + Math.pow(count - avgNodesPerDepth, 2), 0) / depthValues.length
    const balanceScore = Math.max(0, 1 - (Math.sqrt(variance) / avgNodesPerDepth))

    return {
      avgBranchingFactor,
      maxBranchingFactor,
      balanceScore,
      memoryFootprint: JSON.stringify(tree).length * 2,
      nodeDistribution: depthCounts
    }
  }

  private static compressSequence(sequence: any[]): any[] {
    // Remove redundant fields, keep only essential data
    return sequence.map(action => ({
      player: action.player,
      type: action.type,
      amount: action.amount,
      street: action.street
    }))
  }

  private static compressActions(actions: any[]): any[] {
    // Remove redundant fields, keep only essential data
    return actions.map(action => {
      const compressed: any = {
        type: action.type,
        amount: action.amount
      }
      if (action.node) compressed.node = action.node
      return compressed
    })
  }
}

/**
 * Tree caching utilities for performance
 */
export class TreeCache {
  private static cache = new Map<string, any>()
  private static maxSize = 100 // Maximum number of cached items

  static set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  static get(key: string): any {
    return this.cache.get(key)
  }

  static has(key: string): boolean {
    return this.cache.has(key)
  }

  static clear(): void {
    this.cache.clear()
  }

  static getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }
}