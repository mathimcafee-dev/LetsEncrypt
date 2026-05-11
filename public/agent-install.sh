#!/usr/bin/env bash
# SSLVault Persistent Agent Installer v1.0
# Usage: curl -fsSL https://www.easysecurity.in/agent-install.sh | sudo bash -s -- --token=TOKEN --server-id=SERVER_ID --user-id=USER_ID --nickname="My Server"
# -------------------------------------------------------------------
set -euo pipefail

AGENT_VERSION="1.0.0"
API_BASE="https://frthcwkntciaakqsppss.supabase.co/functions/v1"
AGENT_URL="https://www.easysecurity.in/sslvault-agent.sh"
INSTALL_BIN="/usr/local/bin/sslvault-agent"
CONF_DIR="/etc/sslvault"
CONF_FILE="$CONF_DIR/agent.conf"
CERT_DIR="/etc/ssl/sslvault"
SERVICE_FILE="/etc/systemd/system/sslvault-agent.service"

# ── Colours ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[SSLVault]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Parse args ───────────────────────────────────────────────────────
AGENT_TOKEN=""
SERVER_ID=""
USER_ID=""
NICKNAME=""

for arg in "$@"; do
  case $arg in
    --token=*)      AGENT_TOKEN="${arg#*=}" ;;
    --server-id=*)  SERVER_ID="${arg#*=}" ;;
    --user-id=*)    USER_ID="${arg#*=}" ;;
    --nickname=*)   NICKNAME="${arg#*=}" ;;
  esac
done

[[ -z "$AGENT_TOKEN" ]] && error "Missing --token. Download this command from your SSLVault dashboard."
[[ -z "$USER_ID" ]]     && error "Missing --user-id."

[[ $EUID -ne 0 ]] && error "Please run with sudo."

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  SSLVault Agent Installer v${AGENT_VERSION}${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Step 1: Detect OS ─────────────────────────────────────────────────
info "Detecting operating system..."
OS_ID=""
OS_VERSION=""
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_ID="$ID"
  OS_VERSION="${VERSION_ID:-}"
fi

case "$OS_ID" in
  ubuntu|debian|linuxmint) PKG_MGR="apt-get" ;;
  centos|rhel|rocky|almalinux) PKG_MGR="yum" ;;
  amzn) PKG_MGR="yum" ;;
  fedora) PKG_MGR="dnf" ;;
  *) warn "Unrecognised OS: $OS_ID. Proceeding anyway..." ; PKG_MGR="apt-get" ;;
esac

