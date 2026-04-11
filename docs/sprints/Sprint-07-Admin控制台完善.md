# Sprint 7: Admin控制台完善

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库  
**Sprint周期**: 0.5周  
**前置依赖**: Sprint 1-6 所有模块  
**Sprint目标**: 完成所有Admin页面和状态监控  

---

## 1. 模块划分

### 模块 7.1: Admin前端框架搭建
### 模块 7.2: Dashboard页面
### 模块 7.3: Settings页面
### 模块 7.4: Models页面
### 模块 7.5: KnowledgeBase页面
### 模块 7.6: 响应式适配

---

## 2. 模块详细规格

### 模块 7.1: Admin前端框架搭建

**文件路径**: `admin/`

#### 2.1.1 项目结构

```
admin/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── components/
    │   ├── Layout.tsx
    │   ├── Nav.tsx
    │   ├── StatusBadge.tsx
    │   └── ...
    ├── pages/
    │   ├── Dashboard.tsx
    │   ├── Settings.tsx
    │   ├── Models.tsx
    │   ├── KnowledgeBase.tsx
    │   └── MCPAuth.tsx
    ├── stores/
    │   └── useConfigStore.ts
    └── lib/
        └── api.ts
```

#### 2.1.2 package.json

```json
{
  "name": "ai-feishu-admin",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "5.3.0",
    "vite": "5.0.0"
  }
}
```

#### 2.1.3 API客户端 (src/lib/api.ts)

```typescript
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/admin';
const API_SECRET = import.meta.env.VITE_ADMIN_API_SECRET || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_SECRET}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // 健康检查
  health: () => request<any>('/health'),

  // 配置
  getConfig: () => request<any>('/config'),
  updateFeishuConfig: (data: any) => 
    request<any>('/config/feishu', { method: 'PUT', body: JSON.stringify(data) }),

  // 模型
  getModels: () => request<any>('/models'),
  createModel: (data: any) => 
    request<any>('/models', { method: 'POST', body: JSON.stringify(data) }),
  updateModel: (id: string, data: any) => 
    request<any>(`/models/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteModel: (id: string) => 
    request<any>(`/models/${id}`, { method: 'DELETE' }),

  // 知识库
  getFolders: () => request<any>('/kb/folders'),
  createFolder: (data: any) => 
    request<any>('/kb/folders', { method: 'POST', body: JSON.stringify(data) }),
  deleteFolder: (id: string) => 
    request<any>(`/kb/folders/${id}`, { method: 'DELETE' }),
  triggerSync: (folderId?: string) => 
    request<any>('/kb/sync', { method: 'POST', body: JSON.stringify({ folderId }) }),
  getKBStats: () => request<any>('/kb/stats'),

  // MCP
  getMCPStatus: () => request<any>('/mcp/status'),
  getMCPTools: () => request<any>('/mcp/tools'),
  updateMCPTool: (name: string, enabled: boolean) => 
    request<any>(`/mcp/tools/${name}`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
  getMCPHealth: () => request<any>('/mcp/health'),
};
```

#### 2.1.4 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 项目启动 | npm run dev成功 | 命令行验证 |
| API连接 | 能请求后端API | 浏览器控制台 |
| 页面导航 | 路由切换正常 | 手动测试 |

---

### 模块 7.2: Dashboard页面

**文件路径**: `admin/src/pages/Dashboard.tsx`

#### 2.2.1 Dashboard实现

```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export function Dashboard() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ['kbStats'],
    queryFn: api.getKBStats,
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">系统状态</h1>

      {/* 状态卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">WebSocket</span>
              <StatusBadge status={health?.wsConnected ? 'connected' : 'disconnected'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">MCP</span>
              <StatusBadge status={health?.mcpConnected ? 'connected' : 'disconnected'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">向量库</span>
              <StatusBadge status={health?.vectorDbStatus === 'ready' ? 'connected' : 'disconnected'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">LLM</span>
              <span className="text-sm font-medium">{health?.currentModel || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 知识库统计 */}
      <Card>
        <CardHeader>
          <CardTitle>知识库统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold">{stats?.totalDocuments || 0}</p>
              <p className="text-sm text-gray-500">文档总数</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalChunks || 0}</p>
              <p className="text-sm text-gray-500">Chunk数量</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.storageSize || '0MB'}</p>
              <p className="text-sm text-gray-500">存储大小</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            最后同步: {stats?.lastSyncAt || '从未同步'}
          </div>
        </CardContent>
      </Card>

      {/* 最近同步记录 */}
      <Card>
        <CardHeader>
          <CardTitle>最近同步记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* TODO: 显示同步记录列表 */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 2.2.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 状态显示 | WS/MCP/向量库状态正确 | 手动测试 |
