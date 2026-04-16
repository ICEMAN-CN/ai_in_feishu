# Sprint 8.2: 性能测试 (Performance Testing)

**所属项目**: AI_Feishu - 飞书原生本地 AI 知识库
**Sprint周期**: 1天
**前置依赖**: Sprint 8.1 完成
**Sprint目标**: 验证系统在并发和压力下的表现

---

## 1. 测试场景矩阵

| 测试编号 | 测试场景 | 指标要求 | 测试方法 |
|---------|---------|---------|---------|
| PT-001 | 并发10用户 | 无异常，全部正确响应 | 自动化测试 |
| PT-002 | 消息响应时间P50 | ≤2s | 日志统计 |
| PT-003 | 流式首字时间 | ≤500ms | 日志统计 |
| PT-004 | WebSocket并发100 | 连接稳定 | 压力测试 |
| PT-005 | 内存泄漏检测 | 运行24小时无泄漏 | 长时间测试 |

---

## 2. 性能阈值

| 指标 | 阈值 | 说明 |
|------|------|------|
| P50 响应时间 | ≤2000ms | 50%请求在2秒内完成 |
| P95 响应时间 | ≤5000ms | 95%请求在5秒内完成 |
| 流式首字时间 | ≤500ms | 首字节响应时间 |
| 最大并发连接 | 100 | WebSocket最大并发 |
| 内存增长阈值 | 100MB/小时 | 内存泄漏检测阈值 |

---

## 3. 测试文件说明

### 3.1 性能测试配置
- **文件**: `tests/performance/config.ts`
- **功能**: 统一配置阈值、超时、端口等参数

### 3.2 性能指标收集器
- **文件**: `src/core/metrics-logger.ts`
- **功能**: 记录HTTP、流式、WebSocket延迟

### 3.3 HTTP负载测试
- **文件**: `tests/performance/load-tests.ts`
- **运行**: `npx tsx tests/performance/load-tests.ts`
- **依赖**: 服务运行在 port 3000

### 3.4 并发用户测试
- **文件**: `tests/performance/concurrent-users.test.ts`
- **运行**: `npm test -- tests/performance/concurrent-users.test.ts --run`
- **覆盖**: PT-001, PT-002

### 3.5 流式首字时间测试
- **文件**: `tests/performance/streaming-first-byte.test.ts`
- **运行**: `npm test -- tests/performance/streaming-first-byte.test.ts --run`
- **覆盖**: PT-003

### 3.6 WebSocket稳定性测试
- **文件**: `tests/performance/ws-stability.test.ts`
- **运行**: `npm test -- tests/performance/ws-stability.test.ts --run`
- **覆盖**: PT-004

### 3.7 24小时压力测试
- **文件**: `tests/performance/stress-test-24h.ts`
- **运行**: `npx tsx tests/performance/stress-test-24h.ts --short` (1分钟验证)
- **全量**: `npx tsx tests/performance/stress-test-24h.ts` (24小时)
- **覆盖**: PT-005

### 3.8 内存监控脚本
- **文件**: `scripts/memory-monitor.ts`
- **运行**: `npx tsx scripts/memory-monitor.ts`
- **功能**: 监控进程内存使用，输出JSON日志

### 3.9 响应时间分析
- **文件**: `scripts/analyze-response-times.ts`
- **运行**: `npm run analyze:perf`
- **功能**: 解析日志，计算P50/P95/P99

---

## 4. 快速运行指南

### 4.1 安装依赖
```bash
cd ai_feishu
npm install --legacy-peer-deps
```

### 4.2 启动服务
```bash
npm run dev
```

### 4.3 运行所有性能测试
```bash
npm run test:performance
```

### 4.4 运行HTTP负载测试
```bash
# 确保服务在 3000 端口运行
npx tsx tests/performance/load-tests.ts
```

### 4.5 运行Vitest性能测试
```bash
# 并发用户测试
npm test -- tests/performance/concurrent-users.test.ts --run

# 流式首字时间测试
npm test -- tests/performance/streaming-first-byte.test.ts --run

# WebSocket稳定性测试
npm test -- tests/performance/ws-stability.test.ts --run
```

### 4.6 内存监控
```bash
# 在另一个终端运行内存监控
npx tsx scripts/memory-monitor.ts

# 同时运行负载测试
npx tsx tests/performance/load-tests.ts
```

### 4.7 24小时压力测试（夜间测试）
```bash
# 开始24小时测试
npx tsx tests/performance/stress-test-24h.ts

# 或使用1分钟快速验证
npx tsx tests/performance/stress-test-24h.ts --short
```

---

## 5. 阈值验证逻辑

### 5.1 P50响应时间验证 (PT-002)
- 测试方法: 发送10个并发请求
- 验证: P50 ≤ 2000ms
- 失败条件: P50 > 2000ms

### 5.2 流式首字时间验证 (PT-003)
- 测试方法: 模拟流式响应
- 验证: 首字节时间 P50 ≤ 500ms
- 失败条件: 首字节 P50 > 500ms

### 5.3 WebSocket并发验证 (PT-004)
- 测试方法: 模拟100次并发连接/断开
- 验证: 无连接泄漏
- 失败条件: 连接数不归零

### 5.4 内存泄漏验证 (PT-005)
- 测试方法: 长时间运行，监控内存增长
- 验证: 内存增长 < 100MB/小时
- 失败条件: 连续增长超过阈值

---

## 6. 预期结果

### 6.1 成功标准
- [ ] PT-001: 10并发用户全部正确响应
- [ ] PT-002: P50响应时间 ≤2000ms
- [ ] PT-003: 流式首字时间 ≤500ms
- [ ] PT-004: WebSocket并发稳定，无泄漏
- [ ] PT-005: 24小时无内存泄漏

### 6.2 失败处理
- 如果任何阈值未达标，记录具体指标
- 分析瓶颈原因
- 考虑优化或降级方案

---

## 7. 附录

### 7.1 性能监控指标
- `http_req_duration` - HTTP请求持续时间
- `ws_connect_duration` - WebSocket连接时间
- `streaming_first_byte` - 流式首字时间
- `memory_heap_used` - 堆内存使用量

### 7.2 日志分析
```bash
# 分析响应时间日志
npm run analyze:perf

# 输出示例
=== Response Time Analysis ===
HTTP P50: 150ms
HTTP P95: 320ms
HTTP P99: 450ms
✅ All metrics within thresholds
```

### 7.3 相关文件路径
```
ai_feishu/
├── src/core/metrics-logger.ts     # 性能指标收集
├── tests/performance/
│   ├── config.ts                  # 测试配置
│   ├── load-tests.ts              # HTTP负载测试
│   ├── concurrent-users.test.ts   # 并发用户测试
│   ├── streaming-first-byte.test.ts # 流式首字测试
│   ├── ws-stability.test.ts       # WebSocket稳定性测试
│   └── stress-test-24h.ts        # 24小时压力测试
├── scripts/
│   ├── memory-monitor.ts          # 内存监控
│   └── analyze-response-times.ts  # 日志分析
└── docs/sprints/
    └── Sprint-08-2-Performance-Test.md # 本文档
```

---

**文档版本**: v1.0
**制定日期**: 2026-04-16
**依据文档**: Sprint-08-集成测试与优化.md