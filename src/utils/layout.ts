import { hierarchy, tree } from 'd3-hierarchy';
import { Node as RFNode, Edge as RFEdge, Position } from '@xyflow/react';
import { MindMapDocument, MindMapNode } from '../types/mindmap';

export type BranchDirection = 'right' | 'left' | 'top' | 'bottom' | 'root';

interface HierarchyDatum {
  id: string;
  node: MindMapNode;
  direction: BranchDirection;
  children?: HierarchyDatum[];
}

export interface ComputedLayoutResult {
  nodes: RFNode[];
  edges: RFEdge[];
}

const CARD_WIDTH = 230;
const CARD_HEIGHT = 85;

/**
 * Computes the Euclidean distance between all 4 parent source ports
 * and all 4 child target ports, returning the closest pair.
 */
export function findClosestPortPair(
  parentPos: { x: number; y: number },
  childPos: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  const parentPorts: Record<string, { x: number; y: number }> = {
    'top-source': { x: parentPos.x + CARD_WIDTH / 2, y: parentPos.y },
    'bottom-source': { x: parentPos.x + CARD_WIDTH / 2, y: parentPos.y + CARD_HEIGHT },
    'left-source': { x: parentPos.x, y: parentPos.y + CARD_HEIGHT / 2 },
    'right-source': { x: parentPos.x + CARD_WIDTH, y: parentPos.y + CARD_HEIGHT / 2 }
  };

  const childPorts: Record<string, { x: number; y: number }> = {
    'top-target': { x: childPos.x + CARD_WIDTH / 2, y: childPos.y },
    'bottom-target': { x: childPos.x + CARD_WIDTH / 2, y: childPos.y + CARD_HEIGHT },
    'left-target': { x: childPos.x, y: childPos.y + CARD_HEIGHT / 2 },
    'right-target': { x: childPos.x + CARD_WIDTH, y: childPos.y + CARD_HEIGHT / 2 }
  };

  let minDistance = Infinity;
  let bestPair = { sourceHandle: 'right-source', targetHandle: 'left-target' };

  for (const [sKey, sPos] of Object.entries(parentPorts)) {
    for (const [tKey, tPos] of Object.entries(childPorts)) {
      const dist = Math.hypot(sPos.x - tPos.x, sPos.y - tPos.y);
      if (dist < minDistance) {
        minDistance = dist;
        bestPair = { sourceHandle: sKey, targetHandle: tKey };
      }
    }
  }

  return bestPair;
}

