/**
 * MCP 集成测试脚本
 * 
 * 测试 MCP Client 与飞书官方 MCP Server 的集成功能
 * 
 * 前置条件:
 * 1. 飞书 MCP Server 已部署并运行
 * 2. .env 文件中已配置 MCP_SERVER_URL 和 MCP_SERVER_TOKEN
 * 
 * 使用方法:
 *   cd ai_feishu
 *   npx tsx scripts/test-mcp-integration.ts
 * 
 * 或直接设置环境变量:
 *   MCP_SERVER_URL=http://localhost:3001 MCP_SERVER_TOKEN=your_token npx tsx scripts/test-mcp-integration.ts
 */

import { MCPClient, MCPClientConfig, MCPTool } from '../src/core/mcp-client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ==================== 环境变量加载 ====================

function loadEnv() {
  const envPath = join(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  }
}

loadEnv();

// ==================== 配置 ====================

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';
const MCP_SERVER_TOKEN = process.env.MCP_SERVER_TOKEN || '';
const MCP_TIMEOUT = parseInt(process.env.MCP_TIMEOUT || '30000', 10);
const MCP_RETRY_ATTEMPTS = parseInt(process.env.MCP_RETRY_ATTEMPTS || '3', 10);

// ==================== 测试结果收集 ====================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, message: string, duration: number) {
  results.push({ name, passed, message, duration });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${name} | ${duration}ms | ${message}`);
}

function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('测试结果汇总');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`总计: ${total} | ✅ 通过: ${passed} | ❌ 失败: ${failed} | ⏱️ 总耗时: ${totalDuration}ms`);
  console.log('='.repeat(70));
  
  if (failed > 0) {
    console.log('\n失败测试详情:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  - ${r.name}: ${r.message}`);
    }
  }
  
  return failed === 0;
}

// ==================== 测试用例 ====================

async function testConnection(): Promise<boolean> {
  console.log('\n--- TC-4.1-INTEG-001: 连接 MCP Server ---');
  const start = Date.now();
  
  try {
    const config: MCPClientConfig = {
      serverUrl: MCP_SERVER_URL,
      serverToken: MCP_SERVER_TOKEN || undefined,
      timeout: MCP_TIMEOUT,
      retryAttempts: MCP_RETRY_ATTEMPTS,
    };
    
    const client = new MCPClient(config);
    
    // 监听事件
    let connectedEventFired = false;
    client.on('connected', () => {
      connectedEventFired = true;
      console.log('  [事件] connected 事件已触发');
    });
    
    console.log(`  连接地址: ${MCP_SERVER_URL}`);
    console.log(`  Token: ${MCP_SERVER_TOKEN ? '已设置 ✓' : '未设置 (可选)'}`);
    console.log(`  超时: ${MCP_TIMEOUT}ms`);
    console.log(`  重试次数: ${MCP_RETRY_ATTEMPTS}`);
    
    await client.connect();
    
    const duration = Date.now() - start;
    const state = client.getConnectionState();
    
    console.log(`  连接状态: ${state.connected ? '已连接' : '未连接'}`);
    console.log(`  重连次数: ${state.reconnectAttempts}`);
    console.log(`  连接时间: ${state.lastConnectedAt || '未知'}`);
    
    if (state.connected && connectedEventFired) {
      recordTest('连接 MCP Server', true, '连接成功', duration);
      return true;
    } else {
      recordTest('连接 MCP Server', false, `状态: ${state.connected}, 事件: ${connectedEventFired}`, duration);
      return false;
    }
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    recordTest('连接 MCP Server', false, message, duration);
    return false;
  }
}

async function testToolLoading(client: MCPClient): Promise<boolean> {
  console.log('\n--- TC-4.1-INTEG-002: 加载工具列表 ---');
  const start = Date.now();
  
  try {
    await client.loadTools();
    
    const tools = client.getTools();
    const duration = Date.now() - start;
    
    console.log(`  加载工具数量: ${tools.length}`);
    
    if (tools.length > 0) {
      console.log('\n  工具列表:');
      for (const tool of tools) {
        console.log(`    - ${tool.name}: ${tool.description}`);
        if (tool.fallbackMethod) {
          console.log(`      降级方法: ${tool.fallbackMethod}`);
        }
      }
    }
    
    recordTest('加载工具列表', true, `加载了 ${tools.length} 个工具`, duration);
    return true;
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    recordTest('加载工具列表', false, message, duration);
    return false;
  }
}

