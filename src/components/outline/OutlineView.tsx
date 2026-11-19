import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  Trash2,
  ListTree,
  FileText
} from 'lucide-react';
import { useGraphStore } from '../../store/graphStore';
import { MindMapNode } from '../../types/mindmap';

interface OutlineItemProps {
  node: MindMapNode;
  depth: number;
}

const OutlineItem: React.FC<OutlineItemProps> = ({ node, depth }) => {
  const {
    document: doc,
    updateNode,
    toggleCompletion,
    addNode,
    deleteNode,
    setSelectedNodeId,
    setActiveView,
    hideCompleted
  } = useGraphStore();

  const [isExpanded, setIsExpanded] = useState(
    node.isCollapsed !== undefined ? !node.isCollapsed : node.level < 2
  );
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(node.title);

  if (hideCompleted && node.isCompleted && node.id !== doc.rootNodeId) {
    return null;
  }

  const children = Object.values(doc.nodes)
    .filter(n => n.parentId === node.id && (!hideCompleted || !n.isCompleted))
    .sort((a, b) => a.order - b.order);

  const hasChildren = children.length > 0;

  const handleBlur = () => {
    setIsEditing(false);
    if (text.trim() && text !== node.title) {
      updateNode(node.id, { title: text.trim() });
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition ${
            !hasChildren ? 'invisible' : ''
          }`}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Completion Checkbox */}
        <button
          onClick={() => toggleCompletion(node.id)}
          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
            node.isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 dark:border-zinc-700 hover:border-emerald-500 bg-white dark:bg-zinc-950'
          }`}
        >
          {node.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        {/* Level Tag */}
        <span
          className="text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase shrink-0"
          style={{
            backgroundColor: `${node.color || '#3b82f6'}15`,
            color: node.color || '#3b82f6'
          }}
        >
          {node.level === 0 ? 'Center' : `L${node.level}`}
        </span>

        {/* Title Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBlur();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              autoFocus
              className="w-full text-sm font-medium bg-transparent border-b border-blue-500 outline-none text-slate-900 dark:text-zinc-100"
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditing(true)}
              className={`text-sm cursor-text ${
                node.isCompleted
                  ? 'line-through text-slate-400 dark:text-zinc-500'
                  : 'text-slate-800 dark:text-zinc-200'
              }`}
            >
              {node.title}
            </span>
          )}
        </div>

        {/* Hover Quick Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            title="Inspect Details & Notes"
            onClick={() => setSelectedNodeId(node.id, true)}
            className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-zinc-800"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <button
            title="Add Child Sub-branch"
            onClick={() => {
              addNode(node.id, 'New Idea');
              setIsExpanded(true);
            }}
            className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            title="View on Canvas"
            onClick={() => {
              setSelectedNodeId(node.id);
              setActiveView('canvas');
            }}
            className="px-2 py-0.5 text-[10px] rounded text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-zinc-800"
          >
            Map
          </button>

          {node.level !== 0 && (
            <button
              title="Delete Thought"
              onClick={() => deleteNode(node.id)}
              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-zinc-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Render Subtree Children */}
      {isExpanded && hasChildren && (
        <div className="flex flex-col">
          {children.map(child => (
            <OutlineItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const OutlineView: React.FC = () => {
  const { document: doc } = useGraphStore();
  const rootNode = doc.nodes[doc.rootNodeId];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-zinc-950 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="pb-4 border-b border-slate-200 dark:border-zinc-800 mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <ListTree className="w-6 h-6 text-blue-500" />
            Hierarchical Outline
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Structured document view of your mind map thoughts with real-time bidirectional syncing.
          </p>
        </div>

        {/* Tree List */}
        <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-4 shadow-sm">
          {rootNode ? (
            <OutlineItem node={rootNode} depth={0} />
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">No root topic found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
