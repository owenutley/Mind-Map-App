import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  FileText,
  Search,
  RefreshCw,
  FolderSync
} from 'lucide-react';
import { useGraphStore } from '../../store/graphStore';
import { VaultFileSummary } from '../../types/mindmap';

interface VaultSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VaultSidebar: React.FC<VaultSidebarProps> = ({ isOpen, onClose }) => {
  const {
    document: currentDoc,
    loadDocument,
    newDocument,
    saveCurrentDocument
  } = useGraphStore();

  const [maps, setMaps] = useState<VaultFileSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [vaultPath, setVaultPath] = useState<string>('');

  const refreshVault = async () => {
    setIsLoading(true);
    try {
      if (window.vaultAPI) {
        const list = await window.vaultAPI.listMaps();
        setMaps(list);
        const path = await window.vaultAPI.getVaultPath();
        setVaultPath(path);
      } else {
        // Fallback for browser testing (read localStorage keys)
        const browserMaps: VaultFileSummary[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('mindmap-vault-')) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}');
              browserMaps.push({
                id: data.id,
                title: data.title || 'Untitled',
                path: 'Browser LocalStorage',
                updatedAt: new Date().toISOString(),
                nodeCount: data.nodes ? Object.keys(data.nodes).length : 0
              });
            } catch {}
          }
        }
        setMaps(browserMaps);
        setVaultPath('Browser Local Storage');
      }
    } catch (err) {
      console.error('Failed to load vault maps:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshVault();
    }
  }, [isOpen]);

  const handleSelectMap = async (id: string) => {
    try {
      if (window.vaultAPI) {
        const doc = await window.vaultAPI.readMap(id);
        if (doc) {
          loadDocument(doc);
          onClose();
        }
      } else {
        const raw = localStorage.getItem(`mindmap-vault-${id}`);
        if (raw) {
          loadDocument(JSON.parse(raw));
          onClose();
        }
      }
    } catch (err) {
      console.error('Error opening map:', err);
    }
  };

  const handleDeleteMap = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this mind map from the vault?')) return;

    try {
      if (window.vaultAPI) {
        await window.vaultAPI.deleteMap(id);
      } else {
        localStorage.removeItem(`mindmap-vault-${id}`);
      }
      refreshVault();
    } catch (err) {
      console.error('Failed to delete map:', err);
    }
  };

  const handleCreateNew = async () => {
    await saveCurrentDocument();
    newDocument('New Mind Map');
    onClose();
  };

  const filteredMaps = maps.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-out Vault Panel */}
      <div className="relative w-80 md:w-96 bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-r border-slate-200 dark:border-zinc-800 z-10 animate-in slide-in-from-left duration-200">
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-500" />
              MindMap Vault
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={refreshVault}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition ${
                  isLoading ? 'animate-spin' : ''
                }`}
                title="Refresh Vault"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search mind maps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-zinc-800 border-none rounded-lg text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Vault Location Notice */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-950/50 border-b border-slate-200/60 dark:border-zinc-800/60 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
          <FolderSync className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="truncate" title={vaultPath}>{vaultPath || 'Connecting to vault...'}</span>
        </div>

        {/* New Map Action */}
        <div className="p-3">
          <button
            onClick={handleCreateNew}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> New Mind Map
          </button>
        </div>

        {/* Maps List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1.5">
          {filteredMaps.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No mind maps found.
            </div>
          ) : (
            filteredMaps.map(m => {
              const isActive = m.id === currentDoc.id;
              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectMap(m.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-100'
                      : 'border-transparent hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight">{m.title}</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        {m.nodeCount} thoughts
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteMap(e, m.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 transition"
                    title="Delete Map"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