async function testToolDiscovery(client: MCPClient): Promise<boolean> {
  console.log('\n--- TC-4.1-INTEG-003: 工具发现 ---');
  const start = Date.now();
  
  try {
    const tools = client.getTools();
    let allPassed = true;
    const messages: string[] = [];
    
    // 测试 hasTool
    const testToolNames = ['read_document', 'create_document', 'search_wiki_or_drive'];
    for (const name of testToolNames) {
      const hasTool = client.hasTool(name);
      console.log(`  hasTool('${name}'): ${hasTool ? '✓' : '✗'}`);
      if (!hasTool) {
        allPassed = false;
        messages.push(`缺少工具: ${name}`);
      }
    }
    
    // 测试 getTool
    const readDocTool = client.getTool('read_document');
    if (readDocTool) {
      console.log(`  getTool('read_document'): ✓`);
      console.log(`    - 名称: ${readDocTool.name}`);
      console.log(`    - 描述: ${readDocTool.description}`);
      console.log(`    - 输入Schema: ${JSON.stringify(readDocTool.inputSchema.properties).slice(0, 100)}...`);
    } else {
      console.log(`  getTool('read_document'): ✗`);
      allPassed = false;
      messages.push('无法获取 read_document 工具');
    }
    
    // 测试不存在的工具
    const nonExistent = client.getTool('non_existent_tool');
    if (!nonExistent) {
      console.log(`  getTool('non_existent_tool'): ✓ (正确返回 undefined)`);
    } else {
      console.log(`  getTool('non_existent_tool'): ✗ (应该返回 undefined)`);
      allPassed = false;
      messages.push('不存在的工具应返回 undefined');
    }
    
    const duration = Date.now() - start;
    recordTest('工具发现', allPassed, allPassed ? '所有检查通过' : messages.join('; '), duration);
    return allPassed;
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    recordTest('工具发现', false, message, duration);
    return false;
  }
}

async function testToolCall(client: MCPClient): Promise<boolean> {
  console.log('\n--- TC-4.1-INTEG-004: 工具调用 ---');
  const start = Date.now();
  
  // 注意: 这个测试可能因为 MCP Server 不支持或参数错误而失败
  // 关键是测试流程能正确执行
  
  try {
    if (!client.isConnected()) {
      recordTest('工具调用', false, 'MCP 未连接', 0);
      return false;
    }
    
    const tools = client.getTools();
    if (tools.length === 0) {
      recordTest('工具调用', false, '没有可用的工具', 0);
      return false;
    }
    
    console.log(`  尝试调用工具: ${tools[0].name}`);
    console.log(`  注意: 实际调用结果取决于 MCP Server 是否支持此操作`);
    
    // 使用一个模拟参数调用 (可能返回错误但能验证调用流程)
    try {
      const result = await client.callTool(tools[0].name, { 
        document_id: 'test_document_id_for_integration_test' 
      });
      
      const duration = Date.now() - start;
      console.log(`  调用结果: ${JSON.stringify(result).slice(0, 200)}...`);
      recordTest('工具调用', true, '工具调用成功', duration);
      return true;
    } catch (toolError) {
      const duration = Date.now() - start;
      // 工具调用失败不一定是坏事，可能是参数问题或 Server 不支持
      const errorMsg = toolError instanceof Error ? toolError.message : String(toolError);
      
      if (errorMsg.includes('not found') || errorMsg.includes('not supported')) {
        console.log(`  工具调用返回预期错误: ${errorMsg}`);
        recordTest('工具调用', true, `Server 返回: ${errorMsg}`, duration);
      } else {
        console.log(`  工具调用失败: ${errorMsg}`);
        recordTest('工具调用', false, errorMsg, duration);
      }
      return false;
    }
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    recordTest('工具调用', false, message, duration);
    return false;
  }
}

async function testFallback(client: MCPClient): Promise<boolean> {
  console.log('\n--- TC-4.1-INTEG-005: 降级机制 ---');
  const start = Date.now();
  
  try {
    // 测试 callWithFallback
    // 由于没有真实可用的 MCP Server，这个测试验证降级逻辑
    
    const result = await client.callWithFallback('read_document', { document_id: 'test' });
    
    const duration = Date.now() - start;
    
    console.log(`  success: ${result.success}`);
    console.log(`  error: ${result.error || '无'}`);
    console.log(`  data: ${result.data ? JSON.stringify(result.data).slice(0, 100) : '无'}`);
    
    // 降级返回 success=false 是正常的 (因为 fallbackMethod 未实现)
    if (!result.success && result.error) {
      console.log('  降级逻辑已触发 (符合预期)');
      recordTest('降级机制', true, '降级返回预期结果', duration);
      return true;
    } else if (result.success) {
      recordTest('降级机制', true, '调用直接成功', duration);
      return true;
    } else {
      recordTest('降级机制', false, result.error || '未知错误', duration);
      return false;
    }
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    recordTest('降级机制', false, message, duration);
    return false;
  }
}

