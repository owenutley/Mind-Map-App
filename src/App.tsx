import React, { useState, useEffect } from 'react';
import { TopNavbar } from './components/toolbar/TopNavbar';
import { VaultSidebar } from './components/sidebar/VaultSidebar';
import { MindMapCanvas } from './components/canvas/MindMapCanvas';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { OutlineView } from './components/outline/OutlineView';
import { PresentationView } from './components/presentation/PresentationView';
import { NodeDetailsDrawer } from './components/inspector/NodeDetailsDrawer';
import { useGraphStore } from './store/graphStore';

export const App: React.FC = () => {
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const { activeView, undo, redo, saveCurrentDocument, isInspectorOpen, setInspectorOpen } = useGraphStore();

  // Global keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrentDocument();
      } else if (mod && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setInspectorOpen(!isInspectorOpen);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [undo, redo, saveCurrentDocument, isInspectorOpen, setInspectorOpen]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#070b12] text-slate-900 dark:text-slate-100 font-sans">
      <TopNavbar onOpenVault={() => setIsVaultOpen(true)} />

      <main className="flex-1 relative overflow-hidden">
        {activeView === 'canvas' && <MindMapCanvas />}
        {activeView === 'kanban' && <KanbanBoard />}
        {activeView === 'outline' && <OutlineView />}
        {activeView === 'presentation' && <PresentationView />}
      </main>

      <NodeDetailsDrawer />

      <VaultSidebar
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
      />
    </div>
  );
};

export default App;
