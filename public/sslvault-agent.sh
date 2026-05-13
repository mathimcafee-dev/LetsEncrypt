#!/bin/bash
# SSLVault Persistent Agent Daemon v2.2
# Zero-touch certificate renewal for VPS servers.
# Polls SSLVault every 5 minutes for jobs (install, renew, scan).
# On renewal: atomically replaces cert files and reloads web server.
#
# v2.2 fixes vs v2.1:
#   - Removed bash "local" usage outside functions (was a fatal error in
#     `uninstall` and `status` CLI commands — uninstall failed before
#     deregistering, leaving phantom rows in the SSLVault DB)
#   - report_result now retries 3x with backoff before giving up. Previously
#     a single transient network blip could leave a job stuck in 'claimed'
#     forever even though the install succeeded
#   - find_vhost_file skips its own .sslvault.bak files and node_modules dirs
#     so backup files don't get re-discovered as the active vhost
#   - Skip the new-vhost path if the domain already has cert files but no
#     web server (avoids overwriting user-managed configs)

# NOTE: intentionally NOT using set -e so the daemon never dies on a
# single job failure. Each job is isolated — one bad job doesn't stop
# the loop. Errors are logged and reported back to SSLVault.

# ── Config ────────────────────────────────────────────────────────────
DAEMON_API="https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-daemon"
AGENT_TOKEN_FILE="/etc/sslvault/agent.token"
POLL_INTERVAL=300
LOG_FILE="/var/log/sslvault-agent.log"
CERT_BASE="/etc/ssl/sslvault"
VERSION="2.2"

# ── Logging ───────────────────────────────────────────────────────────
log()  { echo "$(date '+%Y-%m-%d %H:%M:%S') [SSLVault] $1" | tee -a "$LOG_FILE"; }
ok()   { echo "$(date '+%Y-%m-%d %H:%M:%S') [OK] $1"       | tee -a "$LOG_FILE"; }
warn() { echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1"     | tee -a "$LOG_FILE"; }
fail() { echo "$(date '+%Y-%m-%d %H:%M:%S') [FAIL] $1"     | tee -a "$LOG_FILE"; }

# ── Read stored token ─────────────────────────────────────────────────
# Token is only required for the daemon loop. Uninstall command reads
# it on its own further down so we can handle the missing-file case.
if [ "${1:-daemon}" = "daemon" ]; then
  if [ ! -f "$AGENT_TOKEN_FILE" ]; then
    fail "Agent token not found at $AGENT_TOKEN_FILE. Run agent-install.sh first."
    exit 1
  fi
  AGENT_TOKEN=$(cat "$AGENT_TOKEN_FILE" | tr -d '\n')
  if [ -z "$AGENT_TOKEN" ]; then
    fail "Agent token is empty. Re-run agent-install.sh."
    exit 1
  fi
fi

# ── Detect web server ─────────────────────────────────────────────────
detect_web_server() {
  if command -v nginx &>/dev/null && (systemctl is-active --quiet nginx 2>/dev/null || pgrep -x nginx &>/dev/null); then
    echo "nginx"
  elif systemctl is-active --quiet apache2 2>/dev/null; then
    echo "apache2"
  elif systemctl is-active --quiet httpd 2>/dev/null; then
    echo "httpd"
  elif command -v nginx &>/dev/null; then
    echo "nginx"
  else
    echo "none"
  fi
}

# ── Reload web server ─────────────────────────────────────────────────
reload_web_server() {
  local ws="$1"
  case "$ws" in
    nginx)
      if nginx -t 2>/dev/null; then
        systemctl reload nginx 2>/dev/null || \
          service nginx reload 2>/dev/null || \
          nginx -s reload 2>/dev/null || true
        ok "nginx reloaded"
        return 0
      else
        fail "nginx config test failed"
        return 1
      fi
      ;;
    apache2)
      if apache2ctl -t 2>/dev/null || apachectl -t 2>/dev/null; then
        systemctl reload apache2 2>/dev/null || \
          service apache2 reload 2>/dev/null || true
        ok "apache2 reloaded"
        return 0
      else
        fail "apache2 config test failed"
        return 1
      fi
      ;;
    httpd)
      if apachectl -t 2>/dev/null; then
        systemctl reload httpd 2>/dev/null || \
          service httpd reload 2>/dev/null || true
        ok "httpd reloaded"
        return 0
      else
        fail "httpd config test failed"
        return 1
      fi
      ;;
    none)
      warn "No web server detected — cert files written, reload manually"
      return 0
      ;;
    *)
      warn "Unknown web server '$ws' — cert written, reload manually"
      return 0
      ;;
  esac
}

