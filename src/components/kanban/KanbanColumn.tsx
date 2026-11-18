import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { MindMapNode, NodeStatus } from '../../types/mindmap';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  id: NodeStatus;
  title: string;
  count: number;
  colorClass: string;
  badgeBg: string;
  nodes: MindMapNode[];
  onQuickAdd: (status: NodeStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  count,
  colorClass,
  badgeBg,
  nodes,
  onQuickAdd
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-w-[300px] max-w-[420px] rounded-2xl bg-slate-100/70 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 p-3.5 transition-colors duration-150 ${
        isOver ? 'ring-2 ring-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
            {title}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeBg}`}>
            {count}
          </span>
        </div>

        <button
          onClick={() => onQuickAdd(id)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 transition"
          title={`Add item to ${title}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Scrollable Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[160px]">
        <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
          {nodes.map(node => (
            <KanbanCard key={node.id} node={node} />
          ))}
        </SortableContext>

        {nodes.length === 0 && (
          <div className="h-32 border-2 border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl flex items-center justify-center text-xs text-slate-400 dark:text-zinc-600">
            Drop thoughts here
          </div>
        )}
      </div>
    </div>
  );
};
