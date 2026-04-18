#!/bin/bash
# =============================================================================
# Feishu Message Simulator
# =============================================================================
# AI_Feishu - Simulates Feishu message events for testing
#
# Usage:
#   ./scripts/simulate-feishu-message.sh text "你好"
#   ./scripts/simulate-feishu-message.sh card action_id value
#   ./scripts/simulate-feishu-message.sh [--server <url>] [--signature] <type> [args...]
#
# Environment Variables:
#   FEISHU_VERIFICATION_TOKEN - Token for signature generation
#   SERVER_URL                - Target server URL (default: http://localhost:3000)
# =============================================================================

set -e

# Configuration
SERVER_URL="${SERVER_URL:-http://localhost:3000}"
ENDPOINT="/feishu"
VERIFICATION_TOKEN="${FEISHU_VERIFICATION_TOKEN:-}"
USE_SIGNATURE="${USE_SIGNATURE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate UUID v4
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        # Fallback: generate UUID-like string
        printf '%04x%04x-%04x-%04x-%04x-%04x%04x%04x\n' \
            $((RANDOM % 65535)) $((RANDOM % 65535)) \
            $((RANDOM % 65535)) \
            $((RANDOM % 4096 | 16384)) \
            $((RANDOM % 16384 | 32768)) \
            $((RANDOM % 65535)) $((RANDOM % 65535)) $((RANDOM % 65535))
    fi
}

# Generate signature using HMAC-SHA256
# Signature = HMAC-SHA256(timestamp + body, token)
generate_signature() {
    local timestamp=$1
    local body=$2
    local token=$3

    if [ -z "$token" ]; then
        echo ""
        return 1
    fi

    local str="${timestamp}${body}"
    echo -n "$str" | openssl dgst -sha256 -hmac "$token" | awk '{print $2}'
}

# Create timestamp (Unix seconds)
get_timestamp() {
    date +%s
}

# =============================================================================
# Message Builders
# =============================================================================

build_text_message() {
    local text="$1"

    cat <<EOF
{
  "event_id": "$(generate_uuid)",
  "event_type": "im.message.receive_v1",
  "create_time": "$(get_timestamp)",
  "token": "",
  "tenant_key": "test_tenant",
  "app_id": "cli_test",
  "event": {
    "sender": {
      "id": { "open_id": "ou_test_sender" },
      "sender_type": "user"
    },
    "receiver": {
      "id": { "open_id": "ou_test_receiver" }
    },
    "message": {
      "message_id": "$(generate_uuid)",
      "chat_id": "oc_test_chat",
      "chat_type": "p2p",
      "message_type": "text",
      "content": "{\"text\":\"$text\"}",
      "create_time": "$(date +%s)"
    }
  }
}
EOF
}

build_card_action_message() {
    local action_id="$1"
    local value="$2"

    cat <<EOF
{
  "event_id": "$(generate_uuid)",
  "event_type": "im.message.receive_v1",
  "create_time": "$(get_timestamp)",
  "token": "",
  "tenant_key": "test_tenant",
  "app_id": "cli_test",
  "event": {
    "sender": {
      "id": { "open_id": "ou_test_sender" },
      "sender_type": "user"
    },
    "receiver": {
      "id": { "open_id": "ou_test_receiver" }
    },
    "message": {
      "message_id": "$(generate_uuid)",
      "chat_id": "oc_test_chat",
      "chat_type": "p2p",
      "message_type": "interactive",
      "content": "{\"type\":\"card\",\"data\":{\"action_id\":\"$action_id\",\"value\":\"$value\"}}",
      "create_time": "$(date +%s)"
    }
  }
}
EOF
}

# =============================================================================
# Send Request
# =============================================================================

