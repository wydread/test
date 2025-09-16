# Tree Generation API Documentation

## Overview

The tree generation edge function automatically creates optimized navigation structures from imported poker spot data. It processes raw node files and generates a hierarchical tree.json that enables fast menu creation and efficient node retrieval.

## Edge Function Endpoint

```
POST /functions/v1/generate-tree
```

## Request Format

```typescript
{
  zipData: Record<string, any>,  // Extracted ZIP file contents
  spotId: string,                // Database spot ID
  userId: string                 // User ID for authorization
}
```

## Response Format

### Success Response
```typescript
{
  success: true,
  metadata: {
    totalNodes: number,
    terminalNodes: number,
    generatedAt: string,
    version: string
  },
  treeSize: number  // Size in bytes
}
```

### Error Response
```typescript
{
  error: string,
  details?: string
}
```

## Tree.json Schema

### Root Structure
```typescript
interface OptimizedTree {
  nodes: Record<string, TreeNode>
  root: string
  maxDepth: number
  playerCount: number
  metadata: TreeMetadata
}
```

### Node Structure
```typescript
interface TreeNode {
  id: string                    // Unique node identifier
  parentId: string | null       // Parent node (null for root)
  player: number               // Active player (0-based)
  street: number               // Betting street (0-3)
  sequence: ActionSequence[]   // Actions leading to this node
  actions: NodeAction[]        // Available actions
  children: string[]           // Child node IDs
  depth: number               // Tree depth (0 for root)
  path: string                // Human-readable navigation path
  isTerminal: boolean         // No further actions available
  hasHandData: boolean        // Contains hand range data
}
```

## Performance Optimizations

### 1. Minimal Data Structure
- Only essential navigation data included
- Redundant information removed
- Compressed action sequences

### 2. Efficient Indexing
```typescript
// Fast lookups by depth
const nodesAtDepth = tree.nodes.filter(n => n.depth === targetDepth)

// Quick terminal node access
const terminals = tree.nodes.filter(n => n.isTerminal)

// Player-specific nodes
const playerNodes = tree.nodes.filter(n => n.player === playerId)
```

### 3. Path Optimization
- Pre-computed navigation paths
- Breadcrumb-ready format
- Human-readable action labels

### 4. Memory Efficiency
- Lazy loading support
- Cacheable structure
- Minimal memory footprint

## Usage Examples

### Basic Tree Navigation
```typescript
import { TreeNavigator } from '../utils/tree-navigator'

const navigator = new TreeNavigator(tree)
const navPath = navigator.getNavigationPath(nodeId)

console.log(navPath.breadcrumbs)  // Navigation trail
console.log(navPath.availableActions)  // Next possible actions
```

### Performance Monitoring
```typescript
import { TreeOptimizer } from '../utils/tree-optimizer'

const metrics = TreeOptimizer.calculateMetrics(tree)
console.log(`Average branching factor: ${metrics.avgBranchingFactor}`)
console.log(`Memory footprint: ${metrics.memoryFootprint} bytes`)
```

### Tree Validation
```typescript
const validation = TreeOptimizer.validateTree(tree)
if (!validation.isValid) {
  console.error('Tree validation errors:', validation.errors)
}
```

## Integration Workflow

### 1. File Import Process
```
User uploads ZIP → Extract files → Validate structure → Call edge function
```

### 2. Tree Generation
```
Parse nodes → Build hierarchy → Optimize structure → Store in database
```

### 3. Frontend Integration
```
Load tree.json → Initialize navigator → Render menus → Handle navigation
```

## Error Handling

### Common Errors
- **Missing root node**: No node with empty sequence found
- **Circular references**: Node references create loops
- **Invalid node references**: Actions point to non-existent nodes
- **Malformed data**: Required fields missing or invalid

### Error Recovery
- Automatic root node detection
- Reference validation and cleanup
- Graceful degradation for missing data

## Performance Benchmarks

### Target Metrics
- **Generation time**: < 5 seconds for 5K nodes
- **Memory usage**: < 50MB during processing
- **Tree size**: < 10MB for typical spots
- **Navigation speed**: < 100ms for any operation

### Optimization Strategies
- Streaming processing for large files
- Incremental tree building
- Memory-efficient data structures
- Caching for repeated operations

## Monitoring and Logging

### Key Metrics
- Generation time per spot
- Tree size distribution
- Error rates and types
- Memory usage patterns

### Logging Format
```typescript
{
  timestamp: string,
  spotId: string,
  userId: string,
  operation: 'generate_tree',
  duration: number,
  nodeCount: number,
  treeSize: number,
  errors?: string[]
}
```

## Future Enhancements

### Planned Features
- Incremental tree updates
- Tree diff generation
- Advanced compression algorithms
- Real-time tree streaming

### Scalability Improvements
- Distributed processing
- Tree sharding for large spots
- Background processing queues
- CDN integration for tree delivery