| 统计数据 | 显示文档数量等 | 手动测试 |
| 自动刷新 | 30秒刷新一次 | 手动测试 |

---

### 模块 7.3: Settings页面

**文件路径**: `admin/src/pages/Settings.tsx`

#### 2.3.1 Settings实现

```tsx
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export function Settings() {
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: api.getConfig,
  });

  const [feishuAppId, setFeishuAppId] = useState('');
  const [feishuAppSecret, setFeishuAppSecret] = useState('');

  const updateConfig = useMutation({
    mutationFn: (data: any) => api.updateFeishuConfig(data),
    onSuccess: () => {
      alert('配置已更新');
    },
  });

  const handleSave = () => {
    updateConfig.mutate({
      appId: feishuAppId,
      appSecret: feishuAppSecret,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">设置</h1>

      {/* 飞书配置 */}
      <Card>
        <CardHeader>
          <CardTitle>飞书配置</CardTitle>
          <CardDescription>配置飞书机器人的凭证信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">App ID</label>
            <Input
              value={feishuAppId}
              onChange={(e) => setFeishuAppId(e.target.value)}
              placeholder={config?.feishu?.appId || 'cli_xxx'}
            />
          </div>
          <div>
            <label className="text-sm font-medium">App Secret</label>
            <Input
              type="password"
              value={feishuAppSecret}
              onChange={(e) => setFeishuAppSecret(e.target.value)}
              placeholder="请输入新密钥以更新"
            />
          </div>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? '保存中...' : '保存配置'}
          </Button>
        </CardContent>
      </Card>

      {/* MCP配置 */}
      <Card>
        <CardHeader>
          <CardTitle>MCP配置</CardTitle>
          <CardDescription>配置飞书官方MCP Server连接</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">MCP Server URL</label>
            <Input
              value={config?.mcp?.serverUrl || ''}
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">当前在环境变量中配置</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">降级模式:</span>
            <span className={`text-sm ${config?.mcp?.fallbackEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {config?.mcp?.fallbackEnabled ? '已启用' : '已禁用'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 2.3.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 配置显示 | 当前配置正确显示 | 手动测试 |
| 配置更新 | 保存后配置更新 | 手动测试 |
| 密码隐藏 | App Secret隐藏显示 | 视觉检查 |

---

### 模块 7.4: Models页面

**文件路径**: `admin/src/pages/Models.tsx`

#### 2.4.1 Models实现

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

export function Models() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['models'],
    queryFn: api.getModels,
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    modelId: '',
    isDefault: false,
  });

  const createModel = useMutation({
    mutationFn: api.createModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setShowForm(false);
      setFormData({ name: '', provider: 'openai', apiKey: '', baseUrl: '', modelId: '', isDefault: false });
    },
  });

  const deleteModel = useMutation({
    mutationFn: api.deleteModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });

  if (isLoading) return <div>加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">模型管理</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? '取消' : '+ 添加模型'}
        </Button>
      </div>

      {/* 添加表单 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>添加新模型</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="模型名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <select
                className="border rounded px-3 py-2"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Google Gemini</option>
                <option value="ollama">Ollama (本地)</option>
              </select>
            </div>
            <Input
              placeholder="API Key"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            />
            <Input
              placeholder="Base URL"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
            />
            <Input
              placeholder="模型ID (如 gpt-4o)"
              value={formData.modelId}
              onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              />
              <label htmlFor="isDefault">设为默认模型</label>
            </div>
            <Button
              onClick={() => createModel.mutate(formData)}
              disabled={createModel.isPending}
            >
              {createModel.isPending ? '创建中...' : '创建'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 模型列表 */}
      <div className="space-y-4">
        {data?.models?.map((model: any) => (
          <Card key={model.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.name}</span>
                    {model.isDefault && <Badge>默认</Badge>}
                    {!model.enabled && <Badge variant="secondary">已禁用</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {model.provider} · {model.modelId}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {model.baseUrl}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteModel.mutate(model.id)}
                  disabled={deleteModel.isPending}
                >
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### 2.4.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 列表显示 | 显示所有模型 | 手动测试 |
| 添加模型 | 创建成功并显示 | 手动测试 |
| 删除模型 | 删除成功并更新 | 手动测试 |
| 默认标记 | 默认模型有标记 | 视觉检查 |

---

### 模块 7.5: KnowledgeBase页面

**文件路径**: `admin/src/pages/KnowledgeBase.tsx`

#### 2.5.1 KnowledgeBase实现

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

export function KnowledgeBase() {
  const queryClient = useQueryClient();
  const { data: folders } = useQuery({
    queryKey: ['folders'],
    queryFn: api.getFolders,
  });
  const { data: stats } = useQuery({
    queryKey: ['kbStats'],
    queryFn: api.getKBStats,
  });

  const [newFolderUrl, setNewFolderUrl] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  const createFolder = useMutation({
    mutationFn: (data: { name: string; url: string }) => api.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setNewFolderUrl('');
      setNewFolderName('');
    },
  });

  const deleteFolder = useMutation({
    mutationFn: api.deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });

  const sync = useMutation({
    mutationFn: (folderId?: string) => api.triggerSync(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kbStats'] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">知识库管理</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold">{stats?.totalDocuments || 0}</p>
            <p className="text-sm text-gray-500">文档总数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold">{stats?.totalChunks || 0}</p>
            <p className="text-sm text-gray-500">Chunk数量</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? '同步中...' : '全量同步'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 添加文件夹 */}
      <Card>
        <CardHeader>
          <CardTitle>添加知识库文件夹</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="文件夹名称"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <Input
            placeholder="飞书文件夹URL"
            value={newFolderUrl}
            onChange={(e) => setNewFolderUrl(e.target.value)}
          />
          <Button
            onClick={() => createFolder.mutate({ name: newFolderName, url: newFolderUrl })}
            disabled={!newFolderName || !newFolderUrl || createFolder.isPending}
          >
            {createFolder.isPending ? '添加中...' : '添加文件夹'}
          </Button>
        </CardContent>
      </Card>

      {/* 文件夹列表 */}
      <div className="space-y-4">
        {folders?.folders?.map((folder: any) => (
          <Card key={folder.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{folder.name}</span>
                    <Badge>{folder.docCount || 0} 文档</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{folder.url}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    最后同步: {folder.lastSyncAt || '从未'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sync.mutate(folder.id)}
                    disabled={sync.isPending}
                  >
                    同步
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteFolder.mutate(folder.id)}
                    disabled={deleteFolder.isPending}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### 2.5.2 验收标准

| 验收项 | 验收条件 | 验证方法 |
|-------|---------|---------|
| 统计显示 | 显示文档和Chunk数量 | 手动测试 |
| 添加文件夹 | 添加成功并更新列表 | 手动测试 |
| 删除文件夹 | 删除成功 | 手动测试 |
| 触发同步 | 同步成功 | 手动测试 |

---

### 模块 7.6: 响应式适配

#### 2.6.1 Tailwind响应式类

```css
/* tailwind.config.js */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      },
    },
  },
};
```

#### 2.6.2 响应式布局

```tsx
// Dashboard - 使用 grid grid-cols-2 md:grid-cols-4
// Settings - 单列布局自适应
// Models - 列表自适应
// KnowledgeBase - grid grid-cols-3 响应式
```

---

## 3. 开发流程

### Phase 1: 模块实现

每个模块完成后进行 **Commit 1**:

```bash
git add .
git commit -m "Sprint 7: 完成 [模块名称] 模块

- 实现功能点A
- 实现功能点B

Co-Authored-By: AI <ai@example.com>"
```

### Phase 2: 单元测试 + Bug修复

完成单元测试，发现并修复问题，然后进行 **Commit 2**:

```bash
git add .
git commit -m "Sprint 7: [模块名称] 单元测试与Bug修复

- 添加单元测试X个
- 修复问题Y

Co-Authored-By: AI <ai@example.com>"
```

### Phase 3: 编写模块文档

编写该模块的README或JSDoc，完成后进行 **Commit 3**:

```bash
git add .
git commit -m "Sprint 7: [模块名称] 文档完善

- 添加组件文档
- 添加使用示例

Co-Authored-By: AI <ai@example.com>"
```

---

## 4. Sprint 7 完成标准

### 模块验收清单

| 模块 | 验收状态 | 完成标准 |
|-----|---------|---------|
| 7.1 前端框架 | [ ] | 项目能启动 |
| 7.2 Dashboard | [ ] | 状态显示正确 |
| 7.3 Settings | [ ] | 配置能保存 |
| 7.4 Models | [ ] | 模型CRUD正常 |
| 7.5 KnowledgeBase | [ ] | 文件夹管理正常 |
| 7.6 响应式 | [ ] | 手机端显示正常 |

### Sprint交付物

- React Admin控制台
- Dashboard页面
- Settings页面
- Models页面
- KnowledgeBase页面

---

## 5. Sprint间依赖

**依赖Sprint 7的模块**: Sprint 8 (集成测试)  
**被Sprint 7依赖**: Sprint 1-6

---

**文档版本**: v1.0  
**制定日期**: 2026-04-11  
**依据文档**: ai_feishu-PRD-正式版 v1.1
