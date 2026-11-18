import { VaultFileSummary } from './mindmap';

export interface VaultAPI {
  listMaps: () => Promise<VaultFileSummary[]>;
  readMap: (id: string) => Promise<any>;
  saveMap: (doc: any) => Promise<{ success: boolean; path: string }>;
  deleteMap: (id: string) => Promise<boolean>;
  getVaultPath: () => Promise<string>;
  exportMapFile: (doc: any, format: string) => Promise<boolean>;
  importMapFile: () => Promise<any | null>;
}

declare global {
  interface Window {
    vaultAPI?: VaultAPI;
  }
}
