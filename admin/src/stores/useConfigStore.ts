import { create } from 'zustand';

interface ConfigState {
  feishuAppId: string;
  feishuAppSecret: string;
  mcpServerUrl: string;
  mcpFallbackEnabled: boolean;
  setFeishuConfig: (appId: string, appSecret: string) => void;
  setMCPConfig: (serverUrl: string, fallbackEnabled: boolean) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  feishuAppId: '',
  feishuAppSecret: '',
  mcpServerUrl: '',
  mcpFallbackEnabled: false,
  setFeishuConfig: (appId, appSecret) =>
    set({ feishuAppId: appId, feishuAppSecret: appSecret }),
  setMCPConfig: (serverUrl, fallbackEnabled) =>
    set({ mcpServerUrl: serverUrl, mcpFallbackEnabled: fallbackEnabled }),
}));