# ── Write cert files (atomic for renewals) ────────────────────────────
write_cert_files() {
  local domain="$1"
  local cert_pem="$2"
  local key_pem="$3"
  local is_renewal="${4:-false}"

  local cert_dir="$CERT_BASE/$domain"
  mkdir -p "$cert_dir" && chmod 755 "$cert_dir"

  if [ "$is_renewal" = "true" ]; then
    printf '%s\n' "$cert_pem" > "$cert_dir/fullchain.pem.new"
    printf '%s\n' "$key_pem"  > "$cert_dir/privkey.pem.new"
    chmod 644 "$cert_dir/fullchain.pem.new"
    chmod 600 "$cert_dir/privkey.pem.new"

    if command -v openssl &>/dev/null; then
      local cert_hash key_hash
      cert_hash=$(openssl x509 -noout -modulus -in "$cert_dir/fullchain.pem.new" 2>/dev/null | md5sum | cut -d' ' -f1)
      key_hash=$(openssl rsa  -noout -modulus -in "$cert_dir/privkey.pem.new"  2>/dev/null | md5sum | cut -d' ' -f1)
      if [ -z "$cert_hash" ] || [ "$cert_hash" != "$key_hash" ]; then
        rm -f "$cert_dir/fullchain.pem.new" "$cert_dir/privkey.pem.new"
        fail "Key/cert mismatch for $domain — renewal aborted, old cert preserved"
        return 1
      fi
      ok "Key/cert pair verified for $domain"
    fi

    mv "$cert_dir/fullchain.pem.new" "$cert_dir/fullchain.pem"
    mv "$cert_dir/privkey.pem.new"  "$cert_dir/privkey.pem"
    ok "Cert files atomically updated for $domain"
  else
    printf '%s\n' "$cert_pem" > "$cert_dir/fullchain.pem"
    printf '%s\n' "$key_pem"  > "$cert_dir/privkey.pem"
    chmod 644 "$cert_dir/fullchain.pem"
    chmod 600 "$cert_dir/privkey.pem"
    ok "Cert files written for $domain"
  fi
  return 0
}

# ── Find existing vhost file for a domain ─────────────────────────────
# v2.2: skips .sslvault.bak files so old backups aren't selected as the
# active config (would cause patches to land in a backup instead of live).
find_vhost_file() {
  local domain="$1"
  local ws="$2"
  local candidates=()
  if [ "$ws" = "nginx" ]; then
    candidates=(
      "/etc/nginx/sites-available/$domain"
      "/etc/nginx/sites-enabled/$domain"
      "/etc/nginx/conf.d/$domain.conf"
      "/etc/nginx/conf.d/default.conf"
      "/etc/nginx/sites-available/default"
    )
  else
    candidates=(
      "/etc/apache2/sites-available/$domain.conf"
      "/etc/apache2/sites-enabled/$domain.conf"
      "/etc/httpd/conf.d/$domain.conf"
      "/etc/httpd/conf.d/ssl.conf"
    )
  fi
  for f in "${candidates[@]}"; do
    # Skip our own backup files
    case "$f" in *.sslvault.bak) continue ;; esac
    if [ -f "$f" ] && grep -q "$domain" "$f" 2>/dev/null; then
      echo "$f"
      return 0
    fi
  done
  # Broader search as fallback — exclude our backups
  if [ "$ws" = "nginx" ]; then
    grep -rl --exclude='*.sslvault.bak' "server_name.*$domain" /etc/nginx/ 2>/dev/null | head -1
  else
    grep -rl --exclude='*.sslvault.bak' "ServerName.*$domain" /etc/apache2/ /etc/httpd/ 2>/dev/null | head -1
  fi
}

