#!/bin/bash
# AI_Feishu 启动脚本

cd /Users/ethanwang/real/study/ai_in_feishu/ai_feishu

export ADMIN_API_KEY=aaddaadd-my-secret-key
export ENCRYPTION_KEY=7679e1da643258a055b382a9b2fcab75598d2c5354188c42ebcd0ca9121425f5
export FEISHU_APP_ID=cli_a950e27b16385cc2
export FEISHU_APP_SECRET=hHqlkrvvkaEntftEpsDPufMgUVm8Xjba

echo "=== AI_Feishu 启动 ==="
echo "PORT: 3000"
echo ""

npm run dev
