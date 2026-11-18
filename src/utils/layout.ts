import { hierarchy, tree } from 'd3-hierarchy';
import { Node as RFNode, Edge as RFEdge, Position } from '@xyflow/react';
import { MindMapDocument, MindMapNode } from '../types/mindmap';

interface HierarchyDatum {
  id: string;
  node: MindMapNode;
  direction: 'right' | 'left' | 'root';
  children?: HierarchyDatum[];
}

export interface ComputedLayoutResult {
  nodes: RFNode[];
  edges: RFEdge[];
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
    position: { x: 0, y: 0 },
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

  // Split direct children symmetrically into Right and Left clusters
  const half = Math.ceil(directChildren.length / 2);
  const rightChildren = directChildren.slice(0, half);
  const leftChildren = directChildren.slice(half);

  // Helper to build a hierarchical datum tree with direction tag
  const buildSubtree = (nodeId: string, direction: 'right' | 'left'): HierarchyDatum => {
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

  // Helper to lay out a directional cluster using D3 Tree
  // Horizontal separation: 380px, Vertical sibling separation: 160px
  const layoutCluster = (
    childrenList: MindMapNode[],
    direction: 'right' | 'left'
  ) => {
    if (childrenList.length === 0) return;

    // Wrap in a virtual dummy root for layout calculation
    const virtualRootData: HierarchyDatum = {
      id: '__virtual__',
      node: rootNode,
      direction,
      children: childrenList.map(c => buildSubtree(c.id, direction))
    };

    const rootHierarchy = hierarchy<HierarchyDatum>(virtualRootData);

    const treeLayout = tree<HierarchyDatum>()
      .nodeSize([160, 390]) // [vertical spacing, horizontal level spacing]
      .separation((a, b) => (a.parent === b.parent ? 1.05 : 1.35));

    const layoutTree = treeLayout(rootHierarchy);

    // Collect descendants (skip the virtual root itself)
    layoutTree.each(d => {
      if (d.data.id === '__virtual__') return;

      const nodeData = d.data.node;
      const isDirectChild = d.parent?.data.id === '__virtual__';
      const actualParentId = isDirectChild ? rootId : (d.parent?.data.id as string);

      // In D3 tree: d.x is vertical coordinate, d.y is horizontal depth from virtual root
      const posX = direction === 'right' ? d.y : -d.y;
      const posY = d.x;

      // Determine incoming handle side and outgoing handle side
      // For Right cluster:
      //   Incoming parent connection enters via LEFT handle
      //   Outgoing child connections emit from RIGHT handle (or TOP / BOTTOM if branching up/down)
      // For Left cluster:
      //   Incoming parent connection enters via RIGHT handle
      //   Outgoing child connections emit from LEFT handle (or TOP / BOTTOM)
      const incomingSide: Position = direction === 'right' ? Position.Left : Position.Right;

      rfNodes.push({
        id: nodeData.id,
        type: 'textTile',
        position: { x: posX, y: posY },
        data: {
          node: nodeData,
          isRoot: false,
          direction,
          incomingSide
        }
      });

      // Calculate source and target handles:
      // If parent is root, root source handle corresponds to cluster direction:
      let sourceHandle = 'right-source';
      let targetHandle = 'left-target';

      if (isDirectChild) {
        sourceHandle = direction === 'right' ? 'right-source' : 'left-source';
        targetHandle = direction === 'right' ? 'left-target' : 'right-target';
      } else {
        // Child to child in cluster
        // If child is positioned substantially above/below parent, fan out via top/bottom
        const deltaY = d.x - (d.parent?.x || 0);
        if (deltaY > 120) {
          sourceHandle = 'bottom-source';
        } else if (deltaY < -120) {
          sourceHandle = 'top-source';
        } else {
          sourceHandle = direction === 'right' ? 'right-source' : 'left-source';
        }
        targetHandle = direction === 'right' ? 'left-target' : 'right-target';
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

  // Run layout for Right and Left clusters
  layoutCluster(rightChildren, 'right');
  layoutCluster(leftChildren, 'left');

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
