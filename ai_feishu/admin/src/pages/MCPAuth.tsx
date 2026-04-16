import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export function MCPAuth() {
  const queryClient = useQueryClient();
  const { data: status } = useQuery({
    queryKey: ['mcpStatus'],
    queryFn: api.getMCPStatus,
  });

  const { data: tools } = useQuery({
    queryKey: ['mcpTools'],
    queryFn: api.getMCPTools,
  });

  const updateTool = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      api.updateMCPTool(name, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcpTools'] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">MCP Auth</h1>

      <Card>
        <CardHeader>
          <CardTitle>连接状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm">MCP Server:</span>
            <Badge variant={status?.connected ? 'default' : 'secondary'}>
              {status?.connected ? '已连接' : '未连接'}
            </Badge>
            <span className="text-sm text-gray-500">{status?.serverUrl}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>工具权限</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tools?.tools?.map((tool: any) => (
              <div key={tool.name} className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{tool.name}</span>
                  <p className="text-sm text-gray-500">{tool.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {tool.availableInMCP && (
                    <Badge variant="secondary">MCP可用</Badge>
                  )}
                  <Button
                    size="sm"
                    variant={tool.enabled ? 'default' : 'outline'}
                    onClick={() => updateTool.mutate({ name: tool.name, enabled: !tool.enabled })}
                    disabled={updateTool.isPending}
                  >
                    {tool.enabled ? '禁用' : '启用'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
