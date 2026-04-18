#!/bin/bash
# AI_Feishu 启动脚本 — 始终在脚本所在目录（项目根）运行
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Demo defaults (override in .env or shell: export ADMIN_API_KEY=...)
export ADMIN_API_KEY="${ADMIN_API_KEY:-demo-admin-login}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef}"
export FEISHU_APP_ID=cli_a950e27b16385cc2
export FEISHU_APP_SECRET=hHqlkrvvkaEntftEpsDPufMgUVm8Xjba

echo "=== AI_Feishu 启动 (WebSocket 模式) ==="
echo "PORT: 3000"
echo "Admin 登录 API Key（与 ADMIN_API_KEY 相同）: ${ADMIN_API_KEY}"
echo "若模型解密失败，可先: npm run reset-demo"
echo ""

npx tsx watch src/app.ts
