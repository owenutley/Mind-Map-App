import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Check, Plus, Focus, Trash2, CheckCircle2, Magnet, Palette, FileText } from 'lucide-react';
import { MindMapNode } from '../../types/mindmap';
import { useGraphStore, BRANCH_PALETTE } from '../../store/graphStore';

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
    updateNodeColor,
    addNode,
    deleteNode,
    toggleCompletion,
    toggleCollapse,
    setActiveCenterId,
    activeCenterId,
    reconnectToParentClosest,
    setSelectedNodeId,
    document: doc
  } = useGraphStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [titleText, setTitleText] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleText(node.title);
  }, [node.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Click outside listener for color picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

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

  // Child completion progress
  const children = Object.values(doc.nodes).filter(n => n.parentId === id);
  const completedChildren = children.filter(n => n.isCompleted).length;
  const hasChildren = children.length > 0;
  const isCurrentCenter = activeCenterId === id;

  // Determine incoming target side
  let effectiveIncoming = incomingSide;
  if (node.targetHandle) {
    if (node.targetHandle.startsWith('top')) effectiveIncoming = Position.Top;
    else if (node.targetHandle.startsWith('bottom')) effectiveIncoming = Position.Bottom;
    else if (node.targetHandle.startsWith('left')) effectiveIncoming = Position.Left;
    else if (node.targetHandle.startsWith('right')) effectiveIncoming = Position.Right;
  }

  const isLeftIncoming = effectiveIncoming === Position.Left;
  const isRightIncoming = effectiveIncoming === Position.Right;
  const isTopIncoming = effectiveIncoming === Position.Top;
  const isBottomIncoming = effectiveIncoming === Position.Bottom;

  return (
    <div
      className={`relative group rounded-xl transition-all duration-200 border px-3.5 py-2.5 w-[230px] shadow-sm select-none ${
        selected
          ? 'ring-2 ring-blue-500 shadow-md ring-offset-2 dark:ring-offset-zinc-950'
          : isRoot
          ? 'shadow-md dark:shadow-[0_0_20px_rgba(255,255,255,0.12)] hover:border-slate-300 dark:hover:border-zinc-700'
          : 'hover:border-slate-300 dark:hover:border-zinc-700'
      } ${
        node.isCompleted
          ? 'bg-slate-50/75 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800/80 opacity-70'
          : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 text-slate-800 dark:text-zinc-100'
      }`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: isRoot ? '#64748b' : (node.color || '#3b82f6')
      }}
    >
      {/* ======================================================== */}
      {/* 4-SIDED CONNECTION HANDLES WITH PARENT EXCLUSION RULE */}
      {/* ======================================================== */}

      {/* TOP HANDLE */}
      {isTopIncoming ? (
        <Handle
          type="target"
          id="top-target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !-top-1.5 !bg-amber-500 !border-2 !border-white dark:!border-zinc-900"
          title="Incoming parent connection (Top)"
        />
      ) : (
        <>
          <Handle
            type="source"
            id="top-source"
            position={Position.Top}
            className="!w-2.5 !h-2.5 !-top-1.5 !border-2 !border-white dark:!border-zinc-900 opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: node.color || '#3b82f6' }}
            title="Branch from Top"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              addNode(id, 'New Thought', 'top');
            }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 z-10 shadow-xs text-[10px]"
            style={{ backgroundColor: node.color || '#3b82f6' }}
            title="Add Branch (Top)"
          >
            +
          </button>
        </>
      )}

      {/* BOTTOM HANDLE */}
      {isBottomIncoming ? (
        <Handle
          type="target"
          id="bottom-target"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !-bottom-1.5 !bg-amber-500 !border-2 !border-white dark:!border-zinc-900"
          title="Incoming parent connection (Bottom)"
        />
      ) : (
        <>
          <Handle
            type="source"
            id="bottom-source"
            position={Position.Bottom}
            className="!w-2.5 !h-2.5 !-bottom-1.5 !border-2 !border-white dark:!border-zinc-900 opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: node.color || '#3b82f6' }}
            title="Branch from Bottom"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              addNode(id, 'New Thought', 'bottom');
            }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 z-10 shadow-xs text-[10px]"
            style={{ backgroundColor: node.color || '#3b82f6' }}
            title="Add Branch (Bottom)"
          >
            +
          </button>
        </>
      )}

      {/* LEFT HANDLE */}
      {isLeftIncoming ? (
        <Handle
          type="target"
          id="left-target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !-left-1.5 !bg-amber-500 !border-2 !border-white dark:!border-zinc-900"
          title="Incoming parent connection (Left)"
        />
      ) : (
        <>
          <Handle
            type="source"
            id="left-source"
            position={Position.Left}
            className="!w-2.5 !h-2.5 !-left-1.5 !border-2 !border-white dark:!border-zinc-900 opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: node.color || '#3b82f6' }}
            title="Branch from Left"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              addNode(id, 'New Thought', 'left');
            }}
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 z-10 shadow-xs text-[10px]"
            style={{ backgroundColor: node.color || '#3b82f6' }}
            title="Add Branch (Left)"
          >
            +
          </button>
        </>
      )}

      {/* RIGHT HANDLE */}
      {isRightIncoming ? (
        <Handle
          type="target"
          id="right-target"
          position={Position.Right}
          className="!w-2.5 !h-2.5 !-right-1.5 !bg-amber-500 !border-2 !border-white dark:!border-zinc-900"
          title="Incoming parent connection (Right)"
        />
      ) : (
        <>
          <Handle
            type="source"
            id="right-source"
            position={Position.Right}
            className="!w-2.5 !h-2.5 !-right-1.5 !border-2 !border-white dark:!border-zinc-900 opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: node.color || '#3b82f6' }}
            title="Branch from Right"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              addNode(id, 'New Thought', 'right');
            }}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 z-10 shadow-xs text-[10px]"
            style={{ backgroundColor: node.color || '#3b82f6' }}
            title="Add Branch (Right)"
          >
            +
          </button>
        </>
      )}

      {/* ======================================================== */}
      {/* COLOR PICKER POPOVER */}
      {/* ======================================================== */}
      {showColorPicker && (
        <div
          ref={colorPickerRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-9 left-2 z-50 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 px-0.5 uppercase tracking-wider">
            Branch Color
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {BRANCH_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => {
                  updateNodeColor(id, color, true);
                  setShowColorPicker(false);
                }}
                className={`w-5 h-5 rounded-full transition hover:scale-125 border-2 ${
                  node.color === color ? 'border-slate-800 dark:border-white scale-110 shadow-xs' : 'border-white dark:border-zinc-900'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CARD CONTENT */}
      {/* ======================================================== */}

      {/* Top Header: Level Badge, Color Dot, Progress, Actions */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded ${
              isRoot
                ? 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-bold'
                : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {isRoot ? 'Center' : `L${node.level}`}
          </span>

          {/* Color Indicator Dot */}
          {!isRoot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="w-2.5 h-2.5 rounded-full hover:scale-125 transition shrink-0 shadow-xs border border-white dark:border-zinc-900"
              style={{ backgroundColor: node.color || '#3b82f6' }}
              title="Click to change branch color"
            />
          )}

          {hasChildren && (
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-0.5 font-medium">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
              {completedChildren}/{children.length}
            </span>
          )}

          {/* Notes indicator badge if notes exist */}
          {Boolean(node.notes?.trim()) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodeId(id, true);
              }}
              className="p-0.5 rounded text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-800 transition"
              title="Has notes & description (click to open inspector)"
            >
              <FileText className="w-3 h-3" />
            </button>
          )}

          {/* Progressive Disclosure: Fold / Unfold Badge */}
          {directChildrenCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse(id);
              }}
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold transition flex items-center gap-0.5 cursor-pointer shadow-2xs ${
                isCollapsed
                  ? 'bg-blue-600 hover:bg-blue-500 text-white animate-pulse'
                  : 'bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
              }`}
              title={isCollapsed ? `Expand ${directChildrenCount} hidden sub-thoughts (L${node.level + 1}+)` : 'Collapse sub-thoughts'}
            >
              {isCollapsed ? `+${directChildrenCount}` : '−'}
            </button>
          )}
        </div>

        {/* Hover Quick Action Buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Inspect Details & Markdown Notes */}
          <button
            title="Inspect Details & Notes"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNodeId(id, true);
            }}
            className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* Color Palette Picker Button */}
          {!isRoot && (
            <button
              title="Change Branch Color"
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-1 rounded text-slate-400 hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reconnect to Closest Points on Parent */}
          {!isRoot && (
            <button
              title="Reconnect to Parent (connect closest points)"
              onClick={(e) => {
                e.stopPropagation();
                reconnectToParentClosest(id);
              }}
              className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              <Magnet className="w-3.5 h-3.5" />
            </button>
          )}

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
            title="Branch Child Thought"
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

      {/* Main Body: Completion Checkbox & Title */}
      <div className="flex items-start gap-2.5">
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
            className={`w-full text-xs font-semibold bg-transparent border-b border-blue-500 outline-none px-0 py-0 ${
              isRoot ? 'text-slate-900 dark:text-zinc-50 font-bold' : 'text-slate-900 dark:text-zinc-100'
            }`}
          />
        ) : (
          <div
            onDoubleClick={() => setIsEditing(true)}
            className={`text-xs leading-snug cursor-text font-semibold select-text break-words w-full ${
              node.isCompleted
                ? 'line-through text-slate-400 dark:text-zinc-500'
                : isRoot
                ? 'text-slate-900 dark:text-zinc-50 font-bold'
                : 'text-slate-800 dark:text-zinc-100'
            }`}
            title="Double click to edit"
          >
            {node.title}
          </div>
        )}
      </div>

      {/* Notes preview if available */}
      {Boolean(node.notes?.trim()) && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNodeId(id, true);
          }}
          className={`mt-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center gap-1.5 text-[11px] cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition group/note ${
            isRoot ? 'text-slate-500 dark:text-zinc-400' : 'text-slate-400 dark:text-zinc-500'
          }`}
          title="Click to view/edit description in Inspector"
        >
          <FileText className="w-3 h-3 shrink-0 opacity-60 group-hover/note:opacity-100 group-hover/note:text-blue-500" />
          <span className="line-clamp-1 italic truncate">
            {node.notes}
          </span>
        </div>
      )}
    </div>
  );
};
