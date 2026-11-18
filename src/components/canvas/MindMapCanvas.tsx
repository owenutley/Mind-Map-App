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
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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
    toggleCompletion
  } = useGraphStore();

  const effectiveTheme = useThemeStore(s => s.effectiveTheme);
  const { fitView } = useReactFlow();
  const initialFitDone = useRef(false);

  // Compute balanced multi-directional D3 tree layout
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    return computeMindMapLayout(doc, activeCenterId);
  }, [doc, activeCenterId]);

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

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
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