# ── Patch cert paths in an existing vhost ─────────────────────────────
patch_cert_paths() {
  local conf="$1"
  local ws="$2"
  local cert_dir="$3"
  cp "$conf" "$conf.sslvault.bak" 2>/dev/null || true
  if [ "$ws" = "nginx" ]; then
    sed -i \
      -e "s|ssl_certificate[^_].*|ssl_certificate     $cert_dir/fullchain.pem;|g" \
      -e "s|ssl_certificate_key.*|ssl_certificate_key $cert_dir/privkey.pem;|g" \
      "$conf"
    ok "Patched SSL cert paths in existing nginx vhost: $conf"
  else
    sed -i \
      -e "s|SSLCertificateFile.*|SSLCertificateFile  $cert_dir/fullchain.pem|g" \
      -e "s|SSLCertificateKeyFile.*|SSLCertificateKeyFile $cert_dir/privkey.pem|g" \
      "$conf"
    ok "Patched SSL cert paths in existing apache vhost: $conf"
  fi
}

# ── Configure web server vhost ─────────────────────────────────────────
configure_web_server() {
  local domain="$1"
  local ws="$2"
  local cert_dir="$CERT_BASE/$domain"

  if [ "$ws" = "none" ]; then
    warn "No web server detected — cert files written to $cert_dir. Configure your server to use them."
    return 0
  fi

  local existing_conf
  existing_conf=$(find_vhost_file "$domain" "$ws")

  if [ -n "$existing_conf" ]; then
    local has_ssl=false
    if [ "$ws" = "nginx" ] && grep -q "ssl_certificate" "$existing_conf" 2>/dev/null; then
      has_ssl=true
    elif ( [ "$ws" = "apache2" ] || [ "$ws" = "httpd" ] ) && grep -q "SSLCertificateFile" "$existing_conf" 2>/dev/null; then
      has_ssl=true
    fi

    if [ "$has_ssl" = "true" ]; then
      patch_cert_paths "$existing_conf" "$ws" "$cert_dir"
    else
      warn "Existing vhost found but no SSL config. Adding SSL block."
      if [ "$ws" = "nginx" ]; then
        cat >> "$existing_conf" << NGINX_SSL

# SSLVault — added $(date '+%Y-%m-%d')
server {
    listen 443 ssl http2;
    server_name $domain;
    ssl_certificate     $cert_dir/fullchain.pem;
    ssl_certificate_key $cert_dir/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
}
NGINX_SSL
        ok "Added SSL server block to existing nginx vhost"
      else
        cat >> "$existing_conf" << APACHE_SSL

# SSLVault — added $(date '+%Y-%m-%d')
<VirtualHost *:443>
    ServerName $domain
    SSLEngine on
    SSLCertificateFile  $cert_dir/fullchain.pem
    SSLCertificateKeyFile $cert_dir/privkey.pem
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
</VirtualHost>
APACHE_SSL
        ok "Added SSL VirtualHost to existing apache vhost"
      fi
    fi
  else
    log "No existing vhost found for $domain — creating new config"
    if [ "$ws" = "nginx" ]; then
      local conf
      if [ -d /etc/nginx/sites-available ]; then
        conf="/etc/nginx/sites-available/$domain"
      else
        conf="/etc/nginx/conf.d/$domain.conf"
      fi
      cat > "$conf" << NGINX_NEW
# SSLVault — created $(date '+%Y-%m-%d')
server {
    listen 80;
    server_name $domain;
    return 301 https://\$host\$request_uri;
}
server {
    listen 443 ssl http2;
    server_name $domain;
    ssl_certificate     $cert_dir/fullchain.pem;
    ssl_certificate_key $cert_dir/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    add_header Strict-Transport-Security "max-age=63072000" always;
    root /var/www/html;
    index index.html index.htm;
    location / { try_files \$uri \$uri/ =404; }
}
NGINX_NEW
      if [ -d /etc/nginx/sites-available ] && [ ! -L "/etc/nginx/sites-enabled/$domain" ]; then
        ln -s "$conf" "/etc/nginx/sites-enabled/$domain" 2>/dev/null || true
      fi
      ok "New nginx vhost created: $conf"
    elif [ "$ws" = "apache2" ] || [ "$ws" = "httpd" ]; then
      local conf
      if [ -d /etc/apache2/sites-available ]; then
        conf="/etc/apache2/sites-available/$domain.conf"
        a2enmod ssl rewrite headers 2>/dev/null || true
      else
        conf="/etc/httpd/conf.d/$domain.conf"
      fi
      cat > "$conf" << APACHE_NEW
# SSLVault — created $(date '+%Y-%m-%d')
<VirtualHost *:80>
    ServerName $domain
    Redirect permanent / https://$domain/
</VirtualHost>
<VirtualHost *:443>
    ServerName $domain
    SSLEngine on
    SSLCertificateFile  $cert_dir/fullchain.pem
    SSLCertificateKeyFile $cert_dir/privkey.pem
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    Header always set Strict-Transport-Security "max-age=63072000"
    DocumentRoot /var/www/html
</VirtualHost>
APACHE_NEW
      [ -d /etc/apache2/sites-available ] && a2ensite "$domain.conf" 2>/dev/null || true
      ok "New apache vhost created: $conf"
    fi
  fi
}

