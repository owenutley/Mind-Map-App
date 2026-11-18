import { create } from 'zustand';
import { MindMapDocument, MindMapNode, NodeStatus } from '../types/mindmap';

export type ActiveView = 'canvas' | 'kanban' | 'outline' | 'presentation';

interface GraphState {
  document: MindMapDocument;
  selectedNodeId: string | null;
  activeCenterId: string;
  activeView: ActiveView;
  isSaving: boolean;
  lastSavedAt: string | null;
  
  // History for Undo/Redo
  past: MindMapDocument[];
  future: MindMapDocument[];

  // Actions
  setSelectedNodeId: (id: string | null) => void;
  setActiveCenterId: (id: string) => void;
  setActiveView: (view: ActiveView) => void;
  
  // Node Operations
  addNode: (parentId: string | null, title?: string) => string;
  updateNode: (id: string, updates: Partial<MindMapNode>) => void;
  deleteNode: (id: string) => void;
  toggleCompletion: (id: string) => void;
  setNodeStatus: (id: string, status: NodeStatus) => void;
  reparentNode: (id: string, newParentId: string | null) => void;

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
      color: '#3b82f6',
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
    selectedNodeId: initialDoc.rootNodeId,
    activeCenterId: initialDoc.rootNodeId,
    activeView: 'canvas',
    isSaving: false,
    lastSavedAt: null,
    past: [],
    future: [],

    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    setActiveCenterId: (id) => set({ activeCenterId: id }),
    setActiveView: (view) => set({ activeView: view }),

    addNode: (parentId, title = 'New Thought') => {
      const state = get();
      const parent = parentId ? state.document.nodes[parentId] : null;
      const level = parent ? parent.level + 1 : 0;
      const newId = generateId();
      const now = new Date().toISOString();

      const siblings = Object.values(state.document.nodes).filter(n => n.parentId === parentId);
      const order = siblings.length;

      const newNode: MindMapNode = {
        id: newId,
        parentId,
        title,
        notes: '',
        level,
        order,
        status: 'todo',
        isCompleted: false,
        color: parent?.color || '#3b82f6',
        createdAt: now,
        updatedAt: now
      };

      const newDoc: MindMapDocument = {
        ...state.document,
        nodes: {
          ...state.document.nodes,
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

      const isCompleted = !node.isCompleted;
      const status: NodeStatus = isCompleted ? 'completed' : 'todo';

      get().updateNode(id, { isCompleted, status });
    },

    setNodeStatus: (id, status) => {
      const isCompleted = status === 'completed';
      get().updateNode(id, { status, isCompleted });
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
