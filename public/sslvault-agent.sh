#!/usr/bin/env bash
# SSLVault Agent Daemon v1.0
# Installed to /usr/local/bin/sslvault-agent by agent-install.sh
# Commands: daemon | status | uninstall
# -------------------------------------------------------------------
set -euo pipefail

CONF_FILE="/etc/sslvault/agent.conf"
LOG_TAG="sslvault-agent"

# ── Load config ───────────────────────────────────────────────────────
load_config() {
  [ -f "$CONF_FILE" ] || { echo "Config not found: $CONF_FILE"; exit 1; }
  # shellcheck disable=SC1090
  source "$CONF_FILE"
  : "${AGENT_TOKEN:?}" "${API_BASE:?}" "${CERT_DIR:?}"
  POLL_INTERVAL="${POLL_INTERVAL:-300}"
  WEB_SERVER="${WEB_SERVER:-unknown}"
  AGENT_VERSION="${AGENT_VERSION:-1.0.0}"
}

log()  { logger -t "$LOG_TAG" "$1" || echo "[$(date '+%H:%M:%S')] $1"; }
info() { log "INFO  $1"; }
ok()   { log "OK    $1"; }
err()  { log "ERROR $1"; }

# ── API helper ────────────────────────────────────────────────────────
api_post() {
  local endpoint="$1"
  local payload="$2"
  curl -fsSL --max-time 30 \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$API_BASE/$endpoint" 2>/dev/null || echo '{"error":"curl_failed"}'
}

# ── Write certificate files ───────────────────────────────────────────
write_cert() {
  local domain="$1" cert_pem="$2" key_pem="$3"
  local dir="$CERT_DIR/$domain"
  mkdir -p "$dir"
  chmod 750 "$dir"

  printf '%s' "$cert_pem" > "$dir/fullchain.pem"
  printf '%s' "$key_pem"  > "$dir/privkey.pem"
  chmod 644 "$dir/fullchain.pem"
  chmod 600 "$dir/privkey.pem"

  ok "Cert files written to $dir"
}

# ── Update Nginx config ───────────────────────────────────────────────
update_nginx() {
  local domain="$1"
  local cert_path="$CERT_DIR/$domain/fullchain.pem"
  local key_path="$CERT_DIR/$domain/privkey.pem"

  # Find the server config file for this domain
  local conf_file=""
  for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
    [ -f "$f" ] || continue
    grep -q "$domain" "$f" 2>/dev/null && { conf_file="$f"; break; }
  done

  if [ -n "$conf_file" ]; then
    # Backup original
    cp "$conf_file" "${conf_file}.sslvault-bak"

    # Check if SSL directives already exist
    if grep -q "ssl_certificate" "$conf_file"; then
      # Replace existing cert paths
      sed -i "s|ssl_certificate .*|ssl_certificate $cert_path;|g" "$conf_file"
      sed -i "s|ssl_certificate_key .*|ssl_certificate_key $key_path;|g" "$conf_file"
      ok "Updated Nginx SSL paths in $conf_file"
    else
      # Add SSL block — find the server { block and inject after listen 80
      sed -i "/listen 80/a\\    listen 443 ssl;\\n    ssl_certificate $cert_path;\\n    ssl_certificate_key $key_path;\\n    ssl_protocols TLSv1.2 TLSv1.3;\\n    ssl_ciphers HIGH:!aNULL:!MD5;" "$conf_file"
      ok "Added SSL block to $conf_file"
    fi

    # Test config before reloading
    if nginx -t 2>/dev/null; then
      systemctl reload nginx
      ok "Nginx reloaded"
    else
      # Restore backup
      cp "${conf_file}.sslvault-bak" "$conf_file"
      err "Nginx config test failed — restored backup"
      return 1
    fi
  else
    # No existing config — create a minimal one
    local new_conf="/etc/nginx/conf.d/sslvault-$domain.conf"
    cat > "$new_conf" << NGINX
server {
    listen 80;
    listen 443 ssl;
    server_name $domain www.$domain;

    ssl_certificate     $cert_path;
    ssl_certificate_key $key_path;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Redirect HTTP to HTTPS
    if (\$scheme = http) {
        return 301 https://\$host\$request_uri;
    }

    root /var/www/html;
    index index.html index.php;
    location / { try_files \$uri \$uri/ =404; }
}
NGINX

    if nginx -t 2>/dev/null; then
      systemctl reload nginx
      ok "Created new Nginx config + reloaded"
    else
      rm -f "$new_conf"
      err "New Nginx config test failed"
      return 1
    fi
  fi
}