# ── Report job result back to SSLVault ────────────────────────────────
# v2.2: retries up to 3 times with backoff. A failed report previously
# meant the job sat in 'claimed' forever — even if the install succeeded.
report_result() {
  local job_id="$1"
  local success="$2"   # literal true or false (no quotes in JSON)
  local error_msg="$3"
  local ws="$4"
  local hostname_val
  hostname_val=$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo "unknown")
  local escaped_error
  escaped_error=$(printf '%s' "$error_msg" | tr -d '\n\r' | sed 's/"/\\"/g' | head -c 400)

  local attempt
  for attempt in 1 2 3; do
    if curl -sf --max-time 15 -X POST "$DAEMON_API" \
      -H "Content-Type: application/json" \
      -d "{\"action\":\"job_result\",\"agent_token\":\"$AGENT_TOKEN\",\"job_id\":\"$job_id\",\"success\":$success,\"error_message\":\"$escaped_error\",\"web_server\":\"$ws\",\"hostname\":\"$hostname_val\"}" \
      > /dev/null 2>&1; then
      return 0
    fi
    warn "Could not report result for job $job_id (attempt $attempt of 3) — retrying in $((attempt * 5))s"
    sleep $((attempt * 5))
  done
  warn "Giving up on report for job $job_id after 3 attempts — janitor will requeue if needed"
  return 1
}

