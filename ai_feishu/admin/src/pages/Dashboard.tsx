import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '从未同步';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
  } catch {
    return '无效日期';
  }
}

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

  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: api.getFolders,
    refetchInterval: 60000,
  });

  const folders = foldersData?.folders || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">系统状态</h1>

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

      <Card>
        <CardHeader>
          <CardTitle>知识库统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div>
              <p className="text-2xl font-bold">{stats?.lastSyncAt ? formatDate(stats.lastSyncAt) : '从未'}</p>
              <p className="text-sm text-gray-500">最后同步</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近同步记录</CardTitle>
        </CardHeader>
        <CardContent>
          {folders.length === 0 ? (
            <p className="text-sm text-gray-500">暂无同步记录</p>
          ) : (
            <div className="space-y-3">
              {folders
                .filter((f: any) => f.lastSyncAt)
                .sort((a: any, b: any) => {
                  const dateA = a.lastSyncAt ? new Date(a.lastSyncAt).getTime() : 0;
                  const dateB = b.lastSyncAt ? new Date(b.lastSyncAt).getTime() : 0;
                  return dateB - dateA;
                })
                .slice(0, 5)
                .map((folder: any) => (
                  <div key={folder.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{folder.name}</span>
                        <Badge>{folder.lastSyncDocCount || 0} 文档</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {folder.url}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatDate(folder.lastSyncAt)}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