# ── Update Apache config ──────────────────────────────────────────────
update_apache() {
  local domain="$1"
  local cert_path="$CERT_DIR/$domain/fullchain.pem"
  local key_path="$CERT_DIR/$domain/privkey.pem"
  local apache_cmd="apache2ctl"
  command -v apache2ctl &>/dev/null || apache_cmd="apachectl"

  # Find config file
  local conf_file=""
  for dir in /etc/apache2/sites-enabled /etc/httpd/conf.d; do
    [ -d "$dir" ] || continue
    for f in "$dir"/*; do
      [ -f "$f" ] || continue
      grep -q "$domain" "$f" 2>/dev/null && { conf_file="$f"; break 2; }
    done
  done

  if [ -n "$conf_file" ]; then
    cp "$conf_file" "${conf_file}.sslvault-bak"
    sed -i "s|SSLCertificateFile .*|SSLCertificateFile $cert_path|g" "$conf_file"
    sed -i "s|SSLCertificateKeyFile .*|SSLCertificateKeyFile $key_path|g" "$conf_file"
    ok "Updated Apache SSL paths in $conf_file"
  else
    # Create new vhost config
    local new_conf
    if [ -d /etc/apache2/sites-enabled ]; then
      new_conf="/etc/apache2/sites-available/sslvault-$domain.conf"
      cat > "$new_conf" << APACHE
<VirtualHost *:80>
    ServerName $domain
    Redirect permanent / https://$domain/
</VirtualHost>
<VirtualHost *:443>
    ServerName $domain
    DocumentRoot /var/www/html
    SSLEngine on
    SSLCertificateFile    $cert_path
    SSLCertificateKeyFile $key_path
    SSLProtocol           all -SSLv3 -TLSv1 -TLSv1.1
</VirtualHost>
APACHE
      a2ensite "sslvault-$domain.conf" 2>/dev/null || true
      a2enmod ssl 2>/dev/null || true
    else
      new_conf="/etc/httpd/conf.d/sslvault-$domain.conf"
      cat > "$new_conf" << APACHE
<VirtualHost *:443>
    ServerName $domain
    DocumentRoot /var/www/html
    SSLEngine on
    SSLCertificateFile    $cert_path
    SSLCertificateKeyFile $key_path
</VirtualHost>
APACHE
    fi
    ok "Created new Apache config: $new_conf"
  fi

  if $apache_cmd configtest 2>/dev/null; then
    if systemctl reload apache2 2>/dev/null || systemctl reload httpd 2>/dev/null; then
      ok "Apache reloaded"
    fi
  else
    [ -n "$conf_file" ] && cp "${conf_file}.sslvault-bak" "$conf_file"
    err "Apache config test failed — restored backup"
    return 1
  fi
}

# ── Process a single job ──────────────────────────────────────────────
process_job() {
  local job_id="$1" domain="$2" cert_pem="$3" key_pem="$4"

  info "Processing job $job_id for $domain"

  local success=true error_msg=""

  # Write cert files
  if ! write_cert "$domain" "$cert_pem" "$key_pem"; then
    success=false; error_msg="Failed to write cert files"
  fi

  # Update web server config
  if $success; then
    case "$WEB_SERVER" in
      nginx)
        update_nginx "$domain" || { success=false; error_msg="Nginx config failed"; }
        ;;
      apache2|httpd|apache)
        update_apache "$domain" || { success=false; error_msg="Apache config failed"; }
        ;;
      *)
        info "Unknown web server ($WEB_SERVER) — cert files written, manual config needed"
        ;;
    esac
  fi

  # Report result back to SSLVault
  local success_val="true"
  $success || success_val="false"

  api_post "agent-daemon" "{
    \"action\": \"job_result\",
    \"agent_token\": \"$AGENT_TOKEN\",
    \"job_id\": \"$job_id\",
    \"success\": $success_val,
    \"error_message\": \"$error_msg\",
    \"web_server\": \"$WEB_SERVER\"
  }" > /dev/null

  if $success; then
    ok "Job $job_id completed for $domain"
  else
    err "Job $job_id failed: $error_msg"
  fi
}

# ── Simple JSON field extractor (pure bash, no python/jq required) ───
json_get() {
  local json="$1" key="$2"
  # Extract value for "key":"value" or "key":value patterns
  echo "$json" | grep -o "\"${key}\":[[:space:]]*\"[^\"]*\"" | head -1 | sed 's/.*":\s*"\(.*\)"/\1/'
}

json_get_raw() {
  local json="$1" key="$2"
  echo "$json" | grep -o "\"${key}\":[[:space:]]*[^,}]*" | head -1 | sed 's/.*":\s*//'
}

