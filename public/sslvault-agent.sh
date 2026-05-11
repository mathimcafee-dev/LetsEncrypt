#!/bin/bash
# SSLVault Persistent Agent Daemon v2.1
# Zero-touch certificate renewal for VPS servers.
# Polls SSLVault every 5 minutes for jobs (install, renew, scan).
# On renewal: atomically replaces cert files and reloads web server.

# NOTE: intentionally NOT using set -e so the daemon never dies on a
# single job failure. Each job is isolated — one bad job doesn't stop
# the loop. Errors are logged and reported back to SSLVault.

# ── Config ────────────────────────────────────────────────────────────
DAEMON_API="https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-daemon"
AGENT_TOKEN_FILE="/etc/sslvault/agent.token"
POLL_INTERVAL=300
LOG_FILE="/var/log/sslvault-agent.log"
CERT_BASE="/etc/ssl/sslvault"
VERSION="2.1"

# ── Logging ───────────────────────────────────────────────────────────
log()  { echo "$(date '+%Y-%m-%d %H:%M:%S') [SSLVault] $1" | tee -a "$LOG_FILE"; }
ok()   { echo "$(date '+%Y-%m-%d %H:%M:%S') [OK] $1"       | tee -a "$LOG_FILE"; }
warn() { echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1"     | tee -a "$LOG_FILE"; }
fail() { echo "$(date '+%Y-%m-%d %H:%M:%S') [FAIL] $1"     | tee -a "$LOG_FILE"; }

# ── Read stored token ─────────────────────────────────────────────────
if [ ! -f "$AGENT_TOKEN_FILE" ]; then
  fail "Agent token not found at $AGENT_TOKEN_FILE. Run agent-install.sh first."
  exit 1
fi
AGENT_TOKEN=$(cat "$AGENT_TOKEN_FILE" | tr -d '\n')
if [ -z "$AGENT_TOKEN" ]; then
  fail "Agent token is empty. Re-run agent-install.sh."
  exit 1
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
# Returns 0 on success, 1 on failure.
# Explicit return 0 on each success path so the caller gets a clean exit
# code regardless of which reload command ran last.
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
# For renewals: write to .new staging files, verify key/cert match,
# then atomically rename. The web server never reads a partial pair.
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

    # Verify key matches cert before committing
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

    # Atomic rename
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

# ── Configure web server vhost (first install only) ───────────────────
configure_web_server() {
  local domain="$1"
  local ws="$2"
  local cert_dir="$CERT_BASE/$domain"

  if [ "$ws" = "nginx" ]; then
    local conf
    if [ -d /etc/nginx/sites-available ]; then
      conf="/etc/nginx/sites-available/$domain"
    else
      conf="/etc/nginx/conf.d/$domain.conf"
    fi
    [ -f "$conf" ] && cp "$conf" "$conf.bak"
    cat > "$conf" << NGINX_CONF
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
NGINX_CONF
    if [ -d /etc/nginx/sites-available ] && [ ! -L "/etc/nginx/sites-enabled/$domain" ]; then
      ln -s "$conf" "/etc/nginx/sites-enabled/$domain" 2>/dev/null || true
    fi
    ok "Nginx config written for $domain"

  elif [ "$ws" = "apache2" ] || [ "$ws" = "httpd" ]; then
    local conf
    if [ -d /etc/apache2/sites-available ]; then
      conf="/etc/apache2/sites-available/$domain.conf"
      a2enmod ssl rewrite headers 2>/dev/null || true
    else
      conf="/etc/httpd/conf.d/$domain.conf"
    fi
    [ -f "$conf" ] && cp "$conf" "$conf.bak"
    cat > "$conf" << APACHE_CONF
<VirtualHost *:80>
    ServerName $domain
    Redirect permanent / https://$domain/
</VirtualHost>
<VirtualHost *:443>
    ServerName $domain
    SSLEngine on
    SSLCertificateFile     $cert_dir/fullchain.pem
    SSLCertificateKeyFile  $cert_dir/privkey.pem
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    Header always set Strict-Transport-Security "max-age=63072000"
    DocumentRoot /var/www/html
</VirtualHost>
APACHE_CONF
    [ -d /etc/apache2/sites-available ] && a2ensite "$domain.conf" 2>/dev/null || true
    ok "Apache config written for $domain"
  fi
}

# ── Report job result back to SSLVault ────────────────────────────────
report_result() {
  local job_id="$1"
  local success="$2"   # literal true or false (no quotes in JSON)
  local error_msg="$3"
  local ws="$4"
  local hostname_val
  hostname_val=$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo "unknown")
  # Escape quotes in error message and truncate
  local escaped_error
  escaped_error=$(printf '%s' "$error_msg" | sed 's/"/\\"/g' | head -c 400)

  curl -sf --max-time 15 -X POST "$DAEMON_API" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"job_result\",\"agent_token\":\"$AGENT_TOKEN\",\"job_id\":\"$job_id\",\"success\":$success,\"error_message\":\"$escaped_error\",\"web_server\":\"$ws\",\"hostname\":\"$hostname_val\"}" \
    > /dev/null 2>&1 || warn "Could not report result for job $job_id (will retry on next contact)"
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

    # Only configure vhost on first install, not on renewals
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

    curl -sf --max-time 15 -X POST "$DAEMON_API" \
      -H "Content-Type: application/json" \
      -d "{\"action\":\"job_result\",\"agent_token\":\"$AGENT_TOKEN\",\"job_id\":\"$job_id\",\"success\":true,\"web_server\":\"$ws_detected\",\"scan_result\":$scan_result}" \
      > /dev/null 2>&1 || warn "Could not report scan result for job $job_id"
    ok "Scan job $job_id complete"

  else
    warn "Unknown job type: $job_type — skipping job $job_id"
    report_result "$job_id" "false" "Unknown job type: $job_type" "$ws"
  fi

  return 0
}

