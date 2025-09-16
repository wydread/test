import type { OptimizedTree, TreeNode, NavigationPath, BreadcrumbItem, NavigationAction } from '../types/tree'

export class TreeNavigator {
  private tree: OptimizedTree
  private nodeCache: Map<string, TreeNode> = new Map()

  constructor(tree: OptimizedTree) {
    this.tree = tree
    this.buildCache()
  }

  private buildCache(): void {
    Object.entries(this.tree.nodes).forEach(([id, node]) => {
      this.nodeCache.set(id, node)
    })
  }

  /**
   * Get navigation data for a specific node
   */
  getNavigationPath(nodeId: string): NavigationPath | null {
    const node = this.nodeCache.get(nodeId)
    if (!node) return null

    return {
      currentNode: nodeId,
      breadcrumbs: this.buildBreadcrumbs(nodeId),
      availableActions: this.getAvailableActions(nodeId)
    }
  }

  /**
   * Build breadcrumb trail from root to current node
   */
  private buildBreadcrumbs(nodeId: string): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = []
    let currentNode = this.nodeCache.get(nodeId)

    while (currentNode && currentNode.parentId) {
      const parentNode = this.nodeCache.get(currentNode.parentId)
      if (!parentNode) break

      // Find the action that led to current node
      const actionToChild = parentNode.actions.find(action => action.node === currentNode!.id)
      
      if (actionToChild) {
        breadcrumbs.unshift({
          nodeId: currentNode.parentId,
          label: this.formatActionLabel(actionToChild.type, actionToChild.amount),
          player: parentNode.player,
          action: actionToChild.type
        })
      }

      currentNode = parentNode
    }

    // Add root
    if (currentNode && !currentNode.parentId) {
      breadcrumbs.unshift({
        nodeId: currentNode.id,
        label: 'Start',
        player: currentNode.player,
        action: 'ROOT'
      })
    }

    return breadcrumbs
  }

  /**
   * Get available actions from current node
   */
  private getAvailableActions(nodeId: string): NavigationAction[] {
    const node = this.nodeCache.get(nodeId)
    if (!node) return []

    return node.actions
      .filter(action => action.node) // Only actions that lead to other nodes
      .map(action => ({
        label: this.formatActionLabel(action.type, action.amount),
        targetNode: action.node!,
        type: action.type,
        amount: action.amount,
        isAllIn: this.isAllInAction(action.amount, node.player)
      }))
  }

  /**
   * Navigate to a specific node by following a path of actions
   */
  navigateByPath(startNodeId: string, actionTypes: string[]): string | null {
    let currentNodeId = startNodeId

    for (const actionType of actionTypes) {
      const node = this.nodeCache.get(currentNodeId)
      if (!node) return null

      const action = node.actions.find(a => a.type === actionType && a.node)
      if (!action || !action.node) return null

      currentNodeId = action.node
    }

    return currentNodeId
  }

  /**
   * Get all terminal nodes reachable from a given node
   */
  getTerminalNodes(startNodeId: string): string[] {
    const terminals: string[] = []
    const visited = new Set<string>()

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)

      const node = this.nodeCache.get(nodeId)
      if (!node) return

      if (node.isTerminal) {
        terminals.push(nodeId)
        return
      }

      node.children.forEach(childId => traverse(childId))
    }

    traverse(startNodeId)
    return terminals
  }

  /**
   * Get tree statistics for performance monitoring
   */
  getTreeStats() {
    const nodes = Array.from(this.nodeCache.values())
    const branchingFactors = nodes
      .filter(n => !n.isTerminal)
      .map(n => n.children.length)

    return {
      totalNodes: nodes.length,
      terminalNodes: nodes.filter(n => n.isTerminal).length,
      maxDepth: Math.max(...nodes.map(n => n.depth)),
      avgBranchingFactor: branchingFactors.reduce((a, b) => a + b, 0) / branchingFactors.length,
      maxBranchingFactor: Math.max(...branchingFactors),
      nodesWithHandData: nodes.filter(n => n.hasHandData).length
    }
  }

  private formatActionLabel(type: string, amount: number): string {
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

  private isAllInAction(amount: number, player: number): boolean {
    // This would need access to stack sizes from settings
    // For now, return false - implement based on your stack tracking logic
    return false
  }
}

/**
 * Utility functions for tree operations
 */
export const TreeUtils = {
  /**
   * Find the shortest path between two nodes
   */
  findShortestPath(tree: OptimizedTree, fromNodeId: string, toNodeId: string): string[] | null {
    const queue: Array<{ nodeId: string; path: string[] }> = [{ nodeId: fromNodeId, path: [fromNodeId] }]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!
      
      if (nodeId === toNodeId) {
        return path
      }

      if (visited.has(nodeId)) continue
      visited.add(nodeId)

      const node = tree.nodes[nodeId]
      if (!node) continue

      // Add children to queue
      node.children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push({ nodeId: childId, path: [...path, childId] })
        }
      })
    }

    return null
  },

  /**
   * Get all nodes at a specific depth
   */
  getNodesAtDepth(tree: OptimizedTree, depth: number): TreeNode[] {
    return Object.values(tree.nodes).filter(node => node.depth === depth)
  },

  /**
   * Calculate tree memory footprint
   */
  calculateMemoryFootprint(tree: OptimizedTree): number {
    return JSON.stringify(tree).length * 2 // Rough estimate: 2 bytes per character
  }
}