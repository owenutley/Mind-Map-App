import { create } from 'zustand';
import { MindMapDocument, MindMapNode, NodeStatus } from '../types/mindmap';
import { findClosestPortPair } from '../utils/layout';

export type ActiveView = 'canvas' | 'kanban' | 'outline' | 'presentation';

export const BRANCH_PALETTE = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1'  // Indigo
];

interface GraphState {
  document: MindMapDocument;
  selectedNodeId: string | null;
  isInspectorOpen: boolean;
  activeCenterId: string;
  activeView: ActiveView;
  hideCompleted: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  
  // History for Undo/Redo
  past: MindMapDocument[];
  future: MindMapDocument[];

  // Actions
  setSelectedNodeId: (id: string | null, openInspector?: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setActiveCenterId: (id: string) => void;
  setActiveView: (view: ActiveView) => void;
  toggleHideCompleted: () => void;
  
  // Node Operations
  addNode: (parentId: string | null, title?: string, initialDirection?: 'right' | 'left' | 'top' | 'bottom') => string;
  updateNode: (id: string, updates: Partial<MindMapNode>) => void;
  updateNodeColor: (id: string, newColor: string, updateChildren?: boolean) => void;
  deleteNode: (id: string) => void;
  toggleCompletion: (id: string) => void;
  toggleCollapse: (id: string) => void;
  collapseAllToL2: () => void;
  expandAll: () => void;
  setNodeStatus: (id: string, status: NodeStatus) => void;
  reparentNode: (id: string, newParentId: string | null) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  reconnectToParentClosest: (id: string, childPos?: { x: number; y: number }, parentPos?: { x: number; y: number }) => void;
  reconnectAllClosest: (positionsMap?: Record<string, { x: number; y: number }>) => void;

  // Document Operations
  newDocument: (title?: string) => void;
  loadDocument: (doc: MindMapDocument) => void;
  renameDocument: (title: string) => void;
  saveCurrentDocument: () => Promise<void>;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 10);

const createDefaultDocument = (title = 'Main Vision'): MindMapDocument => {
  const rootId = generateId();
  const sub1Id = generateId();
  const sub2Id = generateId();
  const sub3Id = generateId();
  const sub1ChildId = generateId();
  const l3ChildA = generateId();
  const l3ChildB = generateId();

  const now = new Date().toISOString();

  const nodes: Record<string, MindMapNode> = {
    [rootId]: {
      id: rootId,
      parentId: null,
      title: title,
      notes: 'Central topic of this mind map. Add branches to explore thoughts.',
      level: 0,
      order: 0,
      status: 'in_progress',
      isCompleted: false,
      color: '#64748b',
      createdAt: now,
      updatedAt: now
    },
    [sub1Id]: {
      id: sub1Id,
      parentId: rootId,
      title: 'Strategy & Objectives',
      notes: 'Key pillars and milestones for execution.',
      level: 1,
      order: 0,
      status: 'todo',
      isCompleted: false,
      color: '#10b981',
      createdAt: now,
      updatedAt: now
    },
    [sub2Id]: {
      id: sub2Id,
      parentId: rootId,
      title: 'Design & Architecture',
      notes: 'UI/UX mockups, clean aesthetic, and system layout.',
      level: 1,
      order: 1,
      status: 'completed',
      isCompleted: true,
      color: '#8b5cf6',
      createdAt: now,
      updatedAt: now
    },
    [sub3Id]: {
      id: sub3Id,
      parentId: rootId,
      title: 'Action Roadmap',
      notes: 'Tactical execution items and deadlines.',
      level: 1,
      order: 2,
      status: 'todo',
      isCompleted: false,
      color: '#f59e0b',
      createdAt: now,
      updatedAt: now
    },
    [sub1ChildId]: {
      id: sub1ChildId,
      parentId: sub1Id,
      title: 'Define Q1 Core Deliverables',
      notes: 'Prioritized list of features and user feedback loops.',
      level: 2,
      order: 0,
      status: 'in_progress',
      isCompleted: false,
      isCollapsed: true, // Naturally folded L3+ by default
      color: '#10b981',
      createdAt: now,
      updatedAt: now
    },
    [l3ChildA]: {
      id: l3ChildA,
      parentId: sub1ChildId,
      title: 'Architecture & API Specs',
      notes: 'Detailed endpoints, schema definitions, and contract tests.',
      level: 3,
      order: 0,
      status: 'todo',
      isCompleted: false,
      color: '#10b981',
      createdAt: now,
      updatedAt: now
    },
    [l3ChildB]: {
      id: l3ChildB,
      parentId: sub1ChildId,
      title: 'Telemetry & Observability',
      notes: 'Metrics pipeline, alerting rules, and structured tracing.',
      level: 3,
      order: 1,
      status: 'todo',
      isCompleted: false,
      color: '#10b981',
      createdAt: now,
      updatedAt: now
    }
  };

  return {
    id: `map-${Date.now()}`,
    title,
    version: '1.0',
    theme: 'dark',
    rootNodeId: rootId,
    nodes,
    viewport: { x: 0, y: 0, zoom: 1 }
  };
};

const recalculateLevels = (
  nodes: Record<string, MindMapNode>,
  rootId: string
): Record<string, MindMapNode> => {
  const updated = { ...nodes };

  const walk = (nodeId: string, currentLevel: number) => {
    if (!updated[nodeId]) return;
    updated[nodeId] = { ...updated[nodeId], level: currentLevel };
    const children = Object.values(updated).filter(n => n.parentId === nodeId);
    children.forEach(c => walk(c.id, currentLevel + 1));
  };

  walk(rootId, 0);
  return updated;
};

export const useGraphStore = create<GraphState>((set, get) => {
  const initialDoc = createDefaultDocument();

  const recordSnapshot = (state: GraphState) => {
    const past = [...state.past, state.document].slice(-30); // max 30 undo steps
    return { past, future: [] };
  };

  return {
    document: initialDoc,
    selectedNodeId: null,
    isInspectorOpen: false,
    activeCenterId: initialDoc.rootNodeId,
    activeView: 'canvas',
    hideCompleted: false,
    isSaving: false,
    lastSavedAt: null,
    past: [],
    future: [],

    setSelectedNodeId: (id, openInspector = true) => set((state) => ({
      selectedNodeId: id,
      isInspectorOpen: id !== null ? (openInspector ? true : state.isInspectorOpen) : false
    })),
    setInspectorOpen: (open) => set({ isInspectorOpen: open }),
    setActiveCenterId: (id) => set({ activeCenterId: id }),
    setActiveView: (view) => set({ activeView: view }),
    toggleHideCompleted: () => set((state) => ({ hideCompleted: !state.hideCompleted })),

    addNode: (parentId, title = 'New Thought', initialDirection) => {
      const state = get();
      const parent = parentId ? state.document.nodes[parentId] : null;
      const level = parent ? parent.level + 1 : 0;
      const newId = generateId();
      const now = new Date().toISOString();

      const siblings = Object.values(state.document.nodes).filter(n => n.parentId === parentId);
      const order = siblings.length;

      let sourceHandle: string | undefined;
      let targetHandle: string | undefined;

      if (initialDirection) {
        if (initialDirection === 'top') {
          sourceHandle = 'top-source';
          targetHandle = 'bottom-target';
        } else if (initialDirection === 'bottom') {
          sourceHandle = 'bottom-source';
          targetHandle = 'top-target';
        } else if (initialDirection === 'left') {
          sourceHandle = 'left-source';
          targetHandle = 'right-target';
        } else {
          sourceHandle = 'right-source';
          targetHandle = 'left-target';
        }
      }

      // Determine color:
      // If connected to root, pick from BRANCH_PALETTE so each new primary branch gets a distinct vibrant color
      // Otherwise, copy parent's color
      let nodeColor = '#3b82f6';
      if (parentId === state.document.rootNodeId) {
        nodeColor = BRANCH_PALETTE[siblings.length % BRANCH_PALETTE.length];
      } else if (parent && parent.color && parent.color !== '#ffffff') {
        nodeColor = parent.color;
      }

      // If parent was collapsed, auto-uncollapse so user sees the new thought they just created
      const parentNode = parent && parent.isCollapsed
        ? { [parent.id]: { ...parent, isCollapsed: false } }
        : {};

      const newNode: MindMapNode = {
        id: newId,
        parentId,
        title,
        notes: '',
        level,
        order,
        status: 'todo',
        isCompleted: false,
        isCollapsed: false,
        color: nodeColor,
        sourceHandle,
        targetHandle,
        createdAt: now,
        updatedAt: now
      };

      const newDoc: MindMapDocument = {
        ...state.document,
        nodes: {
          ...state.document.nodes,
          ...parentNode,
          [newId]: newNode
        }
      };

      set({
        ...recordSnapshot(state),
        document: newDoc,
        selectedNodeId: newId
      });

      // trigger autosave
      get().saveCurrentDocument();
      return newId;
    },

    updateNode: (id, updates) => {
      const state = get();
      const existing = state.document.nodes[id];
      if (!existing) return;

      const updatedNode = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const newDoc = {
        ...state.document,
        nodes: {
          ...state.document.nodes,
          [id]: updatedNode
        }
      };

      set({
        ...recordSnapshot(state),
        document: newDoc
      });

      get().saveCurrentDocument();
    },

    updateNodeColor: (id, newColor, updateChildren = true) => {
      const state = get();
      const node = state.document.nodes[id];
      if (!node) return;

      const oldColor = node.color;
      const updatedNodes = { ...state.document.nodes };
      updatedNodes[id] = { ...node, color: newColor };

      if (updateChildren) {
        const updateDescendants = (parentId: string) => {
          Object.values(updatedNodes).forEach(child => {
            if (child.parentId === parentId && (!child.color || child.color === oldColor)) {
              updatedNodes[child.id] = { ...child, color: newColor };
              updateDescendants(child.id);
            }
          });
        };
        updateDescendants(id);
      }

      const newDoc = {
        ...state.document,
        nodes: updatedNodes
      };

      set({
        ...recordSnapshot(state),
        document: newDoc
      });

      get().saveCurrentDocument();
    },

    deleteNode: (id) => {
      const state = get();
      if (id === state.document.rootNodeId) return; // Prevent deleting root

      const target = state.document.nodes[id];
      if (!target) return;

      const remainingNodes = { ...state.document.nodes };
      const parentId = target.parentId;

      // Collect all descendents recursively
      const toDelete = new Set<string>([id]);
      const findChildren = (pid: string) => {
        Object.values(remainingNodes).forEach(n => {
          if (n.parentId === pid) {
            toDelete.add(n.id);
            findChildren(n.id);
          }
        });
      };
      findChildren(id);

      toDelete.forEach(nodeId => {
        delete remainingNodes[nodeId];
      });

      const newDoc = {
        ...state.document,
        nodes: remainingNodes
      };

      set({
        ...recordSnapshot(state),
        document: newDoc,
        selectedNodeId: parentId || state.document.rootNodeId,
        activeCenterId: state.activeCenterId === id ? state.document.rootNodeId : state.activeCenterId
      });

      get().saveCurrentDocument();
    },

    toggleCompletion: (id) => {
      const state = get();
      const node = state.document.nodes[id];
      if (!node) return;

      const newIsCompleted = !node.isCompleted;
      const newStatus: NodeStatus = newIsCompleted ? 'completed' : 'todo';
      const updatedNodes = { ...state.document.nodes };
      const now = new Date().toISOString();

      updatedNodes[id] = {
        ...node,
        isCompleted: newIsCompleted,
        status: newStatus,
        updatedAt: now
      };

      // Cascade completion state to all children/descendants
      const cascadeDescendants = (parentId: string, completed: boolean) => {
        Object.values(updatedNodes).forEach(child => {
          if (child.parentId === parentId) {
            updatedNodes[child.id] = {
              ...child,
              isCompleted: completed,
              status: completed ? 'completed' : 'todo',
              updatedAt: now
            };
            cascadeDescendants(child.id, completed);
          }
        });
      };

      // Upward propagation:
      // If all children of a parent are checked, parent is checked.
      // If one child is unchecked, parent is unchecked.
      const propagateUpward = (startId: string) => {
        let currentId: string | null = updatedNodes[startId]?.parentId;
        while (currentId) {
          const parent = updatedNodes[currentId];
          if (!parent) break;

          const siblings = Object.values(updatedNodes).filter(n => n.parentId === currentId);
          if (siblings.length > 0) {
            const allCompleted = siblings.every(s => s.isCompleted);
            if (parent.isCompleted !== allCompleted) {
              updatedNodes[currentId] = {
                ...parent,
                isCompleted: allCompleted,
                status: allCompleted ? 'completed' : (siblings.some(s => s.isCompleted || s.status === 'in_progress') ? 'in_progress' : 'todo'),
                updatedAt: now
              };
            }
          }
          currentId = parent.parentId;
        }
      };

      cascadeDescendants(id, newIsCompleted);
      propagateUpward(id);

      const newDoc = {
        ...state.document,
        nodes: updatedNodes
      };

      set({
        ...recordSnapshot(state),
        document: newDoc
      });

      get().saveCurrentDocument();
    },

    toggleCollapse: (id) => {
      const state = get();
      const node = state.document.nodes[id];
      if (!node) return;

      const isCollapsed = !node.isCollapsed;
      const updatedNodes = {
        ...state.document.nodes,
        [id]: { ...node, isCollapsed }
      };

      set({
        ...recordSnapshot(state),
        document: {
          ...state.document,
          nodes: updatedNodes
        }
      });
      get().saveCurrentDocument();
    },

    collapseAllToL2: () => {
      const state = get();
      const updatedNodes = { ...state.document.nodes };
      Object.values(updatedNodes).forEach(node => {
        const hasChildren = Object.values(updatedNodes).some(n => n.parentId === node.id);
        if (hasChildren) {
          updatedNodes[node.id] = { ...node, isCollapsed: node.level >= 2 };
        }
      });

      set({
        ...recordSnapshot(state),
        document: { ...state.document, nodes: updatedNodes }
      });
      get().saveCurrentDocument();
    },

    expandAll: () => {
      const state = get();
      const updatedNodes = { ...state.document.nodes };
      Object.values(updatedNodes).forEach(node => {
        if (node.isCollapsed) {
          updatedNodes[node.id] = { ...node, isCollapsed: false };
        }
      });

      set({
        ...recordSnapshot(state),
        document: { ...state.document, nodes: updatedNodes }
      });
      get().saveCurrentDocument();
    },

    setNodeStatus: (id, status) => {
      const state = get();
      const node = state.document.nodes[id];
      if (!node) return;

      const isCompleted = status === 'completed';
      const updatedNodes = { ...state.document.nodes };
      const now = new Date().toISOString();

      updatedNodes[id] = {
        ...node,
        status,
        isCompleted,
        updatedAt: now
      };

      // Cascade completion state if marked completed or moved back to todo
      const cascadeDescendants = (parentId: string, completed: boolean) => {
        Object.values(updatedNodes).forEach(child => {
          if (child.parentId === parentId) {
            updatedNodes[child.id] = {
              ...child,
              isCompleted: completed,
              status: completed ? 'completed' : status,
              updatedAt: now
            };
            cascadeDescendants(child.id, completed);
          }
        });
      };

      // Upward propagation for status change
      const propagateUpward = (startId: string) => {
        let currentId: string | null = updatedNodes[startId]?.parentId;
        while (currentId) {
          const parent = updatedNodes[currentId];
          if (!parent) break;

          const siblings = Object.values(updatedNodes).filter(n => n.parentId === currentId);
          if (siblings.length > 0) {
            const allCompleted = siblings.every(s => s.isCompleted);
            if (parent.isCompleted !== allCompleted) {
              updatedNodes[currentId] = {
                ...parent,
                isCompleted: allCompleted,
                status: allCompleted ? 'completed' : (siblings.some(s => s.isCompleted || s.status === 'in_progress') ? 'in_progress' : 'todo'),
                updatedAt: now
              };
            }
          }
          currentId = parent.parentId;
        }
      };

      cascadeDescendants(id, isCompleted);
      propagateUpward(id);

      const newDoc = {
        ...state.document,
        nodes: updatedNodes
      };

      set({
        ...recordSnapshot(state),
        document: newDoc
      });

      get().saveCurrentDocument();
    },

    reparentNode: (id, newParentId) => {
      const state = get();
      const node = state.document.nodes[id];
      if (!node || id === state.document.rootNodeId) return;
      if (id === newParentId) return;

      const updatedNodes = {
        ...state.document.nodes,
        [id]: { ...node, parentId: newParentId }
      };

      const recalculated = recalculateLevels(updatedNodes, state.document.rootNodeId);

      const newDoc = {
        ...state.document,
        nodes: recalculated
      };

      set({
        ...recordSnapshot(state),
        document: newDoc
      });

      get().saveCurrentDocument();
    },

    updateNodePosition: (id, position) => {
      const state = get();
      const node = state.document.nodes[id];
      if (!node) return;

      const newDoc = {
        ...state.document,
        nodes: {
          ...state.document.nodes,
          [id]: { ...node, position }
        }
      };

      set({ document: newDoc });
      get().saveCurrentDocument();
    },

    reconnectToParentClosest: (id, childPos, parentPos) => {
      const state = get();
      const node = state.document.nodes[id];
      if (!node || !node.parentId) return;

      const parent = state.document.nodes[node.parentId];
      if (!parent) return;

      const cPos = childPos || node.position || { x: 300, y: 0 };
      const pPos = parentPos || parent.position || { x: 0, y: 0 };

      const bestPair = findClosestPortPair(pPos, cPos);

      const newDoc = {
        ...state.document,
        nodes: {
          ...state.document.nodes,
          [id]: {
            ...node,
            sourceHandle: bestPair.sourceHandle,
            targetHandle: bestPair.targetHandle
          }
        }
      };

      set({
        ...recordSnapshot(state),
        document: newDoc
      });

      get().saveCurrentDocument();
    },

    reconnectAllClosest: (positionsMap) => {
      const state = get();
      const updatedNodes = { ...state.document.nodes };
      let changed = false;

      Object.values(updatedNodes).forEach(node => {
        if (!node.parentId) return;
        const parent = updatedNodes[node.parentId];
        if (!parent) return;

        const cPos = positionsMap?.[node.id] || node.position || { x: 300, y: 0 };
        const pPos = positionsMap?.[parent.id] || parent.position || { x: 0, y: 0 };

        const bestPair = findClosestPortPair(pPos, cPos);
        if (node.sourceHandle !== bestPair.sourceHandle || node.targetHandle !== bestPair.targetHandle) {
          updatedNodes[node.id] = {
            ...node,
            sourceHandle: bestPair.sourceHandle,
            targetHandle: bestPair.targetHandle
          };
          changed = true;
        }
      });

      if (changed) {
        const newDoc = { ...state.document, nodes: updatedNodes };
        set({
          ...recordSnapshot(state),
          document: newDoc
        });
        get().saveCurrentDocument();
      }
    },

    newDocument: (title = 'Untitled Mind Map') => {
      const newDoc = createDefaultDocument(title);
      set({
        document: newDoc,
        selectedNodeId: newDoc.rootNodeId,
        activeCenterId: newDoc.rootNodeId,
        past: [],
        future: []
      });
      get().saveCurrentDocument();
    },

    loadDocument: (doc) => {
      set({
        document: doc,
        selectedNodeId: doc.rootNodeId,
        activeCenterId: doc.rootNodeId,
        past: [],
        future: []
      });
    },

    renameDocument: (title) => {
      const state = get();
      const rootNode = state.document.nodes[state.document.rootNodeId];
      const updatedNodes = rootNode
        ? {
            ...state.document.nodes,
            [rootNode.id]: { ...rootNode, title }
          }
        : state.document.nodes;

      const newDoc = {
        ...state.document,
        title,
        nodes: updatedNodes
      };

      set({
        ...recordSnapshot(state),
        document: newDoc
      });

      get().saveCurrentDocument();
    },

    saveCurrentDocument: async () => {
      const doc = get().document;
      set({ isSaving: true });
      try {
        if (window.vaultAPI) {
          await window.vaultAPI.saveMap(doc);
        } else {
          // fallback to localStorage
          localStorage.setItem(`mindmap-vault-${doc.id}`, JSON.stringify(doc));
        }
        set({ isSaving: false, lastSavedAt: new Date().toLocaleTimeString() });
      } catch (err) {
        console.error('Save failed:', err);
        set({ isSaving: false });
      }
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0) return;

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      const newFuture = [state.document, ...state.future];

      set({
        document: previous,
        past: newPast,
        future: newFuture
      });
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return;

      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const newPast = [...state.past, state.document];

      set({
        document: next,
        past: newPast,
        future: newFuture
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0
  };
});
