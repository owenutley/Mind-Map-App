import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { MindMapNode, NodeStatus } from '../../types/mindmap';
import { useGraphStore } from '../../store/graphStore';
import { Filter, Layers } from 'lucide-react';

export const KanbanBoard: React.FC = () => {
  const { document: doc, setNodeStatus, addNode, hideCompleted } = useGraphStore();
  const [activeDragNode, setActiveDragNode] = useState<MindMapNode | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    })
  );

  // Filter nodes based on selected level and hideCompleted setting
  const filteredNodes = useMemo(() => {
    let all = Object.values(doc.nodes);
    if (hideCompleted) {
      all = all.filter(n => !n.isCompleted || n.id === doc.rootNodeId);
    }
    if (levelFilter === 'all') return all;
    const targetLevel = parseInt(levelFilter, 10);
    return all.filter(n => n.level === targetLevel);
  }, [doc.nodes, levelFilter, hideCompleted]);

  // Group into the 3 status columns
  const todoNodes = useMemo(
    () => filteredNodes.filter(n => n.status === 'todo'),
    [filteredNodes]
  );
  const inProgressNodes = useMemo(
    () => filteredNodes.filter(n => n.status === 'in_progress'),
    [filteredNodes]
  );
  const completedNodes = useMemo(
    () => filteredNodes.filter(n => n.status === 'completed'),
    [filteredNodes]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const node = doc.nodes[active.id as string];
    if (node) {
      setActiveDragNode(node);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragNode(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped directly onto a column container
    if (overId === 'todo' || overId === 'in_progress' || overId === 'completed') {
      setNodeStatus(activeId, overId as NodeStatus);
      return;
    }

    // Dropped onto another card, inherit that card's status
    const targetNode = doc.nodes[overId];
    if (targetNode && targetNode.status) {
      setNodeStatus(activeId, targetNode.status);
    }
  };

  const handleQuickAdd = (status: NodeStatus) => {
    const newId = addNode(doc.rootNodeId, `New ${status.replace('_', ' ')} item`);
    setNodeStatus(newId, status);
  };

  // Get distinct levels for filter
  const availableLevels = useMemo(() => {
    const levels = new Set<number>();
    Object.values(doc.nodes).forEach(n => levels.add(n.level));
    return Array.from(levels).sort((a, b) => a - b);
  }, [doc.nodes]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#070b12] p-6 overflow-hidden">
      {/* Board Top Filter Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            Hierarchy-Preserving Kanban
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cards track workflow status while keeping their exact level and parent relationships intact.
          </p>
        </div>

        {/* Level Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Filter Level:</span>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-xs bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Levels ({Object.keys(doc.nodes).length})</option>
            {availableLevels.map(lvl => (
              <option key={lvl} value={lvl}>
                Level {lvl} ({Object.values(doc.nodes).filter(n => n.level === lvl).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Columns Container */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-5 overflow-x-auto pb-4">
          <KanbanColumn
            id="todo"
            title="To Do"
            count={todoNodes.length}
            colorClass="bg-amber-400"
            badgeBg="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
            nodes={todoNodes}
            onQuickAdd={handleQuickAdd}
          />
          <KanbanColumn
            id="in_progress"
            title="In Progress"
            count={inProgressNodes.length}
            colorClass="bg-blue-500"
            badgeBg="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
            nodes={inProgressNodes}
            onQuickAdd={handleQuickAdd}
          />
          <KanbanColumn
            id="completed"
            title="Completed"
            count={completedNodes.length}
            colorClass="bg-emerald-500"
            badgeBg="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            nodes={completedNodes}
            onQuickAdd={handleQuickAdd}
          />
        </div>

        <DragOverlay>
          {activeDragNode ? <KanbanCard node={activeDragNode} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
