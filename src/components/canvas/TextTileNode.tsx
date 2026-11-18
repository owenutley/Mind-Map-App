import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Check, Plus, Focus, Trash2, CheckCircle2 } from 'lucide-react';
import { MindMapNode } from '../../types/mindmap';
import { useGraphStore } from '../../store/graphStore';

interface TextTileNodeProps {
  id: string;
  data: {
    node: MindMapNode;
    isRoot: boolean;
  };
  selected?: boolean;
}

export const TextTileNode: React.FC<TextTileNodeProps> = ({ id, data, selected }) => {
  const { node, isRoot } = data;
  const {
    updateNode,
    addNode,
    deleteNode,
    toggleCompletion,
    setActiveCenterId,
    activeCenterId,
    document: doc
  } = useGraphStore();

  const [isEditing, setIsEditing] = useState(false);
  const [titleText, setTitleText] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleText(node.title);
  }, [node.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (titleText.trim() && titleText !== node.title) {
      updateNode(id, { title: titleText.trim() });
    } else {
      setTitleText(node.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setTitleText(node.title);
      setIsEditing(false);
    }
  };

  // Child completion progress calculation
  const children = Object.values(doc.nodes).filter(n => n.parentId === id);
  const completedChildren = children.filter(n => n.isCompleted).length;
  const hasChildren = children.length > 0;

  const isCurrentCenter = activeCenterId === id;

  return (
    <div
      className={`relative group rounded-xl transition-all duration-200 border px-3.5 py-2.5 min-w-[200px] max-w-[280px] shadow-sm select-none ${
        selected
          ? 'ring-2 ring-blue-500 shadow-md ring-offset-2 dark:ring-offset-zinc-950'
          : 'hover:border-slate-300 dark:hover:border-zinc-700'
      } ${
        node.isCompleted
          ? 'bg-slate-50/70 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800/80 opacity-70'
          : isRoot
          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 shadow-blue-500/5'
          : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800'
      }`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: node.color || (isRoot ? '#3b82f6' : '#64748b')
      }}
    >
      {/* React Flow Left Handle (Target) */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !-left-1.5 !bg-slate-400 dark:!bg-zinc-500 !border-2 !border-white dark:!border-zinc-900"
        />
      )}

      {/* Top Header: Level Badge, Child Progress, Action Icons */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded ${
              isRoot
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {isRoot ? 'Center' : `L${node.level}`}
          </span>

          {hasChildren && (
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-0.5 font-medium">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
              {completedChildren}/{children.length}
            </span>
          )}
        </div>

        {/* Floating Quick Action Buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            title="Focus / Hoist as Center"
            onClick={(e) => {
              e.stopPropagation();
              setActiveCenterId(isCurrentCenter ? doc.rootNodeId : id);
            }}
            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition ${
              isCurrentCenter ? 'text-blue-500' : 'text-slate-400 dark:text-zinc-500'
            }`}
          >
            <Focus className="w-3.5 h-3.5" />
          </button>
          
          <button
            title="Add Branch (Tab)"
            onClick={(e) => {
              e.stopPropagation();
              addNode(id, 'New Idea');
            }}
            className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {!isRoot && (
            <button
              title="Delete Thought"
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(id);
              }}
              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Body: Checkbox & Editable Title */}
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCompletion(id);
          }}
          className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors border ${
            node.isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 dark:border-zinc-700 hover:border-emerald-500 bg-white dark:bg-zinc-950'
          }`}
          title={node.isCompleted ? 'Mark incomplete' : 'Mark completed'}
        >
          {node.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full text-sm font-medium bg-transparent border-b border-blue-500 outline-none px-0 py-0 text-slate-900 dark:text-zinc-100"
          />
        ) : (
          <div
            onDoubleClick={() => setIsEditing(true)}
            className={`text-sm leading-snug cursor-text font-medium select-text break-words w-full ${
              node.isCompleted
                ? 'line-through text-slate-400 dark:text-zinc-500'
                : 'text-slate-800 dark:text-zinc-100'
            }`}
            title="Double click to edit"
          >
            {node.title}
          </div>
        )}
      </div>

      {/* Optional Note excerpt if exists */}
      {node.notes && (
        <p className="mt-1.5 text-xs text-slate-400 dark:text-zinc-500 line-clamp-1 italic">
          {node.notes}
        </p>
      )}

      {/* React Flow Right Handle (Source) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !-right-1.5 !bg-blue-500 !border-2 !border-white dark:!border-zinc-900"
      />
    </div>
  );
};
