import { VaultFileSummary } from './mindmap';

export interface VaultAPI {
  listMaps: () => Promise<VaultFileSummary[]>;
  readMap: (id: string) => Promise<any>;
  saveMap: (doc: any) => Promise<{ success: boolean; path: string }>;
  deleteMap: (id: string) => Promise<boolean>;
  getVaultPath: () => Promise<string>;
  getVaultName: () => Promise<string>;
  renameVault: (newName: string) => Promise<{ success: boolean; vaultName?: string; vaultPath?: string; error?: string }>;
  exportMapFile: (doc: any, format: string) => Promise<boolean>;
  importMapFile: () => Promise<any | null>;
  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    vaultAPI?: VaultAPI;
  }
}