# ── Main poll loop ────────────────────────────────────────────────────
# Runs forever. Each iteration is fully isolated — a crash in one job
# never affects subsequent polls.
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

  # Count jobs safely — defaults to 0 if python3 parse fails
  JOB_COUNT=0
  JOB_COUNT=$(printf '%s' "$RESPONSE" | python3 -c \
    "import sys,json
d=json.load(sys.stdin)
print(len(d.get('jobs',[])))" 2>/dev/null) || JOB_COUNT=0

  if [ "$JOB_COUNT" -gt 0 ]; then
    log "$JOB_COUNT job(s) received"

    for i in $(seq 0 $((JOB_COUNT - 1))); do
      # Parse each field individually — if one fails, the others still work
      JOB_ID=""
      JOB_TYPE=""
      DOMAIN=""
      CERT_PEM=""
      KEY_PEM=""

      JOB_ID=$(printf '%s' "$RESPONSE"   | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][$i]['id'])"              2>/dev/null) || true
      JOB_TYPE=$(printf '%s' "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][$i]['job_type'])"        2>/dev/null) || true
      DOMAIN=$(printf '%s' "$RESPONSE"   | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][$i]['domain'])"          2>/dev/null) || true
      CERT_PEM=$(printf '%s' "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][$i].get('cert_pem',''))" 2>/dev/null) || true
      KEY_PEM=$(printf '%s' "$RESPONSE"  | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][$i].get('key_pem',''))"  2>/dev/null) || true

      if [ -n "$JOB_ID" ] && [ -n "$JOB_TYPE" ]; then
        # Run each job in isolation — failure here never kills the loop
        process_job "$JOB_ID" "$JOB_TYPE" "$DOMAIN" "$CERT_PEM" "$KEY_PEM" || \
          warn "process_job returned error for job $JOB_ID — continuing"
      else
        warn "Could not parse job at index $i — skipping"
      fi
    done
  fi

  sleep "$POLL_INTERVAL"
done