export function computeMindMapLayout(
  doc: MindMapDocument,
  centerId?: string
): ComputedLayoutResult {
  const rootId = centerId && doc.nodes[centerId] ? centerId : doc.rootNodeId;
  const rootNode = doc.nodes[rootId];
  if (!rootNode) return { nodes: [], edges: [] };

  const rfNodes: RFNode[] = [];
  const rfEdges: RFEdge[] = [];

  // Add the root / center node at coordinate (0, 0)
  rfNodes.push({
    id: rootNode.id,
    type: 'textTile',
    position: rootNode.position || { x: 0, y: 0 },
    data: {
      node: rootNode,
      isRoot: true,
      direction: 'root',
      incomingSide: null
    }
  });

  // Get direct children of the center node
  const directChildren = Object.values(doc.nodes)
    .filter(n => n.parentId === rootId)
    .sort((a, b) => a.order - b.order);

  if (directChildren.length === 0) {
    return { nodes: rfNodes, edges: rfEdges };
  }

  // 4-Sided Distribution from the root:
  // Distribute children across Right, Left, Top, Bottom
  // 1 child -> Right
  // 2 children -> Right, Left
  // 3 children -> Right, Left, Bottom
  // 4+ children -> Right, Left, Bottom, Top cyclically
  const buckets: Record<BranchDirection, MindMapNode[]> = {
    right: [],
    left: [],
    bottom: [],
    top: [],
    root: []
  };

  const directionsOrder: BranchDirection[] = ['right', 'left', 'bottom', 'top'];
  directChildren.forEach((child, idx) => {
    const dir = directionsOrder[idx % 4];
    buckets[dir].push(child);
  });

  const buildSubtree = (nodeId: string, direction: BranchDirection): HierarchyDatum => {
    const node = doc.nodes[nodeId];
    const children = Object.values(doc.nodes)
      .filter(n => n.parentId === nodeId)
      .sort((a, b) => a.order - b.order)
      .map(c => buildSubtree(c.id, direction));

    return {
      id: nodeId,
      node,
      direction,
      children: children.length > 0 ? children : undefined
    };
  };

  // Layout a directional cluster
  const layoutCluster = (
    childrenList: MindMapNode[],
    direction: 'right' | 'left' | 'top' | 'bottom'
  ) => {
    if (childrenList.length === 0) return;

    const virtualRootData: HierarchyDatum = {
      id: '__virtual__',
      node: rootNode,
      direction,
      children: childrenList.map(c => buildSubtree(c.id, direction))
    };

    const rootHierarchy = hierarchy<HierarchyDatum>(virtualRootData);

    const isHorizontal = direction === 'right' || direction === 'left';

    // Generous spacing: 390px level separation, 160px sibling separation
    const treeLayout = tree<HierarchyDatum>()
      .nodeSize(isHorizontal ? [160, 390] : [260, 240])
      .separation((a, b) => (a.parent === b.parent ? 1.05 : 1.35));

    const layoutTree = treeLayout(rootHierarchy);

    layoutTree.each(d => {
      if (d.data.id === '__virtual__') return;

      const nodeData = d.data.node;
      const isDirectChild = d.parent?.data.id === '__virtual__';
      const actualParentId = isDirectChild ? rootId : (d.parent?.data.id as string);

      let posX = 0;
      let posY = 0;

      if (direction === 'right') {
        posX = d.y;
        posY = d.x;
      } else if (direction === 'left') {
        posX = -d.y;
        posY = d.x;
      } else if (direction === 'bottom') {
        posX = d.x;
        posY = d.y + 60;
      } else if (direction === 'top') {
        posX = d.x;
        posY = -d.y - 60;
      }

      // If node has manual position, respect it; otherwise use computed pos
      const finalPos = nodeData.position || { x: posX, y: posY };

      let incomingSide: Position = Position.Left;
      if (direction === 'right') incomingSide = Position.Left;
      if (direction === 'left') incomingSide = Position.Right;
      if (direction === 'top') incomingSide = Position.Bottom;
      if (direction === 'bottom') incomingSide = Position.Top;

      rfNodes.push({
        id: nodeData.id,
        type: 'textTile',
        position: finalPos,
        data: {
          node: nodeData,
          isRoot: false,
          direction,
          incomingSide
        }
      });

      // Handle assignment:
      // If node already has explicit sourceHandle / targetHandle from a "Reconnect" action, use it!
      // Otherwise, use direction defaults:
      let sourceHandle = nodeData.sourceHandle;
      let targetHandle = nodeData.targetHandle;

      if (!sourceHandle || !targetHandle) {
        if (direction === 'right') {
          sourceHandle = 'right-source';
          targetHandle = 'left-target';
        } else if (direction === 'left') {
          sourceHandle = 'left-source';
          targetHandle = 'right-target';
        } else if (direction === 'bottom') {
          sourceHandle = 'bottom-source';
          targetHandle = 'top-target';
        } else {
          sourceHandle = 'top-source';
          targetHandle = 'bottom-target';
        }
      }

      rfEdges.push({
        id: `e-${actualParentId}-${nodeData.id}`,
        source: actualParentId,
        target: nodeData.id,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: nodeData.color || '#3b82f6',
          strokeWidth: Math.max(1.8, 3.2 - nodeData.level * 0.4),
          opacity: nodeData.isCompleted ? 0.35 : 0.85
        }
      });
    });
  };

  layoutCluster(buckets.right, 'right');
  layoutCluster(buckets.left, 'left');
  layoutCluster(buckets.bottom, 'bottom');
  layoutCluster(buckets.top, 'top');

  return { nodes: rfNodes, edges: rfEdges };
}

export function getAncestorBreadcrumbs(
  nodes: Record<string, MindMapNode>,
  nodeId: string
): string[] {
  const crumbs: string[] = [];
  let current = nodes[nodeId];
  while (current && current.parentId) {
    const parent = nodes[current.parentId];
    if (parent) {
      crumbs.unshift(parent.title);
      current = parent;
    } else {
      break;
    }
  }
  return crumbs;
}
