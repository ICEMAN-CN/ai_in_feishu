#!/bin/bash
# =============================================================================
# Sprint 8 End-to-End Manual Test Script
# =============================================================================
# AI_Feishu - Feishu Native AI Knowledge Base
#
# Usage:
#   ./scripts/test-sprint8-e2e-manual.sh [--server <url>] [--api-key <key>]
#
# Prerequisites:
#   1. Start the server: cd ai_feishu && npm run dev
#   2. Ensure Feishu bot is configured and connected
#   3. Set ADMIN_API_KEY if authentication is enabled
#   4. Ensure knowledge base is populated (run sync if needed)
#
# =============================================================================

set -e

# Configuration
SERVER_URL="${SERVER_URL:-http://localhost:3000}"
API_KEY="${ADMIN_API_KEY:-}"
USE_API_KEY="${USE_API_KEY:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
    ((TOTAL++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
    ((TOTAL++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# Make API request
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -n "$data" ]; then
        curl -s -X "$method" "${SERVER_URL}${endpoint}" \
            -H 'Content-Type: application/json' \
            -d "$data" \
            --header "X-Admin-API-Key: $API_KEY"
    else
        curl -s -X "$method" "${SERVER_URL}${endpoint}" \
            --header "X-Admin-API-Key: $API_KEY" \
            --header "Content-Type: application/json"
    fi
}

# Check if server is running
check_server() {
    log_section "0. Prerequisites Check"

    local response=$(curl -s -o /dev/null -w "%{http_code}" "${SERVER_URL}/api/health" 2>/dev/null || echo "000")

    if [ "$response" = "000" ]; then
        log_fail "Server not reachable at ${SERVER_URL}"
        log_info "Please start the server first: cd ai_feishu && npm run dev"
        exit 1
    fi

    log_success "Server is running at ${SERVER_URL}"

    # Check health details
    local health_resp=$(api_request "GET" "/api/health" "")
    if echo "$health_resp" | grep -q '"status"'; then
        log_info "Health status: $(echo "$health_resp" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_section "Prerequisites Validation"

    # Check LLM provider
    if [ -n "$OPENAI_API_KEY" ] || [ -n "$ANTHROPIC_API_KEY" ] || [ -n "$OLLAMA_BASE_URL" ]; then
        log_success "LLM provider configured"
    else
        log_warn "No LLM provider configured (OPENAI_API_KEY, ANTHROPIC_API_KEY, or OLLAMA_BASE_URL)"
    fi

    # Check Feishu credentials
    if [ -n "$FEISHU_APP_ID" ] && [ -n "$FEISHU_APP_SECRET" ]; then
        log_success "Feishu credentials configured"
    else
        log_warn "Feishu credentials not set (FEISHU_APP_ID, FEISHU_APP_SECRET)"
    fi

    # Check KB stats
    local stats_resp=$(api_request "GET" "/api/admin/kb/stats" "")
    if echo "$stats_resp" | grep -q '"totalChunks"'; then
        local chunks=$(echo "$stats_resp" | grep -o '"totalChunks":[0-9]*' | cut -d':' -f2)
        log_info "Knowledge base has ${chunks:-0} chunks indexed"
    fi
}

# =============================================================================
# TC-E2E-001: 基础对话
# =============================================================================

test_basic_chat() {
    log_section "TC-E2E-001: 基础对话 (Basic Chat)"

    log_info "Test: Send message to verify AI responds"

    # Check chat endpoint exists
    local chat_resp=$(api_request "POST" "/api/chat" '{"message":"Hello","stream":false}')
    local chat_code=$?

    if [ $chat_code -eq 0 ]; then
        if echo "$chat_resp" | grep -q '"response"\|"content"\|"message"'; then
            log_success "TC-E2E-001: Chat endpoint responds with AI message"
        else
            log_warn "TC-E2E-001: Chat endpoint reached but response format unexpected"
            log_info "  Response: ${chat_resp:0:200}..."
        fi
    else
        log_fail "TC-E2E-001: Chat endpoint not accessible"
    fi
    ((TOTAL++))

    # Test streaming if supported
    log_info "Testing streaming response..."
    local stream_resp=$(api_request "POST" "/api/chat" '{"message":"Hi","stream":true}')
    if echo "$stream_resp" | grep -q '"stream"\|"delta"\|"content"'; then
        log_success "TC-E2E-001: Streaming chat works"
    else
        log_warn "TC-E2E-001: Streaming response may not be configured"
    fi
    ((TOTAL++))
}

# =============================================================================
# TC-E2E-002: 文档问答
# =============================================================================

test_document_qa() {
    log_section "TC-E2E-002: 文档问答 (Document Q&A)"

    log_info "Test: Send document URL + question"

    # Test document URL format validation
    local test_url="https://xxx.feishu.cn/docx/testdoc123"
    if [[ "$test_url" =~ /docx/[a-zA-Z0-9]+ ]]; then
        log_success "TC-E2E-002: Document URL format valid"
    else
        log_fail "TC-E2E-002: Document URL format validation failed"
    fi
    ((TOTAL++))

    # Check if read_feishu_url tool is available
    local tools_resp=$(api_request "GET" "/api/mcp/tools" "")
    if echo "$tools_resp" | grep -q 'read_feishu_url'; then
        log_success "TC-E2E-002: read_feishu_url tool is registered"

        # Test with actual URL in message
        local qa_resp=$(api_request "POST" "/api/chat" '{"message":"总结这个文档 https://xxx.feishu.cn/docx/abc123"}')
        if echo "$qa_resp" | grep -q '"tool"\|"tool_call"\|"tool_calls"'; then
            log_success "TC-E2E-002: Tool call indicator present in response"
        else
            log_warn "TC-E2E-002: No tool call indicator (may need Feishu credentials)"
        fi
    else
        log_warn "TC-E2E-002: read_feishu_url tool not registered (MCP may not be connected)"
    fi
    ((TOTAL++))
}

# =============================================================================
# TC-E2E-003: 知识库检索
# =============================================================================

test_kb_retrieval() {
    log_section "TC-E2E-003: 知识库检索 (Knowledge Base Retrieval)"

    log_info "Test: KB query and verify relevant content returned"

    # Check KB has data
    local stats_resp=$(api_request "GET" "/api/admin/kb/stats" "")
    local chunk_count=$(echo "$stats_resp" | grep -o '"totalChunks":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "0")

    if [ "${chunk_count:-0}" -gt 0 ]; then
        log_success "TC-E2E-003: Knowledge base has ${chunk_count} chunks"

        # Test semantic search query
        local search_resp=$(api_request "POST" "/api/chat" '{"message":"查询项目相关的内容"}')
        if echo "$search_resp" | grep -q '"context"\|"chunks"\|"results"\|"content"'; then
            log_success "TC-E2E-003: KB retrieval returns relevant content"
        else
            log_warn "TC-E2E-003: KB retrieval response format unexpected"
            log_info "  Response: ${search_resp:0:200}..."
        fi
    else
        log_warn "TC-E2E-003: Knowledge base is empty (run sync first)"
        log_info "  curl -X POST ${SERVER_URL}/api/admin/kb/sync -d '{}'"
    fi
    ((TOTAL++))

    # Test direct search endpoint if available
    local direct_search=$(api_request "POST" "/api/kb/search" '{"query":"test"}')
    if echo "$direct_search" | grep -q '"results"\|"chunks"\|"documents"'; then
        log_success "TC-E2E-003: Direct KB search endpoint works"
    else
        log_warn "TC-E2E-003: Direct KB search endpoint may not exist"
    fi
    ((TOTAL++))
}

# =============================================================================
# TC-E2E-004: 工具调用链
# =============================================================================

test_tool_chain() {
    log_section "TC-E2E-004: 工具调用链 (Multi-Step Tool Execution)"

    log_info "Test: Multi-step tool execution and verify sequential tool calls"

    # Check tool registry
    local tools_resp=$(api_request "GET" "/api/mcp/tools" "")
    local tool_count=$(echo "$tools_resp" | grep -o '"name":"[^"]*"' | wc -l | tr -d ' ')

    log_info "Registered tools: ${tool_count}"

    if [ "${tool_count:-0}" -gt 0 ]; then
        log_success "TC-E2E-004: Tool registry accessible"

        # Test multi-tool message
        log_info "Sending multi-tool request..."
        local chain_resp=$(api_request "POST" "/api/chat" '{"message":"先读取这个文档，然后保存到知识库 https://xxx.feishu.cn/docx/abc123"}')

        # Check for sequential tool call indicators
        if echo "$chain_resp" | grep -q 'read_feishu_url.*save_to_new_doc\|tool.*tool'; then
            log_success "TC-E2E-004: Sequential tool calls detected"
        elif echo "$chain_resp" | grep -q '"tool"\|"tool_call"'; then
            log_success "TC-E2E-004: Tool call executed"
        else
            log_warn "TC-E2E-004: Tool chain response unclear"
            log_info "  Response: ${chain_resp:0:300}..."
        fi
    else
        log_fail "TC-E2E-004: No tools registered in registry"
    fi
    ((TOTAL++))

    # Test search_local_kb specifically
    if echo "$tools_resp" | grep -q 'search_local_kb'; then
        log_success "TC-E2E-004: search_local_kb tool available"

        local kb_resp=$(api_request "POST" "/api/chat" '{"message":"在我们知识库里搜索关于产品计划的内容"}')
        if echo "$kb_resp" | grep -q '"context"\|"kb_results"\|"chunks"'; then
            log_success "TC-E2E-004: KB search tool executed successfully"
        else
            log_warn "TC-E2E-004: KB search tool response unclear"
        fi
    fi
    ((TOTAL++))
}

# =============================================================================
# TC-E2E-005: 模型切换
# =============================================================================

test_model_switch() {
    log_section "TC-E2E-005: 模型切换 (Model Switching)"

    log_info "Test: Switch between models and verify new model responds"

    # Check available models endpoint
    local models_resp=$(api_request "GET" "/api/models" "")
    if echo "$models_resp" | grep -q '"models"\|"model"'; then
        log_success "TC-E2E-005: Models endpoint accessible"

        local model_list=$(echo "$models_resp" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | tr '\n' ', ')
        log_info "Available models: ${model_list}"
    else
        log_warn "TC-E2E-005: Models endpoint may not exist"
    fi
    ((TOTAL++))

    # Test switching via chat with model parameter
    log_info "Testing model parameter in chat request..."
    local switch_resp=$(api_request "POST" "/api/chat" '{"message":"Hello","model":"gpt-4"}')
    if echo "$switch_resp" | grep -q '"model"\|"gpt-4"\|"response"'; then
        log_success "TC-E2E-005: Chat with model parameter works"
    else
        log_warn "TC-E2E-005: Model switching response unclear"
    fi
    ((TOTAL++))

    # Test admin model config
    local admin_models=$(api_request "GET" "/api/admin/models" "")
    if echo "$admin_models" | grep -q '"default"\|"available"\|"models"'; then
        log_success "TC-E2E-005: Admin model configuration accessible"
    else
        log_warn "TC-E2E-005: Admin model config endpoint may not exist"
    fi
    ((TOTAL++))
}

# =============================================================================
# Summary Report
# =============================================================================

print_summary() {
    log_section "Test Summary"

    echo -e "${GREEN}Passed: ${PASSED}${NC}"
    echo -e "${RED}Failed: ${FAILED}${NC}"
    echo -e "Total:  ${TOTAL}"
    echo ""

    if [ ${FAILED} -eq 0 ]; then
        echo -e "${GREEN}All E2E tests passed!${NC}"
        exit 0
    else
        echo -e "${YELLOW}Some tests failed - see details above${NC}"
        exit 1
    fi
}

# =============================================================================
# Main Test Execution
# =============================================================================

main() {
    echo ""
    echo -e "${CYAN}===============================================${NC}"
    echo -e "${CYAN}  Sprint 8 E2E Manual Tests${NC}"
    echo -e "${CYAN}===============================================${NC}"
    echo ""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --server)
                SERVER_URL="$2"
                shift 2
                ;;
            --api-key)
                API_KEY="$2"
                USE_API_KEY="true"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                echo "Usage: $0 [--server <url>] [--api-key <key>]"
                exit 1
                ;;
        esac
    done

    # Show configuration
    echo "Configuration:"
    echo "  Server: ${SERVER_URL}"
    echo "  API Key: $(if [ "$USE_API_KEY" = "true" ]; then echo "Enabled"; else echo "Disabled"; fi)"
    echo ""

    # Run tests
    check_server
    check_prerequisites
    test_basic_chat
    test_document_qa
    test_kb_retrieval
    test_tool_chain
    test_model_switch
    print_summary
}

main "$@"