import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Check, Plus, FileText, Edit2 } from 'lucide-react';
import { MindMapNode } from '../../types/mindmap';
import { useGraphStore } from '../../store/graphStore';

interface TextTileNodeProps {
  id: string;
  data: {
    node: MindMapNode;
    isRoot: boolean;
    direction?: 'right' | 'left' | 'top' | 'bottom' | 'root';
    incomingSide?: Position | null;
    isCollapsed?: boolean;
    directChildrenCount?: number;
  };
  selected?: boolean;
}

export const TextTileNode: React.FC<TextTileNodeProps> = ({ id, data, selected }) => {
  const { node, isRoot, incomingSide = null, isCollapsed = false, directChildrenCount = 0 } = data;
  const {
    updateNode,
    addNode,
    toggleCompletion,
    toggleCollapse,
    setSelectedNodeId
  } = useGraphStore();

  const [isEditing, setIsEditing] = useState(false);
  const [titleText, setTitleText] = useState(node.title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setTitleText(node.title);
    }
  }, [node.title, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = titleText.trim();
    if (trimmed && trimmed !== node.title) {
      updateNode(id, { title: trimmed });
    } else {
      setTitleText(node.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setTitleText(node.title);
      setIsEditing(false);
    }
  };

  const nodeColor = isRoot ? '#6366f1' : (node.color || '#3b82f6');
  const hasNotes = Boolean(node.notes?.trim());

  // Determine incoming target side
  let effectiveIncoming = incomingSide;
  if (node.targetHandle) {
    if (node.targetHandle.startsWith('top')) effectiveIncoming = Position.Top;
    else if (node.targetHandle.startsWith('bottom')) effectiveIncoming = Position.Bottom;
    else if (node.targetHandle.startsWith('left')) effectiveIncoming = Position.Left;
    else if (node.targetHandle.startsWith('right')) effectiveIncoming = Position.Right;
  }

  const isLeftIncoming = !isRoot && effectiveIncoming === Position.Left;
  const isRightIncoming = !isRoot && effectiveIncoming === Position.Right;
  const isTopIncoming = !isRoot && effectiveIncoming === Position.Top;
  const isBottomIncoming = !isRoot && effectiveIncoming === Position.Bottom;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNodeId(id, true);
      }}
      className={`relative group flex items-start gap-2 rounded-[20px] px-3.5 py-2 transition-all duration-150 select-none cursor-pointer border shadow-xs ${
        isRoot
          ? 'w-[210px] text-sm font-semibold shadow-md dark:shadow-[0_0_20px_rgba(99,102,241,0.25)]'
          : 'w-[180px] text-xs font-medium'
      } ${
        selected
          ? 'ring-2 ring-blue-500 shadow-md ring-offset-2 dark:ring-offset-[#070b12]'
          : 'hover:border-slate-300 dark:hover:border-slate-700'
      } ${
        node.isCompleted
          ? 'bg-slate-50 dark:bg-[#0a101d] border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
          : isRoot
          ? 'bg-white dark:bg-[#111c34] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50'
          : 'bg-white dark:bg-[#0f172a] border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100'
      }`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: nodeColor
      }}
    >
      {/* ======================================================== */}
      {/* 4-SIDED CONNECTION HANDLES & QUICK ADD BRANCH BUTTONS    */}
      {/* ======================================================== */}

      {/* TOP */}
      {isTopIncoming ? (
        <Handle
          type="target"
          id="top-target"
          position={Position.Top}
          className="!w-2 !h-2 !-top-1 !bg-amber-500 !border-2 !border-white dark:!border-[#0f172a] !transition-transform group-hover:!scale-125"
          title="Incoming parent connection (Top)"
        />
      ) : (
        <>
          <Handle
            type="source"
            id="top-source"
            position={Position.Top}
            className="!w-2 !h-2 !-top-1 !border-2 !border-white dark:!border-[#0f172a] opacity-0 group-hover:opacity-100 !transition-all hover:!scale-125"
            style={{ backgroundColor: nodeColor }}
            title="Branch Top"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              addNode(id, 'New Thought', 'top');
            }}
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-125 z-20 shadow-xs text-[10px] font-bold"
            style={{ backgroundColor: nodeColor }}
            title="Add branch (Top)"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </>
      )}

      {/* BOTTOM */}
      {isBottomIncoming ? (
        <Handle
          type="target"
          id="bottom-target"
          position={Position.Bottom}
          className="!w-2 !h-2 !-bottom-1 !bg-amber-500 !border-2 !border-white dark:!border-[#0f172a] !transition-transform group-hover:!scale-125"
          title="Incoming parent connection (Bottom)"
        />
      ) : (
        <>
          <Handle
            type="source"
            id="bottom-source"
            position={Position.Bottom}
            className="!w-2 !h-2 !-bottom-1 !border-2 !border-white dark:!border-[#0f172a] opacity-0 group-hover:opacity-100 !transition-all hover:!scale-125"
            style={{ backgroundColor: nodeColor }}
            title="Branch Bottom"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              addNode(id, 'New Thought', 'bottom');
            }}
            className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-125 z-20 shadow-xs text-[10px] font-bold"
            style={{ backgroundColor: nodeColor }}
            title="Add branch (Bottom)"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </>
      )}

      {/* LEFT */}
      {isLeftIncoming ? (
        <Handle
          type="target"
          id="left-target"
          position={Position.Left}
          className="!w-2 !h-2 !-left-1 !bg-amber-500 !border-2 !border-white dark:!border-[#0f172a] !transition-transform group-hover:!scale-125"
          title="Incoming parent connection (Left)"
        />
      ) : (
        <>
          <Handle
            type="source"
            id="left-source"
            position={Position.Left}
            className="!w-2 !h-2 !-left-1 !border-2 !border-white dark:!border-[#0f172a] opacity-0 group-hover:opacity-100 !transition-all hover:!scale-125"
            style={{ backgroundColor: nodeColor }}
            title="Branch Left"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              addNode(id, 'New Thought', 'left');
            }}
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-125 z-20 shadow-xs text-[10px] font-bold"
            style={{ backgroundColor: nodeColor }}
            title="Add branch (Left)"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </>
      )}

      {/* RIGHT */}
      {isRightIncoming ? (
        <Handle
          type="target"
          id="right-target"
          position={Position.Right}
          className="!w-2 !h-2 !-right-1 !bg-amber-500 !border-2 !border-white dark:!border-[#0f172a] !transition-transform group-hover:!scale-125"
          title="Incoming parent connection (Right)"
        />
      ) : (
        <>
          <Handle
            type="source"
            id="right-source"
            position={Position.Right}
            className="!w-2 !h-2 !-right-1 !border-2 !border-white dark:!border-[#0f172a] opacity-0 group-hover:opacity-100 !transition-all hover:!scale-125"
            style={{ backgroundColor: nodeColor }}
            title="Branch Right"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              addNode(id, 'New Thought', 'right');
            }}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-125 z-20 shadow-xs text-[10px] font-bold"
            style={{ backgroundColor: nodeColor }}
            title="Add branch (Right)"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </>
      )}

      {/* Color indicator dot */}
      <span
        className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 shadow-xs border border-white/60 dark:border-black/30"
        style={{ backgroundColor: nodeColor }}
      />

      {/* Completion checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleCompletion(id);
        }}
        className={`mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors border ${
          node.isCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 bg-white/50 dark:bg-slate-900/50'
        }`}
        title={node.isCompleted ? 'Mark incomplete' : 'Mark completed'}
      >
        {node.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
      </button>

      {/* Node Title / Inline Editor (extends down with text) */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            rows={1}
            value={titleText}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              setTitleText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`nodrag nopan nowheel w-full bg-transparent border-b border-blue-500 outline-none resize-none overflow-hidden px-0 py-0 leading-snug cursor-text select-text ${
              isRoot ? 'font-bold text-sm text-slate-900 dark:text-slate-50' : 'text-xs text-slate-900 dark:text-slate-100'
            }`}
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="group/title flex items-start justify-between gap-1 cursor-text"
            title="Double-click to edit title"
          >
            <span
              className={`block break-words whitespace-normal leading-snug ${
                node.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
              }`}
            >
              {node.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="opacity-0 group-hover/title:opacity-100 p-0.5 rounded text-slate-400 hover:text-blue-500 transition shrink-0"
              title="Edit Title"
            >
              <Edit2 className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Trailing items: Notes indicator & Collapse badge */}
      <div className="shrink-0 flex items-center gap-1 mt-0.5">
        {hasNotes && (
          <span title="Has notes (inspect in sidebar)" className="flex items-center">
            <FileText className="w-3 h-3 text-blue-500/80 dark:text-blue-400/80" />
          </span>
        )}

        {directChildrenCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(id);
            }}
            className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 transition cursor-pointer ${
              isCollapsed
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}
            title={isCollapsed ? `Expand ${directChildrenCount} sub-thoughts` : 'Collapse sub-thoughts'}
          >
            {isCollapsed ? `+${directChildrenCount}` : '−'}
          </button>
        )}
      </div>
    </div>
  );
};