# ── Process one job (isolated — errors don't kill the daemon) ─────────
process_job() {
  local job_id="$1"
  local job_type="$2"
  local domain="$3"
  local cert_pem="$4"
  local key_pem="$5"

  log "Processing job $job_id: type=$job_type domain=$domain"

  local ws
  ws=$(detect_web_server)

  if [ "$job_type" = "install" ] || [ "$job_type" = "renew" ]; then

    if [ -z "$cert_pem" ] || [ -z "$key_pem" ]; then
      fail "Job $job_id: empty cert_pem or key_pem — skipping"
      report_result "$job_id" "false" "cert_pem or key_pem is empty" "$ws"
      return 0
    fi

    local is_renewal="false"
    [ "$job_type" = "renew" ] && is_renewal="true"

    if ! write_cert_files "$domain" "$cert_pem" "$key_pem" "$is_renewal"; then
      report_result "$job_id" "false" "Failed to write cert files" "$ws"
      return 0
    fi

    if [ "$job_type" = "install" ]; then
      configure_web_server "$domain" "$ws"
    fi

    if ! reload_web_server "$ws"; then
      report_result "$job_id" "false" "Web server reload failed — cert files are updated but reload unsuccessful" "$ws"
      return 0
    fi

    ok "Job $job_id complete: $job_type for $domain"
    report_result "$job_id" "true" "" "$ws"

  elif [ "$job_type" = "scan" ]; then
    log "Running certificate scan..."
    local ws_detected
    ws_detected=$(detect_web_server)
    local scan_result='{"domains":['
    local first=true

    if command -v openssl &>/dev/null && [ -d "$CERT_BASE" ]; then
      for cert_file in "$CERT_BASE"/*/fullchain.pem; do
        [ -f "$cert_file" ] || continue
        local d expiry issuer days_left expiry_epoch now_epoch
        d=$(basename "$(dirname "$cert_file")")
        expiry=$(openssl x509 -noout -enddate -in "$cert_file" 2>/dev/null | cut -d= -f2 || echo "")
        issuer=$(openssl x509 -noout -issuer  -in "$cert_file" 2>/dev/null | sed 's/.*CN=//;s/,.*//' || echo "")
        if [ -n "$expiry" ]; then
          expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -jf "%b %d %T %Y %Z" "$expiry" +%s 2>/dev/null || echo 0)
          now_epoch=$(date +%s)
          days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
          [ "$first" = "true" ] || scan_result+=","
          scan_result+="{\"domain\":\"$d\",\"cert_path\":\"$cert_file\",\"key_path\":\"$CERT_BASE/$d/privkey.pem\",\"cert_expiry\":\"$expiry\",\"cert_issuer\":\"$issuer\",\"days_left\":$days_left,\"web_server\":\"$ws_detected\"}"
          first=false
        fi
      done
    fi
    scan_result+="]}"

    local scan_attempt
    for scan_attempt in 1 2 3; do
      if curl -sf --max-time 15 -X POST "$DAEMON_API" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"job_result\",\"agent_token\":\"$AGENT_TOKEN\",\"job_id\":\"$job_id\",\"success\":true,\"web_server\":\"$ws_detected\",\"scan_result\":$scan_result}" \
        > /dev/null 2>&1; then
        ok "Scan job $job_id complete"
        return 0
      fi
      warn "Could not report scan result for job $job_id (attempt $scan_attempt of 3)"
      sleep $((scan_attempt * 5))
    done

  else
    warn "Unknown job type: $job_type — skipping job $job_id"
    report_result "$job_id" "false" "Unknown job type: $job_type" "$ws"
  fi

  return 0
}

# ── CLI commands (uninstall / status) ────────────────────────────────
CMD="${1:-daemon}"

if [ "$CMD" = "uninstall" ]; then
  echo "[SSLVault] Uninstalling agent..."
  systemctl stop sslvault-agent 2>/dev/null || true
  systemctl disable sslvault-agent 2>/dev/null || true
  rm -f /etc/systemd/system/sslvault-agent.service
  systemctl daemon-reload 2>/dev/null || true
  # Deregister from SSLVault API (BUG 20 fix: was `local tok` which is a
  # bash error outside a function and aborted the entire uninstall.
  # Now uses a plain variable so the deregister call actually fires.)
  if [ -f "$AGENT_TOKEN_FILE" ]; then
    UNINSTALL_TOK=$(cat "$AGENT_TOKEN_FILE" | tr -d '\n')
    if [ -n "$UNINSTALL_TOK" ]; then
      curl -sf --max-time 10 -X POST "$DAEMON_API" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"deregister_by_token\",\"agent_token\":\"$UNINSTALL_TOK\"}" > /dev/null 2>&1 || true
      echo "[SSLVault] Deregistered from SSLVault."
    fi
  fi
  rm -rf /etc/sslvault
  rm -f /usr/local/bin/sslvault-agent
  echo "[SSLVault] Agent removed. Cert files preserved at $CERT_BASE (delete manually if needed)."
  exit 0
