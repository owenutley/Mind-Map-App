import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';

let mainWindow: BrowserWindow | null = null;

const getVaultDirectory = (): string => {
  const docsDir = path.join(os.homedir(), 'Documents');
  return path.join(docsDir, 'MindMap Vault');
};

const ensureVaultDir = async (): Promise<string> => {
  const vaultDir = getVaultDirectory();
  try {
    await fs.access(vaultDir);
  } catch {
    await fs.mkdir(vaultDir, { recursive: true });
  }
  return vaultDir;
};

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#09090b',
    title: 'MindMap Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // If in development mode
  const devUrl = 'http://localhost:5173';
  if (process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      // In case vite server isn't up yet, retry shortly
      setTimeout(() => mainWindow?.loadURL(devUrl), 1000);
    });
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Vault IPC Handlers
ipcMain.handle('vault:get-path', async () => {
  return await ensureVaultDir();
});

ipcMain.handle('vault:list-maps', async () => {
  const vaultDir = await ensureVaultDir();
  try {
    const files = await fs.readdir(vaultDir);
    const mapFiles = files.filter(f => f.endsWith('.mindmap') || f.endsWith('.json'));
    
    const results = await Promise.all(
      mapFiles.map(async file => {
        try {
          const filePath = path.join(vaultDir, file);
          const stat = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          return {
            id: data.id || file.replace(/\.(mindmap|json)$/, ''),
            title: data.title || file.replace(/\.(mindmap|json)$/, ''),
            path: filePath,
            updatedAt: stat.mtime.toISOString(),
            nodeCount: data.nodes ? Object.keys(data.nodes).length : 0
          };
        } catch {
          return null;
        }
      })
    );
    return results.filter(Boolean);
  } catch (err) {
    console.error('Failed to list maps in vault:', err);
    return [];
  }
});

ipcMain.handle('vault:read-map', async (_, id: string) => {
  const vaultDir = await ensureVaultDir();
  const filePath = path.join(vaultDir, `${id}.mindmap`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    // try fallback with .json
    try {
      const fallbackPath = path.join(vaultDir, `${id}.json`);
      const content = await fs.readFile(fallbackPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      console.error(`Failed to read map ${id}:`, err);
      return null;
    }
  }
});

ipcMain.handle('vault:save-map', async (_, doc: any) => {
  const vaultDir = await ensureVaultDir();
  const safeId = doc.id || 'default';
  const filePath = path.join(vaultDir, `${safeId}.mindmap`);
  try {
    await fs.writeFile(filePath, JSON.stringify(doc, null, 2), 'utf-8');
    return { success: true, path: filePath };
  } catch (err) {
    console.error(`Failed to save map ${safeId}:`, err);
    return { success: false, path: '' };
  }
});

ipcMain.handle('vault:delete-map', async (_, id: string) => {
  const vaultDir = await ensureVaultDir();
  const filePath = path.join(vaultDir, `${id}.mindmap`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    try {
      await fs.unlink(path.join(vaultDir, `${id}.json`));
      return true;
    } catch {
      return false;
    }
  }
});

ipcMain.handle('vault:export-file', async (_, doc: any, format: string) => {
  if (!mainWindow) return false;
  
  const defaultFilename = `${(doc.title || 'MindMap').replace(/[/\\?%*:|"<>]/g, '_')}.${format}`;
  const filters = format === 'markdown' 
    ? [{ name: 'Markdown', extensions: ['md'] }]
    : [{ name: 'MindMap Document', extensions: ['mindmap', 'json'] }];

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Mind Map',
    defaultPath: defaultFilename,
    filters
  });

  if (result.canceled || !result.filePath) return false;

  try {
    let payload = '';
    if (format === 'markdown') {
      // convert to simple hierarchical markdown outline
      payload = `# ${doc.title || 'Untitled'}\n\n`;
      const nodes = doc.nodes || {};
      const roots = Object.values(nodes).filter((n: any) => !n.parentId);
      
      const printTree = (node: any, depth: number) => {
        const indent = '  '.repeat(depth);
        const check = node.isCompleted ? '[x]' : '[ ]';
        payload += `${indent}- ${check} ${node.title}\n`;
        if (node.notes) {
          payload += `${indent}  > ${node.notes.split('\n').join(`\n${indent}  > `)}\n`;
        }
        const children = Object.values(nodes).filter((n: any) => n.parentId === node.id);
        children.sort((a: any, b: any) => a.order - b.order);
        children.forEach(c => printTree(c, depth + 1));
      };

      roots.forEach(r => printTree(r, 0));
    } else {
      payload = JSON.stringify(doc, null, 2);
    }

    await fs.writeFile(result.filePath, payload, 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to export file:', err);
    return false;
  }
});

ipcMain.handle('vault:import-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Mind Map File',
    filters: [
      { name: 'MindMap Files', extensions: ['mindmap', 'json'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  try {
    const raw = await fs.readFile(result.filePaths[0], 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to import file:', err);
    return null;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