OS_FULL="${PRETTY_NAME:-$OS_ID $OS_VERSION}"
ARCH=$(uname -m)
HOSTNAME_VAL=$(hostname -f 2>/dev/null || hostname)
IP_ADDR=$(curl -fsSL --max-time 5 https://api.ipify.org 2>/dev/null || echo "unknown")

success "Detected: $OS_FULL ($ARCH)"

# ── Step 2: Detect web server ─────────────────────────────────────────
info "Detecting web server..."
WEB_SERVER="unknown"

if systemctl is-active --quiet nginx 2>/dev/null; then
  WEB_SERVER="nginx"
elif systemctl is-active --quiet apache2 2>/dev/null; then
  WEB_SERVER="apache2"
elif systemctl is-active --quiet httpd 2>/dev/null; then
  WEB_SERVER="httpd"
elif command -v nginx &>/dev/null; then
  WEB_SERVER="nginx"
elif command -v apache2 &>/dev/null || command -v httpd &>/dev/null; then
  WEB_SERVER="apache2"
fi

success "Web server: $WEB_SERVER"

# ── Step 3: Check dependencies ────────────────────────────────────────
info "Checking dependencies..."
MISSING=()
for cmd in curl python3 openssl; do
  command -v $cmd &>/dev/null || MISSING+=($cmd)
done

if [ ${#MISSING[@]} -gt 0 ]; then
  info "Installing missing packages: ${MISSING[*]}"
  if [ "$PKG_MGR" = "apt-get" ]; then
    apt-get update -qq && apt-get install -y -qq "${MISSING[@]}"
  else
    yum install -y -q "${MISSING[@]}"
  fi
fi
success "Dependencies OK"

# ── Step 4: Download agent daemon script ──────────────────────────────
info "Downloading agent daemon..."
curl -fsSL "$AGENT_URL" -o "$INSTALL_BIN"
chmod 755 "$INSTALL_BIN"
success "Agent installed to $INSTALL_BIN"

# ── Step 5: Create config and cert directories ────────────────────────
info "Creating config directory..."
mkdir -p "$CONF_DIR" "$CERT_DIR"
chmod 700 "$CONF_DIR" "$CERT_DIR"

cat > "$CONF_FILE" << CONF
AGENT_TOKEN=${AGENT_TOKEN}
SERVER_ID=${SERVER_ID}
USER_ID=${USER_ID}
API_BASE=${API_BASE}
CERT_DIR=${CERT_DIR}
POLL_INTERVAL=300
WEB_SERVER=${WEB_SERVER}
AGENT_VERSION=${AGENT_VERSION}
CONF

chmod 600 "$CONF_FILE"

# Write the token to /etc/sslvault/agent.token — this is what the daemon reads
echo -n "$AGENT_TOKEN" > "$CONF_DIR/agent.token"
chmod 600 "$CONF_DIR/agent.token"
success "Config written to $CONF_FILE"

# ── Step 6: Register with SSLVault ───────────────────────────────────
info "Registering with SSLVault..."
NICKNAME_VAL="${NICKNAME:-$HOSTNAME_VAL}"

REG_RESPONSE=$(curl -fsSL -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"register\",
    \"agent_token\": \"$AGENT_TOKEN\",
    \"user_id\": \"$USER_ID\",
    \"server_id\": \"$SERVER_ID\",
    \"nickname\": \"$NICKNAME_VAL\",
    \"os\": \"$OS_FULL\",
    \"web_server\": \"$WEB_SERVER\",
    \"arch\": \"$ARCH\",
    \"agent_version\": \"$AGENT_VERSION\",
    \"ip_address\": \"$IP_ADDR\",
    \"hostname\": \"$HOSTNAME_VAL\"
  }" \
  "$API_BASE/agent-daemon" 2>&1)

if echo "$REG_RESPONSE" | grep -q '"ok":true'; then
  AGENT_ID=$(echo "$REG_RESPONSE" | grep -o '"agent_id":"[^"]*"' | cut -d'"' -f4)
  echo "AGENT_ID=$AGENT_ID" >> "$CONF_FILE"
  success "Registered with SSLVault (ID: $AGENT_ID)"
else
  error "Registration failed: $REG_RESPONSE"
fi

# ── Step 7: Create systemd service ────────────────────────────────────
info "Creating systemd service..."
cat > "$SERVICE_FILE" << SERVICE
[Unit]
Description=SSLVault Certificate Agent
Documentation=https://www.easysecurity.in/knowledge-base
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${INSTALL_BIN} daemon
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sslvault-agent

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable sslvault-agent
systemctl restart sslvault-agent
sleep 2

if systemctl is-active --quiet sslvault-agent; then
  success "Agent service started and enabled"
else
  warn "Service may not have started. Check: journalctl -u sslvault-agent -n 20"
fi

# ── Done ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  ✅  SSLVault Agent Active!${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BOLD}Server:${NC}     $HOSTNAME_VAL"
echo -e "  ${BOLD}OS:${NC}         $OS_FULL"
echo -e "  ${BOLD}Web server:${NC} $WEB_SERVER"
echo -e "  ${BOLD}Agent ID:${NC}   $AGENT_ID"
echo ""
echo -e "  Your dashboard will show this server as ${GREEN}🟢 Agent Active${NC}"
echo -e "  All future cert installs and renewals are fully automatic."
echo ""
echo -e "  ${BOLD}Useful commands:${NC}"
echo -e "    sslvault-agent status      — check agent health"
echo -e "    sslvault-agent uninstall   — remove the agent"
echo -e "    journalctl -u sslvault-agent -f  — view live logs"
echo ""
