import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
  CheckCircle2,
  X
} from 'lucide-react';
import { useGraphStore } from '../../store/graphStore';
import { getAncestorBreadcrumbs } from '../../utils/layout';

export const PresentationView: React.FC = () => {
  const { document: doc, setActiveView, toggleCompletion, hideCompleted } = useGraphStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Flatten nodes hierarchically for natural presentation order
  const orderedNodes = React.useMemo(() => {
    const list: typeof doc.nodes[string][] = [];
    const walk = (id: string) => {
      const node = doc.nodes[id];
      if (!node) return;
      if (!hideCompleted || !node.isCompleted || id === doc.rootNodeId) {
        list.push(node);
      }
      const children = Object.values(doc.nodes)
        .filter(n => n.parentId === id && (!hideCompleted || !n.isCompleted))
        .sort((a, b) => a.order - b.order);
      children.forEach(c => walk(c.id));
    };
    walk(doc.rootNodeId);
    return list;
  }, [doc.nodes, doc.rootNodeId, hideCompleted]);

  const currentNode = orderedNodes[currentIndex] || orderedNodes[0];

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < orderedNodes.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const toggleFs = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (!currentNode) {
    return <div className="p-8 text-center text-slate-400">No nodes to present.</div>;
  }

  const breadcrumbs = getAncestorBreadcrumbs(doc.nodes, currentNode.id);
  const children = Object.values(doc.nodes).filter(n => n.parentId === currentNode.id);

  return (
    <div className="relative flex-1 flex flex-col items-center justify-between h-full bg-slate-900 text-white p-8 overflow-hidden select-none">
      {/* Top Controls Bar */}
      <div className="w-full flex items-center justify-between max-w-5xl z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {currentNode.level === 0 ? 'Main Vision' : `Level ${currentNode.level}`}
          </span>
          {breadcrumbs.length > 0 && (
            <span className="text-xs text-zinc-400 truncate max-w-md">
              {breadcrumbs.join(' / ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFs}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setActiveView('canvas')}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-300 transition"
            title="Exit Presentation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Slide Card */}
      <div className="max-w-4xl w-full my-auto flex flex-col items-center text-center px-4">
        {/* Checkbox & Status */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => toggleCompletion(currentNode.id)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition border ${
              currentNode.isCompleted
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'border-zinc-700 hover:border-emerald-500 bg-zinc-800/80 text-transparent'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
          <span className="text-sm font-semibold tracking-wide uppercase text-zinc-400">
            {currentNode.isCompleted ? 'Completed' : currentNode.status.replace('_', ' ')}
          </span>
        </div>

        {/* Big Slide Title */}
        <h1
          className={`text-4xl md:text-5xl font-extrabold tracking-tight mb-6 max-w-3xl ${
            currentNode.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'
          }`}
          style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
        >
          {currentNode.title}
        </h1>

        {/* Notes if available */}
        {currentNode.notes && (
          <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed mb-8">
            {currentNode.notes}
          </p>
        )}

        {/* Direct Sub-branches preview */}
        {children.length > 0 && (
          <div className="mt-6 w-full max-w-2xl text-left bg-zinc-800/40 border border-zinc-800 rounded-2xl p-5 backdrop-blur">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              Sub-thoughts ({children.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {children.map(child => (
                <div
                  key={child.id}
                  className="flex items-center gap-2 text-sm text-zinc-300 p-2 rounded-lg bg-zinc-800/60"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: child.color || '#3b82f6' }}
                  />
                  <span className="truncate">{child.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="w-full max-w-md flex items-center justify-between z-10">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>

        <span className="text-xs text-zinc-400 font-medium">
          Slide {currentIndex + 1} of {orderedNodes.length}
        </span>

        <button
          onClick={handleNext}
          disabled={currentIndex === orderedNodes.length - 1}
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition shadow-lg shadow-blue-500/20"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