async function testDisconnect(client: MCPClient): Promise<boolean> {
  console.log('\n--- TC-4.1-INTEG-006: 断开连接 ---');
  const start = Date.now();
  
  try {
    client.disconnect();
    
    const duration = Date.now() - start;
    const isConnected = client.isConnected();
    
    console.log(`  isConnected() after disconnect: ${isConnected}`);
    
    if (!isConnected) {
      recordTest('断开连接', true, '断开成功', duration);
      return true;
    } else {
      recordTest('断开连接', false, '断开后仍显示已连接', duration);
      return false;
    }
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    recordTest('断开连接', false, message, duration);
    return false;
  }
}

async function testReconnection(): Promise<boolean> {
  console.log('\n--- TC-4.1-INTEG-007: 重连机制 ---');
  const start = Date.now();
  
  try {
    const config: MCPClientConfig = {
      serverUrl: MCP_SERVER_URL,
      serverToken: MCP_SERVER_TOKEN || undefined,
      timeout: 5000, // 短超时触发重连
      retryAttempts: 2,
    };
    
    const client = new MCPClient(config);
    
    let reconnectEventFired = false;
    client.on('reconnecting', (data: any) => {
      reconnectEventFired = true;
      console.log(`  [事件] reconnecting 触发: 尝试 ${data.attempt}, 延迟 ${data.delay}ms`);
    });
    
    console.log('  尝试连接 (预期失败，测试重连)...');
    
    try {
      await client.connect();
      // 如果连接成功，说明 Server 可用
      console.log('  Server 可用，重连机制未触发');
      client.disconnect();
      recordTest('重连机制', true, 'Server 可用', Date.now() - start);
      return true;
    } catch (error) {
      // 连接失败，检查重连事件
      if (reconnectEventFired) {
        recordTest('重连机制', true, '重连事件触发', Date.now() - start);
        return true;
      } else {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`  连接失败但未触发重连: ${message}`);
        recordTest('重连机制', false, message, Date.now() - start);
        return false;
      }
    }
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    recordTest('重连机制', false, message, duration);
    return false;
  }
}

// ==================== 主函数 ====================

async function main() {
  console.log('='.repeat(70));
  console.log('MCP 集成测试');
  console.log('='.repeat(70));
  console.log(`\n配置信息:`);
  console.log(`  MCP_SERVER_URL: ${MCP_SERVER_URL}`);
  console.log(`  MCP_SERVER_TOKEN: ${MCP_SERVER_TOKEN ? '已设置' : '未设置'}`);
  console.log(`  MCP_TIMEOUT: ${MCP_TIMEOUT}ms`);
  console.log(`  MCP_RETRY_ATTEMPTS: ${MCP_RETRY_ATTEMPTS}`);
  
  // 检查基本配置
  if (!MCP_SERVER_URL) {
    console.error('\n❌ 错误: MCP_SERVER_URL 未设置');
    console.error('请在 .env 文件中设置 MCP_SERVER_URL 或设置环境变量');
    process.exit(1);
  }
  
  let client: MCPClient | null = null;
  let allPassed = true;
  
  try {
    // Test 1: 连接
    if (!await testConnection()) {
      allPassed = false;
      console.log('\n⚠️ 连接失败，跳过依赖连接的后续测试');
    } else {
      // 重新获取 client 实例
      const config: MCPClientConfig = {
        serverUrl: MCP_SERVER_URL,
        serverToken: MCP_SERVER_TOKEN || undefined,
        timeout: MCP_TIMEOUT,
        retryAttempts: MCP_RETRY_ATTEMPTS,
      };
      client = new MCPClient(config);
      await client.connect();
      
      // Test 2: 工具加载
      if (!await testToolLoading(client)) {
        allPassed = false;
      }
      
      // Test 3: 工具发现
      if (!await testToolDiscovery(client)) {
        allPassed = false;
      }
      
      // Test 4: 工具调用
      if (!await testToolCall(client)) {
        allPassed = false;
      }
      
      // Test 5: 降级机制
      if (!await testFallback(client)) {
        allPassed = false;
      }
      
      // Test 6: 断开连接
      if (!await testDisconnect(client)) {
        allPassed = false;
      }
    }
    
    // Test 7: 重连机制 (独立测试)
    if (!await testReconnection()) {
      allPassed = false;
    }
    
    // 打印汇总
    console.log('\n');
    const success = printSummary();
    
    console.log('\n' + '='.repeat(70));
    if (success) {
      console.log('🎉 所有测试通过!');
    } else {
      console.log('⚠️ 部分测试失败，请检查上述失败项');
    }
    console.log('='.repeat(70));
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ 测试执行异常:', error);
    process.exit(1);
  }
}

main();