import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Tag,
  Palette,
  ExternalLink,
  Plus,
  ChevronRight,
  Eye,
  Edit3,
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Link2,
  FileText,
  CornerDownRight,
  Shapes
} from 'lucide-react';
import { marked } from 'marked';
import { useGraphStore, BRANCH_PALETTE } from '../../store/graphStore';
import { NodeStatus, NodeShape } from '../../types/mindmap';
import { getAncestorBreadcrumbs } from '../../utils/layout';

// Helper to open links safely in external browser
const openSafeUrl = (url: string) => {
  if (!url) return;
  if (window.vaultAPI?.openExternal) {
    window.vaultAPI.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const NodeDetailsDrawer: React.FC = () => {
  const {
    document: doc,
    selectedNodeId,
    setSelectedNodeId,
    isInspectorOpen,
    setInspectorOpen,
    updateNode,
    updateNodeColor,
    updateNodeShape,
    toggleCompletion,
    setNodeStatus,
    addNode,
    setActiveCenterId
  } = useGraphStore();

  const [isWide, setIsWide] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [notesText, setNotesText] = useState('');
  const [titleText, setTitleText] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const lastNodeIdRef = useRef<string | null>(null);
  const debounceNotesRef = useRef<NodeJS.Timeout | null>(null);

  const node = selectedNodeId ? doc.nodes[selectedNodeId] : null;

  // Sync state ONLY when switching to a different node
  useEffect(() => {
    if (node && node.id !== lastNodeIdRef.current) {
      lastNodeIdRef.current = node.id;
      setNotesText(node.notes || '');
      setTitleText(node.title || '');
    }
  }, [node?.id]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceNotesRef.current) clearTimeout(debounceNotesRef.current);
    };
  }, []);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isInspectorOpen) {
        setInspectorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInspectorOpen, setInspectorOpen]);

  if (!isInspectorOpen || !node) {
    return null;
  }

  const isRoot = node.id === doc.rootNodeId;
  const breadcrumbs = getAncestorBreadcrumbs(doc.nodes, node.id);
  const children = Object.values(doc.nodes).filter((n) => n.parentId === node.id);
  const completedChildren = children.filter((n) => n.isCompleted).length;

  const handleNotesChange = (val: string) => {
    setNotesText(val);
    if (debounceNotesRef.current) {
      clearTimeout(debounceNotesRef.current);
    }
    debounceNotesRef.current = setTimeout(() => {
      if (node && val !== (node.notes || '')) {
        updateNode(node.id, { notes: val });
      }
    }, 600);
  };

  const handleNotesBlur = () => {
    if (debounceNotesRef.current) {
      clearTimeout(debounceNotesRef.current);
    }
    if (node && notesText !== (node.notes || '')) {
      updateNode(node.id, { notes: notesText });
    }
  };

  const handleTitleSubmit = () => {
    if (!node) return;
    const clean = titleText.trim();
    if (clean && clean !== node.title) {
      updateNode(node.id, { title: clean });
    } else {
      setTitleText(node.title);
    }
  };

  // Markdown formatting toolbar action helper
  const insertMarkdown = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notesText.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newNotes = notesText.substring(0, start) + replacement + notesText.substring(end);
    handleNotesChange(newNotes);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // Extract detected links from notes
  const detectedLinks: { title: string; url: string }[] = [];
  if (notesText) {
    // Match [Title](url)
    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    while ((match = mdLinkRegex.exec(notesText)) !== null) {
      detectedLinks.push({ title: match[1], url: match[2] });
    }
    // Match bare https?:// URLs not already matched
    const bareUrlRegex = /(https?:\/\/[^\s<>[\]"']+)/g;
    while ((match = bareUrlRegex.exec(notesText)) !== null) {
      const url = match[1];
      if (!detectedLinks.some((l) => l.url === url)) {
        detectedLinks.push({ title: url.replace(/^https?:\/\//, ''), url });
      }
    }
  }

  // Render markdown to HTML safely with link interception
  const getRenderedMarkdown = () => {
    if (!notesText.trim()) return '<p class="text-slate-400 italic">No notes or description added yet.</p>';
    try {
      return marked.parse(notesText, {
        gfm: true,
        breaks: true
      }) as string;
    } catch {
      return '<p class="text-red-400">Failed to render markdown</p>';
    }
  };

  const statusConfig: Record<NodeStatus, { label: string; icon: any; color: string; bg: string }> = {
    todo: {
      label: 'To Do',
      icon: Circle,
      color: 'text-slate-500 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800'
    },
    in_progress: {
      label: 'In Progress',
      icon: Clock,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60'
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60'
    }
  };

  return (
    <aside
      ref={drawerRef}
      className={`fixed top-14 bottom-0 right-0 z-40 flex flex-col bg-white dark:bg-[#0c1424] border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300 ease-in-out ${
        isWide ? 'w-full max-w-2xl' : 'w-full max-w-md'
      }`}
    >
      {/* Top Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#090f1b]/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase shrink-0"
            style={{
              backgroundColor: `${node.color || '#3b82f6'}20`,
              color: node.color || '#3b82f6'
            }}
          >
            {isRoot ? 'Center Topic' : `Level ${node.level}`}
          </span>

          {/* Breadcrumb Hierarchy */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-400 truncate">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span className="truncate max-w-[120px]">{crumb}</span>
                  <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Focus as Center button */}
          <button
            onClick={() => setActiveCenterId(node.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Focus this thought as Center"
          >
            <Tag className="w-4 h-4" />
          </button>

          {/* Toggle Width button */}
          <button
            onClick={() => setIsWide(!isWide)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden sm:flex"
            title={isWide ? 'Standard drawer width' : 'Expand drawer width'}
          >
            {isWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close button */}
          <button
            onClick={() => setInspectorOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close Inspector (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title Input & 2-Way Checkbox */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Thought Title
          </label>
          <div className="flex items-start gap-2.5">
            <button
              onClick={() => toggleCompletion(node.id)}
              className={`mt-1 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors shadow-2xs ${
                node.isCompleted
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-white dark:bg-[#070d18]'
              }`}
              title={node.isCompleted ? 'Mark incomplete' : 'Mark completed (cascades to sub-thoughts)'}
            >
              {node.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            <input
              type="text"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className={`w-full text-base font-semibold bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 outline-none pb-1 transition-colors ${
                node.isCompleted
                  ? 'line-through text-slate-400 dark:text-slate-400'
                  : 'text-slate-900 dark:text-slate-50'
              }`}
              placeholder="Thought title..."
            />
          </div>
        </div>

        {/* Workflow Status Selector */}
        <div className="flex items-center gap-2">
          {(['todo', 'in_progress', 'completed'] as NodeStatus[]).map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            const isCurrent = node.status === status;
            return (
              <button
                key={status}
                onClick={() => setNodeStatus(node.id, status)}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  isCurrent
                    ? `${config.bg} ${config.color} font-semibold ring-1 ring-inset ring-slate-300 dark:ring-slate-700 shadow-2xs`
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Branch / Node Color Palette */}
        {!isRoot && (
          <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Branch Color
            </span>
            <div className="flex items-center gap-1.5">
              {BRANCH_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => updateNodeColor(node.id, c, true)}
                  className={`w-4 h-4 rounded-full transition-transform hover:scale-125 border ${
                    node.color === c
                      ? 'border-slate-900 dark:border-white scale-125 ring-1 ring-blue-500'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}

        {/* Node Shape & Style Selector */}
        {!isRoot && (
          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Shapes className="w-3.5 h-3.5" /> Card Shape
            </span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
              {(
                [
                  { id: 'rounded', label: 'Card' },
                  { id: 'pill', label: 'Pill' },
                  { id: 'dashed', label: 'Dashed' },
                  { id: 'borderless', label: 'Clean' }
                ] as { id: NodeShape; label: string }[]
              ).map((s) => {
                const isSelected = (node.shape || 'rounded') === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => updateNodeShape(node.id, s.id)}
                    className={`px-2 py-0.5 rounded-md font-medium transition ${
                      isSelected
                        ? 'bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Markdown Notes & Description Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Notes & Description (Markdown)
            </label>

            {/* Edit / Preview Tabs */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-950/90 text-xs">
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition ${
                  activeTab === 'edit'
                    ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 shadow-xs dark:border dark:border-slate-700/60'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 shadow-xs dark:border dark:border-slate-700/60'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
            </div>
          </div>

          {/* Markdown Formatting Toolbar (Visible in Edit mode) */}
          {activeTab === 'edit' && (
            <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#090f1b]/80 text-slate-600 dark:text-slate-400 overflow-x-auto text-xs">
              <button
                onClick={() => insertMarkdown('**', '**', 'bold text')}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertMarkdown('*', '*', 'italic text')}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertMarkdown('### ', '', 'Heading')}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Heading"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
              <button
                onClick={() => insertMarkdown('- ', '', 'List item')}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertMarkdown('1. ', '', 'Numbered item')}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertMarkdown('- [ ] ', '', 'Task item')}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Checklist Item"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
              <button
                onClick={() => insertMarkdown('`', '`', 'code')}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Inline Code"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertMarkdown('[', '](https://example.com)', 'Link label')}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Insert Link"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Edit Area or Preview Area */}
          {activeTab === 'edit' ? (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={notesText}
                onChange={(e) => handleNotesChange(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Write detailed notes, software specs, research thoughts, or links in Markdown..."
                className="w-full min-h-[180px] p-3 text-xs leading-relaxed rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090f1b] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono transition resize-y"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-400 mt-1 px-1">
                <span>Markdown supported (headings, lists, code, links)</span>
                <span>{notesText.length} characters</span>
              </div>
            </div>
          ) : (
            <div
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'A') {
                  e.preventDefault();
                  const href = target.getAttribute('href');
                  if (href) openSafeUrl(href);
                }
              }}
              className="w-full min-h-[180px] p-3 text-xs leading-relaxed rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#090f1b]/50 prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5 prose-pre:my-2 prose-pre:p-2 prose-pre:rounded-lg prose-pre:bg-slate-900 prose-code:text-blue-500 prose-a:text-blue-500 hover:prose-a:underline select-text"
              dangerouslySetInnerHTML={{ __html: getRenderedMarkdown() }}
            />
          )}
        </div>

        {/* Attached & Detected Links */}
        {detectedLinks.length > 0 && (
          <div className="space-y-1.5 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Detected Links & Media ({detectedLinks.length})
            </div>
            <div className="space-y-1">
              {detectedLinks.map((link, idx) => (
                <button
                  key={idx}
                  onClick={() => openSafeUrl(link.url)}
                  className="w-full text-left flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-blue-100/60 dark:hover:bg-blue-900/40 text-xs text-blue-600 dark:text-blue-400 transition group"
                >
                  <span className="truncate font-medium group-hover:underline">{link.title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Direct Sub-thoughts List */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Sub-thoughts ({completedChildren}/{children.length})
            </span>
            <button
              onClick={() => addNode(node.id, 'New Thought')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Sub-thought
            </button>
          </div>

          {children.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-400 italic py-1">
              No sub-thoughts branched yet.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {children.map((child) => (
                <div
                  key={child.id}
                  onClick={() => setSelectedNodeId(child.id, true)}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0f172a] cursor-pointer transition text-xs group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompletion(child.id);
                      }}
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                        child.isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {child.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>
                    <span
                      className={`truncate ${
                        child.isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {child.title}
                    </span>
                  </div>

                  <CornerDownRight className="w-3.5 h-3.5 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
