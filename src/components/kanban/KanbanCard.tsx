import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, CheckCircle2, ChevronRight, GripVertical } from 'lucide-react';
import { MindMapNode } from '../../types/mindmap';
import { useGraphStore } from '../../store/graphStore';
import { getAncestorBreadcrumbs } from '../../utils/layout';

interface KanbanCardProps {
  node: MindMapNode;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ node }) => {
  const {
    document: doc,
    toggleCompletion,
    setSelectedNodeId,
    setActiveView
  } = useGraphStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: node.id,
    data: { node }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1
  };

  const breadcrumbs = getAncestorBreadcrumbs(doc.nodes, node.id);
  const children = Object.values(doc.nodes).filter(n => n.parentId === node.id);
  const completedChildren = children.filter(n => n.isCompleted).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border p-3 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm transition hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 ${
        node.isCompleted ? 'opacity-75' : ''
      }`}
    >
      {/* Top Header: Breadcrumbs & Drag Handle */}
      <div className="flex items-center justify-between gap-1 mb-1.5 text-[11px] text-slate-400 dark:text-zinc-500">
        <div className="flex items-center gap-1 overflow-hidden truncate">
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase shrink-0"
            style={{
              backgroundColor: `${node.color || '#3b82f6'}15`,
              color: node.color || '#3b82f6'
            }}
          >
            {node.level === 0 ? 'Center' : `L${node.level}`}
          </span>

          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 truncate text-[11px]">
              <span className="truncate max-w-[100px]">{breadcrumbs[breadcrumbs.length - 1]}</span>
              <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />
            </div>
          )}
        </div>

        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Title & Checkbox */}
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => toggleCompletion(node.id)}
          className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
            node.isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 dark:border-zinc-700 hover:border-emerald-500 bg-white dark:bg-zinc-950'
          }`}
        >
          {node.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        <div className="flex-1">
          <p
            onClick={() => {
              setSelectedNodeId(node.id);
            }}
            className={`text-sm font-medium leading-snug cursor-pointer ${
              node.isCompleted
                ? 'line-through text-slate-400 dark:text-zinc-500'
                : 'text-slate-800 dark:text-zinc-100'
            }`}
          >
            {node.title}
          </p>

          {node.notes && (
            <p
              onClick={() => setSelectedNodeId(node.id, true)}
              className="mt-1 text-xs text-slate-400 dark:text-zinc-500 line-clamp-2 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition"
              title="Click to view/edit notes in inspector"
            >
              {node.notes}
            </p>
          )}
        </div>
      </div>

      {/* Footer Info: Sub-branches count & Jump to Canvas */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
        {children.length > 0 ? (
          <span className="flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {completedChildren}/{children.length} sub-tasks
          </span>
        ) : (
          <span className="text-[10px] text-slate-300 dark:text-zinc-600">Leaf branch</span>
        )}

        <button
          onClick={() => {
            setSelectedNodeId(node.id);
            setActiveView('canvas');
          }}
          className="hover:text-blue-500 hover:underline text-[10px]"
        >
          Locate on map →
        </button>
      </div>
    </div>
  );
};