send_message() {
    local message_json="$1"
    local timestamp="$2"
    local signature="$3"

    log_info "Sending request to ${SERVER_URL}${ENDPOINT}"
    log_info "Timestamp: $timestamp"
    if [ -n "$signature" ]; then
        log_info "Signature: $signature"
    fi

    echo ""
    echo "--- Request Body ---"
    echo "$message_json" | jq '.' 2>/dev/null || echo "$message_json"
    echo "--------------------"
    echo ""

    # Build curl command
    local curl_cmd="curl -s -X POST \"${SERVER_URL}${ENDPOINT}\" -H 'Content-Type: application/json'"

    if [ -n "$signature" ]; then
        curl_cmd="$curl_cmd -H 'X-Feishu-Signature: $signature'"
    fi

    curl_cmd="$curl_cmd -d '$message_json'"

    log_info "Executing curl..."
    echo ""

    # Execute and capture response
    local response
    local http_code

    if [ -n "$signature" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "${SERVER_URL}${ENDPOINT}" \
            -H 'Content-Type: application/json' \
            -H "X-Feishu-Signature: $signature" \
            -d "$message_json")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "${SERVER_URL}${ENDPOINT}" \
            -H 'Content-Type: application/json' \
            -d "$message_json")
    fi

    # Split response and HTTP code
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo "--- Response (HTTP $http_code) ---"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo "-----------------------------------"

    if [ "$http_code" = "200" ]; then
        log_success "Message sent successfully!"
        return 0
    else
        log_error "Server returned HTTP $http_code"
        return 1
    fi
}

# =============================================================================
# Main
# =============================================================================

show_usage() {
    cat <<EOF
Usage: $0 [options] <type> [args...]

Types:
  text <message>           Simulate a text message
                           Example: $0 text "你好"

  card <action_id> <value> Simulate a card action callback
                           Example: $0 card submit "user_data"

Options:
  --server <url>           Target server URL (default: http://localhost:3000)
  --signature              Enable signature verification (requires FEISHU_VERIFICATION_TOKEN)
  -h, --help               Show this help message

Environment Variables:
  FEISHU_VERIFICATION_TOKEN  Token used for signature generation
  SERVER_URL                 Target server URL

Examples:
  # Basic text message
  $0 text "Hello, AI!"

  # Card action with signature
  FEISHU_VERIFICATION_TOKEN=your_token $0 --signature card confirm "approve"

  # Custom server
  $0 --server http://192.168.1.100:3000 text "Test"
EOF
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --server)
                SERVER_URL="$2"
                shift 2
                ;;
            --signature)
                USE_SIGNATURE="true"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            text|card)
                MSG_TYPE="$1"
                shift
                break
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Check required arguments
    if [ -z "$MSG_TYPE" ]; then
        log_error "Message type is required"
        show_usage
        exit 1
    fi

    # Build message based on type
    local message_json
    case "$MSG_TYPE" in
        text)
            local text="${1:-}"
            if [ -z "$text" ]; then
                log_error "Text message content is required"
                echo "Usage: $0 text \"your message here\""
                exit 1
            fi
            message_json=$(build_text_message "$text")
            ;;
        card)
            local action_id="${1:-}"
            local value="${2:-}"
            if [ -z "$action_id" ]; then
                log_error "Action ID is required for card messages"
                echo "Usage: $0 card <action_id> [value]"
                exit 1
            fi
            message_json=$(build_card_action_message "$action_id" "$value")
            ;;
        *)
            log_error "Unknown message type: $MSG_TYPE"
            exit 1
            ;;
    esac

    # Generate signature if enabled
    local timestamp=$(get_timestamp)
    local signature=""

    if [ "$USE_SIGNATURE" = "true" ]; then
        if [ -z "$VERIFICATION_TOKEN" ]; then
            log_warn "USE_SIGNATURE=true but FEISHU_VERIFICATION_TOKEN not set - generating without signature"
        else
            signature=$(generate_signature "$timestamp" "$message_json" "$VERIFICATION_TOKEN")
            log_info "Generated signature using FEISHU_VERIFICATION_TOKEN"
        fi
    fi

    # Send the message
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  Feishu Message Simulator${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo "Message Type: $MSG_TYPE"
    echo "Server URL:   ${SERVER_URL}${ENDPOINT}"
    echo "Signature:    $(if [ -n "$signature" ]; then echo "Enabled"; else echo "Disabled"; fi)"

    send_message "$message_json" "$timestamp" "$signature"
}

main "$@"