fi

if [ "$CMD" = "status" ]; then
  echo ""
  echo "═══════════════════════════════════════"
  echo "  SSLVault Agent v$VERSION"
  echo "═══════════════════════════════════════"
  if systemctl is-active --quiet sslvault-agent 2>/dev/null; then
    echo "  Service:    ● running"
  else
    echo "  Service:    ○ stopped"
  fi
  echo "  Token:      $([ -f "$AGENT_TOKEN_FILE" ] && echo 'present' || echo 'MISSING')"
  echo "  Web server: $(detect_web_server)"
  echo "  Cert dir:   $CERT_BASE"
  if [ -d "$CERT_BASE" ]; then
    # BUG 20 fix: was `local count`. Now plain variable.
    STATUS_COUNT=$(find "$CERT_BASE" -name "fullchain.pem" 2>/dev/null | wc -l | tr -d ' ')
    echo "  Certs:      $STATUS_COUNT domain(s) installed"
  fi
  echo "  Log:        $LOG_FILE"
  echo "  Last 5 log lines:"
  tail -5 "$LOG_FILE" 2>/dev/null | sed 's/^/    /'
  echo ""
  exit 0
fi

# ── Main poll loop ────────────────────────────────────────────────────
log "SSLVault Agent v$VERSION started — polling every ${POLL_INTERVAL}s"

while true; do
  RESPONSE=""
  RESPONSE=$(curl -sf --max-time 15 -X POST "$DAEMON_API" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"poll\",\"agent_token\":\"$AGENT_TOKEN\",\"agent_version\":\"$VERSION\"}" \
    2>/dev/null) || {
      warn "Poll request failed — will retry in ${POLL_INTERVAL}s"
      sleep "$POLL_INTERVAL"
      continue
    }

  JOB_COUNT=0
  JOB_COUNT=$(printf '%s' "$RESPONSE" | python3 -c \
    "import sys,json
d=json.load(sys.stdin)
print(len(d.get('jobs',[])))" 2>/dev/null) || JOB_COUNT=0

  if [ "$JOB_COUNT" -gt 0 ]; then
    log "$JOB_COUNT job(s) received"

    for i in $(seq 0 $((JOB_COUNT - 1))); do
      JOB_ID=""
      JOB_TYPE=""
      DOMAIN=""
      CERT_PEM=""
      KEY_PEM=""

      JOB_ID=$(printf '%s' "$RESPONSE"   | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][$i]['id'])"              2>/dev/null) || true
      JOB_TYPE=$(printf '%s' "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][$i]['job_type'])"        2>/dev/null) || true
      DOMAIN=$(printf '%s' "$RESPONSE"   | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][$i]['domain'])"          2>/dev/null) || true
      CERT_PEM=$(printf '%s' "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][$i].get('cert_pem','') or '')" 2>/dev/null) || true
      KEY_PEM=$(printf '%s' "$RESPONSE"  | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][$i].get('key_pem','') or '')"  2>/dev/null) || true

      if [ -n "$JOB_ID" ] && [ -n "$JOB_TYPE" ]; then
        process_job "$JOB_ID" "$JOB_TYPE" "$DOMAIN" "$CERT_PEM" "$KEY_PEM" || \
          warn "process_job returned error for job $JOB_ID — continuing"
      else
        warn "Could not parse job at index $i — skipping"
      fi
    done
  fi

  sleep "$POLL_INTERVAL"
done
