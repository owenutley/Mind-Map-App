export type NodeStatus = 'todo' | 'in_progress' | 'completed';

export interface MindMapNode {
  id: string;
  parentId: string | null;       // null = Root/Center topic
  title: string;                 // Text tile title
  notes?: string;                // Optional supporting notes
  level: number;                 // 0 = Center Topic, 1 = Subtopic, 2 = Branch, etc.
  order: number;                 // Sibling order index
  status: NodeStatus;            // 'todo' | 'in_progress' | 'completed'
  isCompleted: boolean;          // Quick toggle (status === 'completed')
  color?: string;                // Custom node color or branch tint
  isCollapsed?: boolean;         // Child branch collapsing
  createdAt: string;
  updatedAt: string;
}

export interface MindMapDocument {
  id: string;
  title: string;
  version: string;
  theme: 'light' | 'dark' | 'system';
  rootNodeId: string;
  nodes: Record<string, MindMapNode>;
  viewport: { x: number; y: number; zoom: number };
}

export interface VaultFileSummary {
  id: string;
  title: string;
  path: string;
  updatedAt: string;
  nodeCount: number;
}
