# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI_Feishu is a **Feishu (Lark) native AI knowledge base** application - currently in planning/design phase (no source code written yet). It will be a lightweight, locally-deployed AI assistant that integrates with Feishu for multi-LLM chat and RAG-powered knowledge retrieval.

## Technology Stack (Planned)

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (LTS v20+) |
| Backend Framework | Hono.js |
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui |
| State Management | Zustand |
| LLM Routing | Vercel AI SDK |
| Feishu SDK | @larksuiteoapi/node-sdk |
| Vector DB | LanceDB (embedded, file-based) |
| Config DB | SQLite3 (better-sqlite3) |
| Desktop Wrapper | Tauri 2.0 |
| Text Processing | LangChain.js TextSplitters |
| MCP Integration | Feishu MCP Server |

## Architecture Constraints

- **B/S architecture**: Local Web App, desktop via Tauri in Phase 2
- **No external DB processes**: Postgres, Redis, Milvus are banned
- **No serverless**: Must maintain WebSocket long connection with Feishu
- **Data privacy**: All data stays local, never leaves user's machine
- **Embedded databases only**: LanceDB (vector) + SQLite (config)

## Core Modules (Planned)

1. **Local Web Admin** - Configuration panel for API keys, model selection, KB folder binding, status monitoring
2. **IM Native Interaction** - Feishu bot with interactive cards, thread-based sessions, streaming responses
3. **Tool Calling & Feishu API** - Three core tools: `read_feishu_url`, `search_local_kb`, `save_to_new_doc`
4. **Local RAG Pipeline** - Document ingestion, chunking, embedding, LanceDB storage
5. **MCP Integration** - Connect to Feishu official MCP Server

## Directory Structure (Planned)

```
ai_feishu/
├── src/
│   ├── index.ts          # Entry point
│   ├── app.ts            # Hono app setup
│   ├── core/             # Core engine modules
│   ├── routers/          # API routes
│   ├── services/         # Business logic
│   ├── tools/            # Tool definitions
│   ├── feishu/           # Feishu integration
│   └── types/            # TypeScript types
├── admin/                # React frontend
├── data/                 # Local data storage (.lance, .db)
├── scripts/              # Utility scripts
└── tests/                # Test files
```

## Sprint Phases

| Sprint | Focus |
|--------|-------|
| Sprint 01 | Infrastructure - project scaffolding, SQLite + LanceDB init, Feishu bot setup |
| Sprint 02 | Feishu Message Channel - WebSocket connection, message receiving/sending |
| Sprint 03 | Model Routing & Chat - Vercel AI SDK integration, multi-LLM support |
| Sprint 04 | MCP Integration - Feishu MCP Server connection |
| Sprint 05 | RAG Pipeline - document ingestion, chunking, embedding |
| Sprint 06 | Tool Calling Integration - AI reading/writing Feishu docs |
| Sprint 07 | Admin Console - React dashboard |
| Sprint 08 | Integration Testing & Optimization |

## Key Design Decisions

- **WebSocket over HTTP**: Feishu bot uses persistent connection via `@larksuiteoapi/node-sdk`
- **Thread-based conversations**: Each conversation thread locks to a specific LLM
- **Append-only documents**: AI can only create new docs, never modify existing ones
- **No web chat UI in Phase 1**: Only Feishu IM interaction to keep MVP lightweight

## Documentation

All documentation is in `/docs`:
- `ai_feishu-PRD-正式版.md` - Comprehensive PRD
- `ai_feishu-技术栈选型.md` - Technology stack rationale
- `ai_feishu-核心点记录.md` - Core implementation decisions
- `sprints/` - Sprint planning documents

## Build Commands (Planned)

```bash
npm run dev     # tsx watch src/index.ts
npm run build   # tsc && vite build
npm run start   # node dist/index.js
npm test        # vitest
npm run lint    # eslint src --ext .ts
```

## Status

**No source code exists yet** - this repository contains only PRD and planning documents. When implementation begins, start with Sprint 01 infrastructure setup.
