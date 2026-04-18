import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';

export function Models() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
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

  if (isLoading) {
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

  const models = data?.models || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">模型管理</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? '取消' : '+ 添加模型'}
        </Button>
      </div>

      {createModel.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <XCircle size={18} />
          <span>创建失败: {(createModel.error as Error).message}</span>
        </div>
      )}
      {createModel.isSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
          <CheckCircle size={18} />
          <span>模型创建成功</span>
        </div>
      )}
      {deleteModel.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <XCircle size={18} />
          <span>删除失败: {(deleteModel.error as Error).message}</span>
        </div>
      )}

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
                className="border rounded px-3 py-2 bg-white"
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
              placeholder="Base URL（可选，留空使用默认值）"
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
              disabled={createModel.isPending || !formData.name || !formData.apiKey || !formData.modelId}
            >
              {createModel.isPending ? '创建中...' : '创建'}
            </Button>
          </CardContent>
        </Card>
      )}

      {models.length === 0 && !showForm && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-full">
                <Plus className="text-gray-400" size={24} />
              </div>
              <div>
                <p className="text-gray-500 font-medium">暂无模型</p>
                <p className="text-sm text-gray-400 mt-1">点击上方"添加模型"创建一个</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {models.map((model: any) => (
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
                  <p className="text-xs text-gray-400 mt-1">{model.baseUrl}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteModel.mutate(model.id)}
                  disabled={deleteModel.isPending}
                >
                  <Trash2 size={16} className="mr-1" />
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
