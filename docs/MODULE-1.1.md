# Module 1.1: 项目脚手架搭建

**Sprint**: Sprint 1 - 基础设施建设
**状态**: ✅ 完成
**日期**: 2026-04-11

---

## 概述

本模块完成了 AI_Feishu 项目的基础脚手架搭建，包括目录结构、配置文件和依赖管理。

## 目录结构

```
ai_feishu/
├── .env.example          # 环境变量模板
├── package.json           # 依赖声明
├── tsconfig.json         # TypeScript 配置
├── vite.config.ts        # Vite 构建配置
├── tailwind.config.js    # Tailwind CSS 配置
├── src/
│   ├── index.ts          # 后端入口（占位符）
│   ├── app.ts            # Hono 应用（占位符）
│   ├── core/             # 核心模块（后续 Sprint 实现）
│   ├── routers/          # 路由（后续 Sprint 实现）
│   ├── services/         # 业务服务（后续 Sprint 实现）
│   ├── tools/            # 工具定义（后续 Sprint 实现）
│   ├── feishu/           # 飞书集成（后续 Sprint 实现）
│   └── types/            # 类型定义（后续 Sprint 实现）
├── admin/                # React 前端（ Sprint 7 实现）
├── data/                 # 数据目录（运行时创建）
├── scripts/              # 运维脚本（后续 Sprint 实现）
└── tests/               # 测试目录（后续 Sprint 实现）
```

## 配置文件

### package.json
核心依赖：
- `ai` - Vercel AI SDK（多模型路由）
- `hono` - 轻量 Web 框架
- `better-sqlite3` - 嵌入式配置数据库
- `lancedb` - 嵌入式向量数据库
- `@larksuiteoapi/node-sdk` - 飞书 SDK

### tsconfig.json
- Target: ES2022
- Module: ESNext
- Strict mode 开启
- Declaration maps 开启

### tailwind.config.js
飞书品牌色：
- Primary: `#FE5746` (飞书红)
- Secondary: `#00A9FF` (飞书蓝)
- Success/Warning/Error 等语义色

## 环境变量

所有环境变量在 `.env.example` 中定义，详见文件注释。

## 验证命令

```bash
# 类型检查
npm run typecheck

# 安装依赖
npm install

# 运行开发服务器（后续 Sprint 实现后可用）
npm run dev
```

## 依赖版本说明

部分依赖版本根据实际 npm 可用性调整：
- `lancedb`: 使用 `^0.0.1`（建议后续迁移到 `@lancedb/lancedb`）
- `better-sqlite3`: 使用 `^12.0.0`（与 Node.js 25.x 兼容）
- `typescript`: 使用 `5.7.3`
- `vitest`: 使用 `^4.0.0`

## 下一步

- Sprint 1 Module 1.2: 数据库初始化 (SQLite + LanceDB)
