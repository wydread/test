// Tree.json Schema Definition

export interface TreeNode {
  /** Unique identifier for the node */
  id: string
  
  /** Parent node ID, null for root */
  parentId: string | null
  
  /** Active player at this node (0-based index) */
  player: number
  
  /** Betting street (0=preflop, 1=flop, 2=turn, 3=river) */
  street: number
  
  /** Sequence of actions leading to this node */
  sequence: ActionSequence[]
  
  /** Available actions from this node */
  actions: NodeAction[]
  
  /** Child node IDs */
  children: string[]
  
  /** Depth in the tree (0 for root) */
  depth: number
  
  /** Human-readable path for navigation */
  path: string
  
  /** Whether this is a terminal node */
  isTerminal: boolean
  
  /** Whether this node has hand range data */
  hasHandData: boolean
}

export interface ActionSequence {
  /** Player who made the action */
  player: number
  
  /** Action type (F=fold, C=call, R=raise, X=check) */
  type: string
  
  /** Bet/raise amount (0 for fold/check) */
  amount: number
  
  /** Street where action occurred */
  street: number
}

export interface NodeAction {
  /** Action type */
  type: string
  
  /** Action amount */
  amount: number
  
  /** Target node ID (if action leads to another node) */
  node?: string
}

export interface OptimizedTree {
  /** All nodes indexed by ID */
  nodes: Record<string, TreeNode>
  
  /** Root node ID */
  root: string
  
  /** Maximum depth of the tree */
  maxDepth: number
  
  /** Number of players in the game */
  playerCount: number
  
  /** Tree metadata */
  metadata: TreeMetadata
}

export interface TreeMetadata {
  /** Total number of nodes */
  totalNodes: number
  
  /** Number of terminal nodes */
  terminalNodes: number
  
  /** Generation timestamp */
  generatedAt: string
  
  /** Tree format version */
  version: string
}

// Navigation utilities
export interface NavigationPath {
  /** Current node ID */
  currentNode: string
  
  /** Breadcrumb trail */
  breadcrumbs: BreadcrumbItem[]
  
  /** Available next actions */
  availableActions: NavigationAction[]
}

export interface BreadcrumbItem {
  /** Node ID */
  nodeId: string
  
  /** Display label */
  label: string
  
  /** Player who acted */
  player: number
  
  /** Action taken */
  action: string
}

export interface NavigationAction {
  /** Action label for UI */
  label: string
  
  /** Target node ID */
  targetNode: string
  
  /** Action type */
  type: string
  
  /** Action amount */
  amount: number
  
  /** Whether this is an all-in action */
  isAllIn: boolean
}

// Performance optimization types
export interface TreeIndex {
  /** Nodes by depth level */
  byDepth: Record<number, string[]>
  
  /** Nodes by player */
  byPlayer: Record<number, string[]>
  
  /** Terminal nodes */
  terminals: string[]
  
  /** Nodes with hand data */
  withHandData: string[]
}

export interface TreeStats {
  /** Average branching factor */
  avgBranchingFactor: number
  
  /** Maximum branching factor */
  maxBranchingFactor: number
  
  /** Tree balance score (0-1, 1 = perfectly balanced) */
  balanceScore: number
  
  /** Memory footprint estimate (bytes) */
  memoryFootprint: number
}