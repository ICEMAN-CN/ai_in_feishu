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
        </CardContent>
      </Card>
    </div>
  );
}
