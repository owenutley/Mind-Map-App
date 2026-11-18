import { hierarchy, tree } from 'd3-hierarchy';
import { Node as RFNode, Edge as RFEdge } from '@xyflow/react';
import { MindMapDocument, MindMapNode } from '../types/mindmap';

interface HierarchyDatum {
  id: string;
  node: MindMapNode;
  children?: HierarchyDatum[];
}

export function computeMindMapLayout(
  doc: MindMapDocument,
  centerId?: string
): { nodes: RFNode[]; edges: RFEdge[] } {
  const rootId = centerId && doc.nodes[centerId] ? centerId : doc.rootNodeId;
  const rootNode = doc.nodes[rootId];
  if (!rootNode) return { nodes: [], edges: [] };

  // Build recursive hierarchy tree
  const buildTree = (id: string): HierarchyDatum => {
    const node = doc.nodes[id];
    const children = Object.values(doc.nodes)
      .filter(n => n.parentId === id)
      .sort((a, b) => a.order - b.order)
      .map(c => buildTree(c.id));

    return {
      id,
      node,
      children: children.length > 0 ? children : undefined
    };
  };

  const rootHierarchy = hierarchy<HierarchyDatum>(buildTree(rootId));

  // Balanced tree layout:
  // Node width ~ 240px, height ~ 90px
  // Sibling separation: 110px, Level separation: 280px
  const treeLayout = tree<HierarchyDatum>()
    .nodeSize([110, 280])
    .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.4));

  const layoutRoot = treeLayout(rootHierarchy);

  const rfNodes: RFNode[] = [];
  const rfEdges: RFEdge[] = [];

  // D3 tree computes x = vertical, y = horizontal depth by default
  layoutRoot.each(d => {
    const nodeData = d.data.node;
    rfNodes.push({
      id: nodeData.id,
      type: 'textTile',
      position: {
        x: d.y, // horizontal branching
        y: d.x  // vertical spacing
      },
      data: {
        node: nodeData,
        isRoot: nodeData.id === rootId
      }
    });

    if (d.parent) {
      rfEdges.push({
        id: `e-${d.parent.data.id}-${nodeData.id}`,
        source: d.parent.data.id,
        target: nodeData.id,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: nodeData.color || '#3b82f6',
          strokeWidth: Math.max(1.5, 3.5 - nodeData.level * 0.5),
          opacity: nodeData.isCompleted ? 0.4 : 0.85
        }
      });
    }
  });

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
