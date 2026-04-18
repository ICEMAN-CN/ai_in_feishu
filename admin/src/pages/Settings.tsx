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

      <Card>
        <CardHeader>
          <CardTitle>飞书配置</CardTitle>
          <CardDescription>配置飞书机器人的凭证信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">App ID</label>
            <Input
              value={feishuAppId}
              onChange={(e) => setFeishuAppId(e.target.value)}
              placeholder={config?.feishu?.appId || 'cli_xxx'}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">App Secret</label>
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

      <Card>
        <CardHeader>
          <CardTitle>MCP配置</CardTitle>
          <CardDescription>配置飞书官方MCP Server连接</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">MCP Server URL</label>
            <Input value={config?.mcp?.serverUrl || ''} disabled />
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
