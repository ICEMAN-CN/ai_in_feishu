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

  const handleFullSync = () => {
    sync.mutate(undefined);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">知识库管理</h1>

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
            <Button onClick={handleFullSync} disabled={sync.isPending}>
              {sync.isPending ? '同步中...' : '全量同步'}
            </Button>
          </CardContent>
        </Card>
      </div>

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
