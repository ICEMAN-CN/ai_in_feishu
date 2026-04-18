# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI_Feishu is a **Feishu (Lark) native AI knowledge base** - a locally-deployed AI assistant integrating Feishu for multi-LLM chat and RAG-powered knowledge retrieval.

**Status**: Implementation Complete (8 sprints finished, 562 tests passing)

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (ES2022, ESNext) |
| Backend Framework | Hono.js with `@hono/node-server` |
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui |
| State Management | Zustand (admin), React Query |
| LLM Routing | Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`) |
| Feishu SDK | `@larksuiteoapi/node-sdk` |
| Vector DB | LanceDB (embedded, file-based) |
| Config DB | SQLite3 (`better-sqlite3`) |
| Text Processing | LangChain.js |
| MCP Integration | Custom MCP client |

## Architecture Constraints

- **B/S architecture**: Local Web App served on port 3000
- **No external DB processes**: Postgres, Redis, Milvus are banned
- **No serverless**: Maintains persistent connection with Feishu via WebSocket
- **Data privacy**: All data stays local
- **Embedded databases only**: LanceDB (vector) + SQLite (config)

## Directory Structure

```
/                          # Project root
├── src/                   # Backend source code
│   ├── index.ts           # Entry point (port 3000)
│   ├── app.ts             # AIFeishuApp class alternative entry
│   ├── core/              # Core engine modules
│   │   ├── config-store.ts    # SQLite CRUD (models, sessions, KB, MCP tools)
│   │   ├── encryption.ts     # Encryption utilities
│   │   ├── kb-folder-manager.ts # KB folder management
│   │   ├── mcp-client.ts     # MCP protocol client
│   │   ├── session-manager.ts # Session management
│   │   ├── token.ts          # Admin token auth (24h expiry)
│   │   ├── vector-store-service.ts # Vector storage service
│   │   ├── vector-store.ts    # LanceDB operations
│   │   └── ws-manager.ts      # WebSocket manager
│   ├── routers/           # API route handlers
│   │   ├── admin.ts       # Model & config management
│   │   ├── admin-kb.ts    # Knowledge base management
│   │   ├── admin-mcp.ts   # MCP management
│   │   └── callback.ts    # Feishu callback/webhook handler
│   ├── services/          # Business logic
│   │   ├── llm-router.ts      # LLM routing
│   │   ├── rag-pipeline.ts   # RAG processing
│   │   ├── streaming-handler.ts # SSE streaming
│   │   └── ...
│   ├── feishu/           # Feishu integration
│   │   ├── card-builder.ts   # Interactive card messages
│   │   ├── client.ts         # Feishu client
│   │   └── message-handler.ts # Message handling
│   ├── tools/            # MCP tool definitions
│   │   ├── read_feishu_url.ts
│   │   ├── save_to_new_doc.ts
│   │   └── search_local_kb.ts
│   └── types/            # TypeScript types
├── admin/                 # React frontend (Vite SPA)
│   └── src/
│       ├── App.tsx
│       ├── pages/        # Dashboard, KnowledgeBase, Login, Models, Settings, MCPAuth
│       ├── components/   # Layout, Nav, ProtectedRoute
│       └── stores/       # Zustand stores (useAuthStore, useConfigStore)
├── data/                  # Local storage (.lance, .db files)
├── tests/                 # Test suite (562 tests)
│   ├── core/, routers/, services/, tools/
│   ├── e2e/, security/, performance/, exception/
├── docs/                  # Documentation
│   ├── ai_feishu-PRD-正式版.md
│   ├── ai_feishu-技术栈选型.md
│   ├── ai_feishu-核心点记录.md
│   └── sprints/           # Sprint planning docs
└── scripts/               # Utility scripts
```

## Build Commands

```bash
npm run dev              # tsx watch src/index.ts (development with hot reload)
npm run build             # tsc && vite build (type check + build)
npm run start             # node dist/index.js (production)
npm run test              # vitest (all tests)
npm run lint              # eslint src --ext .ts
npm run typecheck         # tsc --noEmit
npm run init-db           # tsx scripts/init-db.ts
npm run reset-demo        # bash scripts/reset-local-demo.sh
npm run test:performance  # vitest run tests/performance
```

Single test file: `npx vitest run tests/routers/admin.test.ts`

## Key Architecture Patterns

**Hono Router-Based Architecture**:
- Routes organized in `/src/routers/` - admin, admin-kb, admin-mcp, callback
- Each router is a Hono instance mounted onto the main app
- Backend API prefix: `/api/admin`

**Dual Storage**:
- **LanceDB** (`src/core/vector-store.ts`): Document embeddings for RAG
- **SQLite** (`src/core/config-store.ts`): Models, sessions, KB folders, system config

**Message Flow**:
1. Feishu sends events via `POST /feishu` (callback router)
2. `CallbackRouter.onMessage()` parses and emits to handlers
3. Card actions handled via `onCardAction()`
4. Responses sent via SSE streaming

**Admin API Authentication**:
- Header: `Authorization: Bearer <token>` or `X-Admin-API-Key`
- Session tokens expire after 24 hours

## Core Tools (MCP)

1. `read_feishu_url` - Read Feishu document content
2. `search_local_kb` - Search local knowledge base
3. `save_to_new_doc` - Save content to new Feishu document

## Documentation

All documentation is in `/docs`:
- `ai_feishu-PRD-正式版.md` - Comprehensive PRD
- `ai_feishu-技术栈选型.md` - Technology stack rationale
- `ai_feishu-核心点记录.md` - Core implementation decisions
- `sprints/` - Sprint planning documents (Sprint-01 through Sprint-08-6)

## Environment Variables

See `.env.example` for required variables:
- `ADMIN_API_KEY` - Admin UI login key
- `ENCRYPTION_KEY` - 64-char hex for encryption
- `FEISHU_APP_ID`, `FEISHU_APP_SECRET` - Feishu bot credentials

## Key Design Decisions

- **WebSocket over HTTP**: Feishu bot uses persistent connection via `@larksuiteoapi/node-sdk`
- **Thread-based conversations**: Each conversation thread locks to a specific LLM
- **Append-only documents**: AI can only create new docs, never modify existing ones
