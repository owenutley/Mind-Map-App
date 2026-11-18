import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeMouseHandler,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  Connection,
  OnConnect
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Magnet, Sparkles } from 'lucide-react';
import { TextTileNode } from './TextTileNode';
import { useGraphStore } from '../../store/graphStore';
import { useThemeStore } from '../../store/themeStore';
import { computeMindMapLayout } from '../../utils/layout';

const nodeTypes = {
  textTile: TextTileNode
};

const InnerCanvas: React.FC = () => {
  const {
    document: doc,
    activeCenterId,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    deleteNode,
    toggleCompletion,
    updateNode,
    updateNodePosition,
    reconnectAllClosest,
    hideCompleted
  } = useGraphStore();

  const effectiveTheme = useThemeStore(s => s.effectiveTheme);
  const { fitView } = useReactFlow();
  const initialFitDone = useRef(false);

  // Compute balanced multi-directional D3 tree layout
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    return computeMindMapLayout(doc, activeCenterId, hideCompleted);
  }, [doc, activeCenterId, hideCompleted]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync state when layout changes
  useEffect(() => {
    setNodes(
      layoutNodes.map(n => ({
        ...n,
        selected: n.id === selectedNodeId
      }))
    );
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, selectedNodeId, setNodes, setEdges]);

  // Clean initial camera framing with generous margins
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({
        padding: 0.28,
        maxZoom: 1.05,
        minZoom: 0.55,
        duration: initialFitDone.current ? 350 : 0
      });
      initialFitDone.current = true;
    }, 60);
    return () => clearTimeout(timer);
  }, [activeCenterId, fitView]);

  // Update node position when dragged
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent | unknown, node: { id: string; position: { x: number; y: number } }) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );

  // Handle manual interactive connection between ports
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.target || !connection.source) return;
      updateNode(connection.target, {
        parentId: connection.source,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined
      });
    },
    [updateNode]
  );

  // Keyboard shortcuts for perpetual thought chaining
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (!selectedNodeId) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        addNode(selectedNodeId, 'New Branch');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const currentNode = doc.nodes[selectedNodeId];
        if (currentNode) {
          addNode(currentNode.parentId, 'New Thought');
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleCompletion(selectedNodeId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteNode(selectedNodeId);
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
      }
    },
    [selectedNodeId, doc.nodes, addNode, deleteNode, toggleCompletion, setSelectedNodeId]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleReconnectAll = () => {
    const posMap: Record<string, { x: number; y: number }> = {};
    nodes.forEach(n => {
      posMap[n.id] = n.position;
    });
    reconnectAllClosest(posMap);
  };

  const handleResetLayout = () => {
    // Clear manual positions to recalculate clean balanced layout
    Object.values(doc.nodes).forEach(n => {
      if (n.position || n.sourceHandle || n.targetHandle) {
        updateNode(n.id, { position: undefined, sourceHandle: undefined, targetHandle: undefined });
      }
    });
    setTimeout(() => {
      fitView({ padding: 0.28, duration: 400 });
    }, 100);
  };

  return (
    <div className="relative w-full h-full">
      {/* Floating Action Buttons */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={handleReconnectAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold border border-slate-200 dark:border-zinc-800 shadow-sm backdrop-blur transition hover:scale-105 active:scale-95"
          title="Reconnect all nodes using closest 4-sided ports"
        >
          <Magnet className="w-3.5 h-3.5 text-amber-500" />
          <span>Auto-Connect Closest</span>
        </button>

        <button
          onClick={handleResetLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold border border-slate-200 dark:border-zinc-800 shadow-sm backdrop-blur transition hover:scale-105 active:scale-95"
          title="Re-balance tree layout across all 4 quadrants"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Clean 4-Sided Layout</span>
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.28, maxZoom: 1.05, minZoom: 0.55 }}
        minZoom={0.2}
        maxZoom={2.2}
        defaultEdgeOptions={{
          type: 'smoothstep'
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={1.5}
          color={effectiveTheme === 'dark' ? '#27272a' : '#cbd5e1'}
        />
        <Controls
          showInteractive={false}
          className="!bg-white dark:!bg-zinc-900 !border-slate-200 dark:!border-zinc-800 !rounded-xl !shadow-sm overflow-hidden"
        />
        <MiniMap
          nodeStrokeWidth={2}
          zoomable
          pannable
          className="!bg-white/80 dark:!bg-zinc-900/80 !border-slate-200 dark:!border-zinc-800 !rounded-xl overflow-hidden !shadow-sm"
          nodeColor={(n) => {
            const dataNode = doc.nodes[n.id];
            return dataNode?.color || '#3b82f6';
          }}
        />
      </ReactFlow>

      {/* Floating Canvas Quick Tips */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 shadow-sm pointer-events-none">
        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded font-semibold text-slate-700 dark:text-zinc-200">Tab</kbd> Child</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded font-semibold text-slate-700 dark:text-zinc-200">Enter</kbd> Sibling</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded font-semibold text-slate-700 dark:text-zinc-200">Space</kbd> Check</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded font-semibold text-slate-700 dark:text-zinc-200">Del</kbd> Remove</span>
      </div>
    </div>
  );
};

export const MindMapCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <InnerCanvas />
    </ReactFlowProvider>
  );
};
