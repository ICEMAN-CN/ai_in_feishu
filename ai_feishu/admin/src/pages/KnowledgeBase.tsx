import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, XCircle, Plus, FolderSync, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

export function KnowledgeBase() {
  const queryClient = useQueryClient();
  const { data: folders, isLoading, error } = useQuery({
    queryKey: ['folders'],
    queryFn: api.getFolders,
  });
  const { data: stats, isLoading: isStatsLoading } = useQuery({
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

  if (isLoading || isStatsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle size={20} />
          <span>加载失败: {(error as Error).message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">知识库管理</h1>

      {createFolder.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <XCircle size={18} />
          <span>添加失败: {(createFolder.error as Error).message}</span>
        </div>
      )}
      {createFolder.isSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
          <CheckCircle size={18} />
          <span>文件夹添加成功</span>
        </div>
      )}
      {deleteFolder.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <XCircle size={18} />
          <span>删除失败: {(deleteFolder.error as Error).message}</span>
        </div>
      )}
      {deleteFolder.isSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
          <CheckCircle size={18} />
          <span>文件夹已删除</span>
        </div>
      )}
      {sync.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <XCircle size={18} />
          <span>同步失败: {(sync.error as Error).message}</span>
        </div>
      )}
      {sync.isSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
          <CheckCircle size={18} />
          <span>同步完成</span>
        </div>
      )}

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
            <Plus size={16} className="mr-1" />
            {createFolder.isPending ? '添加中...' : '添加文件夹'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {folders?.folders?.length === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-gray-100 rounded-full">
                  <FolderSync className="text-gray-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-500 font-medium">暂无知识库文件夹</p>
                  <p className="text-sm text-gray-400 mt-1">点击上方"添加文件夹"创建一个</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {folders?.folders?.map((folder: { id: string; name: string; url: string; docCount?: number; lastSyncAt?: string }) => (
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
                    <FolderSync size={16} className="mr-1" />同步
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteFolder.mutate(folder.id)}
                    disabled={deleteFolder.isPending}
                  >
                    <Trash2 size={16} className="mr-1" />删除
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
