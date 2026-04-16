const API_BASE = import.meta.env.VITE_API_BASE || '/api/admin';
const API_SECRET = import.meta.env.VITE_ADMIN_API_SECRET || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-API-Key': API_SECRET,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  health: () => request<any>('/health'),

  getConfig: () => request<any>('/config'),
  updateFeishuConfig: (data: any) =>
    request<any>('/config/feishu', { method: 'PUT', body: JSON.stringify(data) }),

  getModels: () => request<any>('/models'),
  createModel: (data: any) =>
    request<any>('/models', { method: 'POST', body: JSON.stringify(data) }),
  updateModel: (id: string, data: any) =>
    request<any>(`/models/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteModel: (id: string) =>
    request<any>(`/models/${id}`, { method: 'DELETE' }),

  getFolders: () => request<any>('/kb/folders'),
  createFolder: (data: any) =>
    request<any>('/kb/folders', { method: 'POST', body: JSON.stringify(data) }),
  deleteFolder: (id: string) =>
    request<any>(`/kb/folders/${id}`, { method: 'DELETE' }),
  triggerSync: (folderId?: string) =>
    request<any>('/kb/sync', { method: 'POST', body: JSON.stringify({ folderId }) }),
  getKBStats: () => request<any>('/kb/stats'),

  getMCPStatus: () => request<any>('/mcp/status'),
  getMCPTools: () => request<any>('/mcp/tools'),
  updateMCPTool: (name: string, enabled: boolean) =>
    request<any>(`/mcp/tools/${name}`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
  getMCPHealth: () => request<any>('/mcp/health'),
};