# ── Main daemon loop ──────────────────────────────────────────────────
run_daemon() {
  info "SSLVault Agent v$AGENT_VERSION starting"
  info "Polling every ${POLL_INTERVAL}s | Web server: $WEB_SERVER"

  while true; do
    RESPONSE=$(api_post "agent-daemon" "{
      \"action\": \"poll\",
      \"agent_token\": \"$AGENT_TOKEN\",
      \"agent_version\": \"$AGENT_VERSION\"
    }")

    if echo "$RESPONSE" | grep -q '"ok":true'; then
      # Check if there are jobs by looking for job id patterns
      if echo "$RESPONSE" | grep -q '"id":"'; then
        info "Jobs found — processing..."

        # Extract jobs array section and process each job
        # Parse jobs by splitting on "JOB_TYPE" boundaries
        echo "$RESPONSE" | grep -o '"id":"[^"]*","job_type":"[^"]*","domain":"[^"]*","cert_pem":"[^"]*","key_pem":"[^"]*"' | \
        while IFS= read -r job_line; do
          JOB_ID=$(echo "$job_line" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
          JOB_DOMAIN=$(echo "$job_line" | grep -o '"domain":"[^"]*"' | cut -d'"' -f4)
          JOB_CERT_RAW=$(echo "$job_line" | grep -o '"cert_pem":"[^"]*"' | sed 's/"cert_pem":"//;s/"$//')
          JOB_KEY_RAW=$(echo "$job_line" | grep -o '"key_pem":"[^"]*"' | sed 's/"key_pem":"//;s/"$//')

          if [ -z "$JOB_ID" ] || [ -z "$JOB_DOMAIN" ]; then continue; fi

          # Unescape \n sequences in PEM data
          JOB_CERT=$(printf '%b' "${JOB_CERT_RAW//\\n/$'\n'}")
          JOB_KEY=$(printf '%b' "${JOB_KEY_RAW//\\n/$'\n'}")

          process_job "$JOB_ID" "$JOB_DOMAIN" "$JOB_CERT" "$JOB_KEY"
        done
      fi
    else
      err "Poll failed — will retry in ${POLL_INTERVAL}s"
    fi

    sleep "$POLL_INTERVAL"
  done
}

# ── Status command ────────────────────────────────────────────────────
show_status() {
  load_config
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  SSLVault Agent Status"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Config:     $CONF_FILE"
  echo "  Cert dir:   $CERT_DIR"
  echo "  Web server: $WEB_SERVER"
  echo "  Version:    $AGENT_VERSION"
  echo "  Poll:       every ${POLL_INTERVAL}s"
  echo ""

  if systemctl is-active --quiet sslvault-agent 2>/dev/null; then
    echo "  Service:    🟢 Active"
    echo "  Uptime:    $(systemctl show sslvault-agent --property=ActiveEnterTimestamp | cut -d= -f2)"
  else
    echo "  Service:    🔴 Inactive"
  fi

  echo ""
  RESPONSE=$(api_post "agent-daemon" "{\"action\":\"heartbeat\",\"agent_token\":\"$AGENT_TOKEN\"}")
  if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "  SSLVault:   🟢 Connected"
  else
    echo "  SSLVault:   🔴 Cannot reach API"
  fi
  echo ""
}

# ── Uninstall command ─────────────────────────────────────────────────
do_uninstall() {
  load_config 2>/dev/null || true
  echo "Uninstalling SSLVault Agent..."

  systemctl stop sslvault-agent 2>/dev/null || true
  systemctl disable sslvault-agent 2>/dev/null || true
  rm -f /etc/systemd/system/sslvault-agent.service
  systemctl daemon-reload 2>/dev/null || true

  # Deregister from SSLVault
  if [ -n "${AGENT_TOKEN:-}" ] && [ -n "${USER_ID:-}" ] && [ -n "${AGENT_ID:-}" ]; then
    api_post "agent-daemon" "{
      \"action\": \"deregister\",
      \"user_id\": \"$USER_ID\",
      \"agent_id\": \"$AGENT_ID\"
    }" > /dev/null
  fi

  rm -f /usr/local/bin/sslvault-agent
  rm -rf /etc/sslvault

  echo "✅ SSLVault Agent uninstalled."
  echo "   Cert files in $CERT_DIR are preserved."
}

# ── Entry point ───────────────────────────────────────────────────────
COMMAND="${1:-daemon}"

case "$COMMAND" in
  daemon)
    load_config
    run_daemon
    ;;
  status)
    load_config
    show_status
    ;;
  uninstall)
    do_uninstall
    ;;
  *)
    echo "Usage: sslvault-agent [daemon|status|uninstall]"
    exit 1
    ;;
esac
