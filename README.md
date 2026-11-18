# MindMap Studio 🧠

A modern, offline-first desktop mind mapping application built with **Electron**, **React 19**, and **TypeScript**. Designed for rapid thought capture, perpetual branching, and multi-view project management.

---

## ✨ Features

- **4 Synchronized Views**:
  - **Visual Canvas View**: Infinite pan/zoom canvas powered by `@xyflow/react` and `D3-Hierarchy` for automatic balanced tree layout and smooth Bézier curve connections.
  - **Hierarchy-Aware Kanban**: Workflow status columns (`To Do`, `In Progress`, `Completed`) where cards preserve their depth level (`L0`, `L1`, `L2`) and parent breadcrumbs. Supports Level filtering.
  - **Hierarchical Outline**: Clean, collapsible tree document view (Workflowy/Notion style) for rapid outlining and structural reorganizing.
  - **Presentation Mode**: Fullscreen slide-by-slide walkthrough of thoughts with smooth navigation.
- **Perpetual Branching & Rapid Capture**:
  - `Tab`: Create child branch ($L+1$).
  - `Enter`: Create sibling thought at same level.
  - `Space`: Toggle completion checkmark.
  - `Delete`: Remove thought.
  - `Ctrl + Z` / `Ctrl + Y`: Unlimited Undo and Redo.
- **Task Completion & Aggregation**:
  - Direct completion checkbox on cards and nodes.
  - Parent nodes automatically aggregate and display child completion progress (e.g. `✓ 3/5`).
- **Vault-Hybrid Storage**:
  - Default local vault directory: `~/Documents/MindMap Vault/`.
  - Automatic background autosave.
  - Sidebar vault explorer for switching between maps.
  - Standalone file import and export (Markdown, JSON).
- **Theming**:
  - Clean modern digital aesthetic.
  - Polished **Dark Mode** and **Light Mode** with system theme auto-detection.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
To start both the Vite dev server and the Electron desktop window:
```bash
npm run app
```

*(Or to run the Vite web preview alone in your browser: `npm run dev`)*

### 3. Build for Production / Windows Installer
```bash
# Build native Windows installer (.exe) into the release/ folder
npm run dist
```

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| **Tab** | Add child branch to selected thought |
| **Enter** | Add sibling thought |
| **Space** | Toggle completion status |
| **Delete** / **Backspace** | Delete selected thought |
| **Ctrl + Z** | Undo previous change |
| **Ctrl + Y** / **Ctrl + Shift + Z** | Redo change |
| **Ctrl + S** | Trigger manual save to vault |
| **Double Click** | Edit thought text inline |

---

## 🛠️ Tech Stack

- **Desktop Shell**: Electron 35 (Node 24)
- **Frontend**: React 19, TypeScript, Vite 6
- **Canvas**: `@xyflow/react`, `d3-hierarchy`
- **Kanban**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **State**: Zustand with custom temporal undo/redo
- **Styling**: Tailwind CSS v4, Lucide Icons
