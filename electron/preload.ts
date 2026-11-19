import { contextBridge, ipcRenderer } from 'electron';

export interface VaultFileSummary {
  id: string;
  title: string;
  path: string;
  updatedAt: string;
  nodeCount: number;
}

export interface VaultAPI {
  listMaps: () => Promise<VaultFileSummary[]>;
  readMap: (id: string) => Promise<any>;
  saveMap: (doc: any) => Promise<{ success: boolean; path: string }>;
  deleteMap: (id: string) => Promise<boolean>;
  getVaultPath: () => Promise<string>;
  exportMapFile: (doc: any, format: string) => Promise<boolean>;
  importMapFile: () => Promise<any | null>;
  openExternal: (url: string) => Promise<boolean>;
}

const api: VaultAPI = {
  listMaps: () => ipcRenderer.invoke('vault:list-maps'),
  readMap: (id: string) => ipcRenderer.invoke('vault:read-map', id),
  saveMap: (doc: any) => ipcRenderer.invoke('vault:save-map', doc),
  deleteMap: (id: string) => ipcRenderer.invoke('vault:delete-map', id),
  getVaultPath: () => ipcRenderer.invoke('vault:get-path'),
  exportMapFile: (doc: any, format: string) => ipcRenderer.invoke('vault:export-file', doc, format),
  importMapFile: () => ipcRenderer.invoke('vault:import-file'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url)
};

contextBridge.exposeInMainWorld('vaultAPI', api);
