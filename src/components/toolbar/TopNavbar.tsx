import React, { useState } from 'react';
import {
  FolderOpen,
  Network,
  Kanban,
  ListTree,
  Presentation,
  Undo2,
  Redo2,
  Sun,
  Moon,
  Download,
  Upload,
  Check,
  Loader2,
  Eye,
  EyeOff,
  FolderMinus,
  FolderPlus,
  PanelRight
} from 'lucide-react';
import { useGraphStore, ActiveView } from '../../store/graphStore';
import { useThemeStore } from '../../store/themeStore';

interface TopNavbarProps {
  onOpenVault: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenVault }) => {
  const {
    document: doc,
    activeView,
    setActiveView,
    renameDocument,
    isSaving,
    lastSavedAt,
    undo,
    redo,
    canUndo,
    canRedo,
    loadDocument,
    hideCompleted,
    toggleHideCompleted,
    collapseAllToL2,
    expandAll,
    isInspectorOpen,
    setInspectorOpen
  } = useGraphStore();

  const { effectiveTheme, toggleTheme } = useThemeStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(doc.title);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleText.trim() && titleText !== doc.title) {
      renameDocument(titleText.trim());
    } else {
      setTitleText(doc.title);
    }
  };

  const handleExport = async (format: 'markdown' | 'json') => {
    if (window.vaultAPI) {
      await window.vaultAPI.exportMapFile(doc, format);
    } else {
      // Browser fallback download
      const payload = format === 'markdown' 
        ? `# ${doc.title}\n\n` + Object.values(doc.nodes).map(n => `- [${n.isCompleted ? 'x' : ' '}] ${n.title}`).join('\n')
        : JSON.stringify(doc, null, 2);
      
      const blob = new Blob([payload], { type: format === 'markdown' ? 'text/markdown' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title}.${format === 'markdown' ? 'md' : 'mindmap'}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = async () => {
    if (window.vaultAPI) {
      const imported = await window.vaultAPI.importMapFile();
      if (imported && imported.nodes) {
        loadDocument(imported);
      }
    }
  };

  const views: { id: ActiveView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'canvas', label: 'Canvas', icon: Network },
    { id: 'kanban', label: 'Kanban', icon: Kanban },
    { id: 'outline', label: 'Outline', icon: ListTree },
    { id: 'presentation', label: 'Present', icon: Presentation }
  ];

  return (
    <header className="h-14 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-4 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Left: Vault & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenVault}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition shadow-xs"
          title="Open MindMap Vault"
        >
          <FolderOpen className="w-4 h-4 text-blue-500" />
          <span>Vault</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

        {/* Editable Title */}
        {isEditingTitle ? (
          <input
            type="text"
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') setIsEditingTitle(false);
            }}
            autoFocus
            className="text-sm font-bold bg-transparent border-b border-blue-500 outline-none text-slate-900 dark:text-zinc-100 px-1"
          />
        ) : (
          <h1
            onClick={() => {
              setTitleText(doc.title);
              setIsEditingTitle(true);
            }}
            className="text-sm font-bold text-slate-900 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 px-2 py-1 rounded-md cursor-pointer transition truncate max-w-[220px]"
            title="Click to rename"
          >
            {doc.title}
          </h1>
        )}

        {/* Autosave status pill */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 dark:text-zinc-500">
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span>{lastSavedAt ? `Saved ${lastSavedAt}` : 'Saved'}</span>
            </>
          )}
        </div>
      </div>

      {/* Center: View Switcher */}
      <div className="flex items-center bg-slate-100 dark:bg-zinc-800/90 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-800">
        {views.map(v => {
          const Icon = v.icon;
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Actions, Theme, Undo/Redo */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center mr-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

        {/* Toggle Hide Completed Checkboxes / Items */}
        <button
          onClick={toggleHideCompleted}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
            hideCompleted
              ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-semibold'
              : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
          }`}
          title={hideCompleted ? 'Show completed thoughts' : 'Hide completed thoughts'}
        >
          {hideCompleted ? <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
          <span className="hidden sm:inline">
            {hideCompleted ? 'Done Hidden' : 'Hide Done'}
          </span>
        </button>

        {/* Global Depth / Folding Controls */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800">
          <button
            onClick={collapseAllToL2}
            className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition"
            title="Collapse to Level 2 (Default Clean View)"
          >
            <FolderMinus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={expandAll}
            className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition"
            title="Expand All Branches"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

        {/* Import & Export */}
        <button
          onClick={handleImport}
          className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          title="Import External File"
        >
          <Upload className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleExport('markdown')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-300 transition"
          title="Export to Markdown Outline"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Export</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          title={`Switch to ${effectiveTheme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {effectiveTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />

        {/* Details & Notes Inspector Toggle */}
        <button
          onClick={() => setInspectorOpen(!isInspectorOpen)}
          className={`p-1.5 rounded-lg border transition ${
            isInspectorOpen
              ? 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
              : 'border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
          title="Toggle Details & Notes Inspector (Ctrl+I)"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
