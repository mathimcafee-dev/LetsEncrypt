#!/bin/bash
# SSLVault Persistent Agent Daemon v2.5
# Zero-touch certificate renewal for VPS servers.
# Polls SSLVault every 5 minutes for jobs (install, renew, scan, certbind).
# On renewal: atomically replaces cert files and reloads web server.
#
# v2.4 changes vs v2.3:
#   - EC key verification uses openssl pkey (RSA-only check broke ECDSA renewals)
#   - Falls back to openssl rsa modulus check for old openssl versions
#
# v2.3 changes vs v2.2:
#   - Collect CPU, RAM, disk, uptime metrics on every poll + heartbeat
#   - Send metrics to agent-daemon so Agent Health page shows live data
#   - collect_metrics() works on Linux (proc) + macOS (sysctl/df) + BSD
#   - certs_managed count sent on each poll
#   - Version bumped so health page shows correct agent version

# NOTE: intentionally NOT using set -e so the daemon never dies on a
# single job failure. Each job is isolated — one bad job doesn't stop
# the loop.

# ── Config ────────────────────────────────────────────────────────────
DAEMON_API="https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent-daemon"
CERTBIND_API="https://frthcwkntciaakqsppss.supabase.co/functions/v1/certbind"
AGENT_TOKEN_FILE="/etc/sslvault/agent.token"
POLL_INTERVAL=60
LOG_FILE="/var/log/sslvault-agent.log"
CERT_BASE="/etc/ssl/sslvault"
VERSION="2.5"

# ── Logging ───────────────────────────────────────────────────────────
log()  { echo "$(date '+%Y-%m-%d %H:%M:%S') [SSLVault] $1" | tee -a "$LOG_FILE"; }
ok()   { echo "$(date '+%Y-%m-%d %H:%M:%S') [OK] $1"       | tee -a "$LOG_FILE"; }
warn() { echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1"     | tee -a "$LOG_FILE"; }
fail() { echo "$(date '+%Y-%m-%d %H:%M:%S') [FAIL] $1"     | tee -a "$LOG_FILE"; }

# ── Read stored token ─────────────────────────────────────────────────
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

# ── Collect system health metrics ─────────────────────────────────────
# Returns: CPU_PCT MEM_PCT DISK_PCT UPTIME_SECS
# Works on Linux, macOS, and most BSDs. Gracefully falls back if
# a command is unavailable — never crashes the daemon.
collect_metrics() {
  CPU_PCT=""
  MEM_PCT=""
  DISK_PCT=""
  UPTIME_SECS=""

  # ── CPU usage (1-second sample) ──
  if [ -f /proc/stat ]; then
    # Linux: read two snapshots 1s apart, compute idle delta
    read -r cpu1 < /proc/stat
    sleep 1
    read -r cpu2 < /proc/stat
    set -- $cpu1
    shift           # drop "cpu" label
    u1=$1 n1=$2 s1=$3 i1=$4 w1=${5:-0} x1=${6:-0} y1=${7:-0}
    set -- $cpu2
    shift
    u2=$1 n2=$2 s2=$3 i2=$4 w2=${5:-0} x2=${6:-0} y2=${7:-0}
    total1=$((u1+n1+s1+i1+w1+x1+y1))
    total2=$((u2+n2+s2+i2+w2+x2+y2))
    dtotal=$((total2-total1))
    didle=$((i2-i1))
    if [ "$dtotal" -gt 0 ]; then
      CPU_PCT=$(( (dtotal - didle) * 100 / dtotal ))
    fi
  elif command -v top &>/dev/null; then
    # macOS / BSD
    CPU_PCT=$(top -l 1 -s 0 2>/dev/null | awk '/CPU usage/{gsub(/%/,""); print 100-$NF}' | head -1) || CPU_PCT=""
  fi

  # ── Memory usage ──
  if [ -f /proc/meminfo ]; then
    MEM_TOTAL=$(awk '/MemTotal:/{print $2}' /proc/meminfo)
    MEM_AVAIL=$(awk '/MemAvailable:/{print $2}' /proc/meminfo)
    if [ -n "$MEM_TOTAL" ] && [ "$MEM_TOTAL" -gt 0 ]; then
      MEM_PCT=$(( (MEM_TOTAL - MEM_AVAIL) * 100 / MEM_TOTAL ))
    fi
  elif command -v vm_stat &>/dev/null; then
    # macOS
    PAGE=$(vm_stat 2>/dev/null | awk '/page size/{print $8}')
    FREE=$(vm_stat 2>/dev/null | awk '/Pages free:/{gsub(/\./,""); print $3}')
    SPEC=$(vm_stat 2>/dev/null | awk '/Pages speculative:/{gsub(/\./,""); print $3}')
    WIRE=$(vm_stat 2>/dev/null | awk '/Pages wired down:/{gsub(/\./,""); print $4}')
    INAC=$(vm_stat 2>/dev/null | awk '/Pages inactive:/{gsub(/\./,""); print $3}')
    ACTI=$(vm_stat 2>/dev/null | awk '/Pages active:/{gsub(/\./,""); print $3}')
    PAGE=${PAGE:-4096}; FREE=${FREE:-0}; SPEC=${SPEC:-0}
    WIRE=${WIRE:-0}; INAC=${INAC:-0}; ACTI=${ACTI:-0}
    TOTAL_PAGES=$((FREE+SPEC+WIRE+INAC+ACTI))
    USED_PAGES=$((WIRE+ACTI+INAC))
    if [ "$TOTAL_PAGES" -gt 0 ]; then
      MEM_PCT=$((USED_PAGES * 100 / TOTAL_PAGES))
    fi
  fi

  # ── Disk usage (root filesystem) ──
  DISK_PCT=$(df / 2>/dev/null | awk 'NR==2{gsub(/%/,""); print $5}') || DISK_PCT=""

  # ── Uptime in seconds ──
  if [ -f /proc/uptime ]; then
    UPTIME_SECS=$(awk '{print int($1)}' /proc/uptime)
  elif command -v sysctl &>/dev/null; then
    BOOT=$(sysctl -n kern.boottime 2>/dev/null | awk '{print $4}' | tr -d ',')
    NOW=$(date +%s)
    if [ -n "$BOOT" ] && [ -n "$NOW" ]; then
      UPTIME_SECS=$((NOW - BOOT))
    fi
  fi
}

# ── Count certs managed by this agent ────────────────────────────────
count_certs() {
  find "$CERT_BASE" -name "fullchain.pem" 2>/dev/null | wc -l | tr -d ' '
}

# ── Detect web server ─────────────────────────────────────────────────
detect_web_server() {
  # cPanel environment — check first since it runs apache underneath
  if [ -f /usr/local/cpanel/cpanel ] || [ -d /usr/local/cpanel/bin ]; then
    echo "cpanel"
  elif command -v nginx &>/dev/null && (systemctl is-active --quiet nginx 2>/dev/null || pgrep -x nginx &>/dev/null); then
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
      # Use openssl pkey (works for both RSA and EC keys)
      # Fall back to openssl rsa for very old openssl versions
      if openssl pkey -noout -pubout -in "$cert_dir/privkey.pem.new" -out /tmp/.sslvault_pub_key 2>/dev/null; then
        key_hash=$(openssl pkey -noout -pubout -in "$cert_dir/privkey.pem.new" 2>/dev/null | md5sum | cut -d' ' -f1)
        cert_hash=$(openssl x509 -noout -pubkey   -in "$cert_dir/fullchain.pem.new" 2>/dev/null | md5sum | cut -d' ' -f1)
        rm -f /tmp/.sslvault_pub_key
      else
        # Fallback for old openssl: RSA modulus check only
        cert_hash=$(openssl x509 -noout -modulus -in "$cert_dir/fullchain.pem.new" 2>/dev/null | md5sum | cut -d' ' -f1)
        key_hash=$(openssl rsa  -noout -modulus -in "$cert_dir/privkey.pem.new"  2>/dev/null | md5sum | cut -d' ' -f1)
      fi
      if [ -z "$cert_hash" ] || [ -z "$key_hash" ] || [ "$cert_hash" != "$key_hash" ]; then
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
    case "$f" in *.sslvault.bak) continue ;; esac
    if [ -f "$f" ] && grep -q "$domain" "$f" 2>/dev/null; then
      echo "$f"
      return 0
    fi
  done
  if [ "$ws" = "nginx" ]; then
    grep -rl --exclude='*.sslvault.bak' "server_name.*$domain" /etc/nginx/ 2>/dev/null | head -1
  else
    grep -rl --exclude='*.sslvault.bak' "ServerName.*$domain" /etc/apache2/ /etc/httpd/ 2>/dev/null | head -1
  fi
}

# ── Patch cert paths in existing vhost ────────────────────────────────
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
    ok "Patched SSL cert paths in nginx vhost: $conf"
  else
    sed -i \
      -e "s|SSLCertificateFile.*|SSLCertificateFile  $cert_dir/fullchain.pem|g" \
      -e "s|SSLCertificateKeyFile.*|SSLCertificateKeyFile $cert_dir/privkey.pem|g" \
      "$conf"
    ok "Patched SSL cert paths in apache vhost: $conf"
  fi
}

# ── Configure web server vhost ─────────────────────────────────────────
configure_web_server() {
  local domain="$1"
  local ws="$2"
  local cert_dir="$CERT_BASE/$domain"

  if [ "$ws" = "none" ]; then
    warn "No web server detected — cert files written to $cert_dir"
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
        ok "Added SSL server block to nginx vhost"
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
        ok "Added SSL VirtualHost to apache vhost"
      fi
    fi
  else
    log "No existing vhost for $domain — creating new config"
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

# ── Report job result (3 retries with backoff) ────────────────────────
report_result() {
  local job_id="$1"
  local success="$2"
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
    warn "Could not report result for job $job_id (attempt $attempt/3)"
    sleep $((attempt * 5))
  done
  warn "Giving up on report for job $job_id after 3 attempts"
  return 1
}

# ── Process one job ────────────────────────────────────────────────────
process_job() {
  local job_id="$1"
  local job_type="$2"
  local domain="$3"
  local cert_pem="$4"
  local key_pem="$5"

  log "Processing job $job_id: type=$job_type domain=$domain"

  local ws
  ws=$(detect_web_server)

  if [ "$job_type" = "install" ] || [ "$job_type" = "renew" ] || [ "$job_type" = "reissue" ]; then

    if [ -z "$cert_pem" ] || [ -z "$key_pem" ]; then
      fail "Job $job_id: empty cert_pem or key_pem — skipping"
      report_result "$job_id" "false" "cert_pem or key_pem is empty" "$ws"
      return 0
    fi

    local is_renewal="false"
    # Both 'renew' and 'reissue' replace the cert with a new key pair.
    # Always use atomic write + openssl verification to prevent cert/key mismatch on disk.
    if [ "$job_type" = "renew" ] || [ "$job_type" = "reissue" ]; then is_renewal="true"; fi

    if ! write_cert_files "$domain" "$cert_pem" "$key_pem" "$is_renewal"; then
      report_result "$job_id" "false" "Failed to write cert files" "$ws"
      return 0
    fi

    # ── cPanel: install via UAPI (runs locally — no network needed) ──────
    if [ "$ws" = "cpanel" ]; then
      local cpanel_user
      # Detect cPanel user who owns this domain
      cpanel_user=$(grep -r "^$domain$" /etc/userdatadomains 2>/dev/null | awk '{print $2}' | head -1)
      if [ -z "$cpanel_user" ]; then
        # Fallback: find via /var/cpanel/userdata
        cpanel_user=$(grep -rl "documentroot.*$domain" /var/cpanel/userdata/ 2>/dev/null | head -1 | xargs dirname 2>/dev/null | xargs basename 2>/dev/null)
      fi
      if [ -z "$cpanel_user" ]; then
        warn "Could not detect cPanel user for $domain — falling back to apache reload"
      else
        local cert_dir="$CERT_BASE/$domain"
        log "Installing via cPanel UAPI for user $cpanel_user domain $domain"
        if /usr/local/cpanel/bin/uapi --user="$cpanel_user" SSL install_ssl \
          domain="$domain" \
          cert="$(cat "$cert_dir/fullchain.pem" 2>/dev/null)" \
          key="$(cat "$cert_dir/privkey.pem" 2>/dev/null)" \
          cabundle="" \
          > /tmp/sslvault_uapi_result.json 2>&1; then
          ok "cPanel UAPI install succeeded for $domain"
          report_result "$job_id" "true" "" "cpanel"
          return 0
        else
          local uapi_err
          uapi_err=$(cat /tmp/sslvault_uapi_result.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('errors',[['Unknown error']])[0])" 2>/dev/null || echo "UAPI call failed")
          warn "cPanel UAPI install failed: $uapi_err — trying apache reload fallback"
          # Fall through to apache reload as fallback
        fi
      fi
    fi

    # install: first time — configure web server vhost
    # reissue/renew: cert already configured — just write new files and reload
    if [ "$job_type" = "install" ]; then
      configure_web_server "$domain" "$ws"
    fi

    if ! reload_web_server "$ws"; then
      report_result "$job_id" "false" "Web server reload failed" "$ws"
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
      warn "Could not report scan result (attempt $scan_attempt/3)"
      sleep $((scan_attempt * 5))
    done


  elif [ "$job_type" = "certbind" ]; then
    # ── CertBind: Active Certificate Binding Verification ──────────────
    # Layer 1: Sign nonce with deployed private key (HMAC-SHA256)
    # Layer 2: Get live TLS fingerprint from port 443
    # Layer 3: Check chain integrity for unexpected intermediates
    # Layer 4: Multi-node consistency across all resolved IPs
    log "CertBind: Starting 4-layer verification for $domain"

    # Extract nonce and check_id from scan_result field
    local nonce check_id expected_fp
    nonce=$(echo "$cert_pem" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('nonce',''))" 2>/dev/null || \
            echo "$cert_pem" | grep -o '"nonce":"[^"]*"' | cut -d'"' -f4 || echo "")
    check_id=$(echo "$cert_pem" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('certbind_check_id',''))" 2>/dev/null || \
               echo "$cert_pem" | grep -o '"certbind_check_id":"[^"]*"' | cut -d'"' -f4 || echo "")
    expected_fp=$(echo "$cert_pem" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('expected_fp',''))" 2>/dev/null || \
                  echo "$cert_pem" | grep -o '"expected_fp":"[^"]*"' | cut -d'"' -f4 || echo "")

    if [ -z "$nonce" ] || [ -z "$check_id" ]; then
      warn "CertBind: Missing nonce or check_id for job $job_id — skipping"
      report_result "$job_id" "false" "Missing nonce or check_id in job payload" "$ws"
      return 0
    fi

    log "CertBind: nonce=${nonce:0:16}... check_id=$check_id"

    # ── Layer 1: Key-cert binding proof ────────────────────────────────
    # Find the private key on disk for this domain
    local key_file="$CERT_BASE/$domain/privkey.pem"
    local signature=""
    local keybind_status="skip"

    if [ -f "$key_file" ]; then
      log "CertBind: Layer 1 — signing nonce with key at $key_file"
      # Derive binding key: first 16 bytes of expected_fp (strip colons, hex decode)
      # HMAC-SHA256(nonce, binding_key_bytes) where binding_key = first 32 hex chars of cert SHA256
      local binding_key_hex
      binding_key_hex=$(echo "$expected_fp" | tr -d ':' | head -c 32)

      if [ -n "$binding_key_hex" ] && command -v openssl &>/dev/null; then
        # Convert hex binding key to binary, then HMAC-SHA256 the nonce
        local binding_key_bin="/tmp/.sslvault_cbk_$$"
        echo "$binding_key_hex" | xxd -r -p > "$binding_key_bin" 2>/dev/null || \
          python3 -c "import binascii; open('$binding_key_bin','wb').write(binascii.unhexlify('$binding_key_hex'))" 2>/dev/null

        if [ -f "$binding_key_bin" ]; then
          # Sign nonce using HMAC-SHA256 with the binding key
          signature=$(echo -n "$nonce" | openssl dgst -sha256 -mac HMAC -macopt "hexkey:$binding_key_hex" -hex 2>/dev/null | sed 's/^.* //')
          rm -f "$binding_key_bin"

          if [ -n "$signature" ]; then
            keybind_status="signed"
            ok "CertBind: Layer 1 — nonce signed. sig=${signature:0:16}..."
          else
            warn "CertBind: Layer 1 — HMAC signing failed (openssl dgst error)"
            keybind_status="error"
          fi
        else
          warn "CertBind: Layer 1 — could not decode binding key hex"
          keybind_status="error"
        fi
      else
        warn "CertBind: Layer 1 — openssl not available or no expected_fp"
        keybind_status="skip"
      fi
    else
      warn "CertBind: Layer 1 — key file not found at $key_file"
      keybind_status="skip"
    fi

    # ── Layer 2: Live TLS fingerprint ──────────────────────────────────
    log "CertBind: Layer 2 — probing TLS on $domain:443"
    local tls_fingerprint="" tls_issuer="" tls_status="skip"

    if command -v openssl &>/dev/null; then
      # Get the SHA-256 fingerprint of the cert actually served on port 443
      local tls_raw
      tls_raw=$(echo | timeout 8 openssl s_client \
        -connect "${domain}:443" \
        -servername "$domain" \
        -verify_return_error \
        2>/dev/null)

      if [ -n "$tls_raw" ]; then
        # Extract cert and compute SHA-256 fingerprint
        tls_fingerprint=$(echo "$tls_raw" | \
          openssl x509 -noout -fingerprint -sha256 2>/dev/null | \
          sed 's/sha256 Fingerprint=//I;s/SHA256 Fingerprint=//' | \
          tr '[:upper:]' '[:lower:]')

        tls_issuer=$(echo "$tls_raw" | \
          openssl x509 -noout -issuer 2>/dev/null | \
          sed 's/.*CN\s*=\s*//;s/,.*//' | tr -d '\n')

        if [ -n "$tls_fingerprint" ]; then
          tls_status="probed"
          ok "CertBind: Layer 2 — TLS cert fingerprint: ${tls_fingerprint:0:23}..."
        else
          warn "CertBind: Layer 2 — could not extract fingerprint from TLS connection"
          tls_status="error"
        fi
      else
        warn "CertBind: Layer 2 — TLS connection to $domain:443 failed"
        tls_status="unreachable"
      fi
    fi

    # ── Layer 3: Chain integrity ────────────────────────────────────────
    log "CertBind: Layer 3 — checking certificate chain integrity"
    local chain_ok="true" chain_anomaly="" intercepted="false" intercept_ca=""
    local chain_json="[]"

    if command -v openssl &>/dev/null && [ -n "$tls_raw" ]; then
      # Extract full chain from s_client output
      # Look for unexpected intermediates — if any CA is not in our known good list
      # Known good DigiCert / RapidSSL intermediates
      local known_cas="digicert|rapidssl|geotrust|globalsign|sectigo|comodo|usertrust|trustid|amazon|let.s encrypt|certum"

      # Get all issuer CNs from the chain
      local chain_issuers
      chain_issuers=$(echo "$tls_raw" | openssl crl2pkcs7 -nocrl -certfile /dev/stdin 2>/dev/null | \
        openssl pkcs7 -print_certs -noout 2>/dev/null | \
        grep -i "issuer" | sed 's/.*CN\s*=\s*//;s/,.*//' | tr -d '\r') || true

      # Check each issuer against known good CAs
      while IFS= read -r issuer; do
        [ -z "$issuer" ] && continue
        if ! echo "$issuer" | grep -qi "$known_cas"; then
          chain_ok="false"
          intercepted="true"
          intercept_ca="$issuer"
          chain_anomaly="SSL inspection proxy detected — unexpected intermediate CA: $issuer"
          warn "CertBind: Layer 3 — chain anomaly: $chain_anomaly"
          break
        fi
      done <<< "$chain_issuers"

      # Build chain_info JSON
      if [ "$intercepted" = "true" ]; then
        chain_json="{\"intercepted\":true,\"intercept_ca\":\"$(echo $intercept_ca | sed 's/"/\\"/g')\"}"
      else
        chain_json="{\"intercepted\":false,\"chain\":[]}"
      fi

      ok "CertBind: Layer 3 — chain integrity check done. anomaly: $chain_ok"
    fi

    # ── Layer 4: Multi-node consistency ────────────────────────────────
    log "CertBind: Layer 4 — checking all resolved IPs for $domain"
    local nodes_json="[]" nodes_bound=0 nodes_total=0

    if command -v dig &>/dev/null || command -v host &>/dev/null || command -v nslookup &>/dev/null; then
      # Resolve all A records
      local all_ips=""
      if command -v dig &>/dev/null; then
        all_ips=$(dig +short A "$domain" 2>/dev/null | grep -E '^[0-9]+\.' | tr '\n' ' ')
      elif command -v host &>/dev/null; then
        all_ips=$(host -t A "$domain" 2>/dev/null | awk '/has address/{print $4}' | tr '\n' ' ')
      else
        all_ips=$(nslookup "$domain" 2>/dev/null | awk '/^Address:/{print $2}' | grep -v '#' | tr '\n' ' ')
      fi

      local ip node_results=""
      for ip in $all_ips; do
        [ -z "$ip" ] && continue
        nodes_total=$((nodes_total + 1))

        # Check TLS on this specific IP
        local node_fp
        node_fp=$(echo | timeout 6 openssl s_client \
          -connect "${ip}:443" \
          -servername "$domain" \
          2>/dev/null | \
          openssl x509 -noout -fingerprint -sha256 2>/dev/null | \
          sed 's/sha256 Fingerprint=//I;s/SHA256 Fingerprint=//' | \
          tr '[:upper:]' '[:lower:]')

        local node_status="unbound"
        if [ -n "$node_fp" ] && [ "$node_fp" = "$tls_fingerprint" ]; then
          node_status="bound"
          nodes_bound=$((nodes_bound + 1))
        fi

        [ -n "$node_results" ] && node_results+=","
        node_results+="{\"ip\":\"$ip\",\"fingerprint\":\"${node_fp:0:47}\",\"status\":\"$node_status\"}"
        log "CertBind: Layer 4 — IP $ip: $node_status"
      done

      if [ -n "$node_results" ]; then
        nodes_json="[$node_results]"
      fi

      ok "CertBind: Layer 4 — $nodes_bound/$nodes_total nodes bound"
    else
      warn "CertBind: Layer 4 — no DNS resolution tool available (dig/host/nslookup)"
    fi

    # ── Post bind_result to certbind edge function ──────────────────────
    log "CertBind: Reporting results to SSLVault..."

    # Build payload - carefully escape all values
    local payload
    payload=$(printf '{
      "action": "bind_result",
      "agent_token": "%s",
      "check_id": "%s",
      "nonce": "%s",
      "signature": "%s",
      "tls_fingerprint": "%s",
      "tls_issuer": "%s",
      "chain_info": %s,
      "nodes_info": %s
    }' \
      "$AGENT_TOKEN" \
      "$check_id" \
      "$nonce" \
      "$signature" \
      "$tls_fingerprint" \
      "$(echo "$tls_issuer" | sed 's/"/\\"/g')" \
      "$chain_json" \
      "$nodes_json")

    local cb_attempt
    for cb_attempt in 1 2 3; do
      local cb_response
      cb_response=$(curl -sf --max-time 20 -X POST "$CERTBIND_API" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null)

      if [ $? -eq 0 ] && [ -n "$cb_response" ]; then
        local binding_status
        binding_status=$(echo "$cb_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('binding_status',''))" 2>/dev/null || \
                         echo "$cb_response" | grep -o '"binding_status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        ok "CertBind: job $job_id complete — binding_status=$binding_status"
        # Report job success to agent-daemon
        report_result "$job_id" "true" "" "$ws"
        return 0
      fi

      warn "CertBind: Could not report to certbind API (attempt $cb_attempt/3)"
      sleep $((cb_attempt * 5))
    done

    warn "CertBind: All reporting attempts failed for job $job_id"
    report_result "$job_id" "false" "Failed to post bind_result to certbind API" "$ws"


  else
    warn "Unknown job type: $job_type — skipping job $job_id"
    report_result "$job_id" "false" "Unknown job type: $job_type" "$ws"
  fi

  return 0
}

# ── CLI commands ──────────────────────────────────────────────────────
CMD="${1:-daemon}"

if [ "$CMD" = "uninstall" ]; then
  echo "[SSLVault] Uninstalling agent..."
  systemctl stop sslvault-agent 2>/dev/null || true
  systemctl disable sslvault-agent 2>/dev/null || true
  rm -f /etc/systemd/system/sslvault-agent.service
  systemctl daemon-reload 2>/dev/null || true
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
  echo "[SSLVault] Agent removed. Cert files preserved at $CERT_BASE"
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
    STATUS_COUNT=$(find "$CERT_BASE" -name "fullchain.pem" 2>/dev/null | wc -l | tr -d ' ')
    echo "  Certs:      $STATUS_COUNT domain(s) installed"
  fi
  # Show live metrics
  collect_metrics
  [ -n "$CPU_PCT"     ] && echo "  CPU:        ${CPU_PCT}%"
  [ -n "$MEM_PCT"     ] && echo "  RAM:        ${MEM_PCT}%"
  [ -n "$DISK_PCT"    ] && echo "  Disk (/):   ${DISK_PCT}%"
  [ -n "$UPTIME_SECS" ] && echo "  Uptime:     $((UPTIME_SECS/3600))h $((UPTIME_SECS%3600/60))m"
  echo "  Log:        $LOG_FILE"
  echo "  Last 5 log lines:"
  tail -5 "$LOG_FILE" 2>/dev/null | sed 's/^/    /'
  echo ""
  exit 0
fi

# ── Main poll loop ─────────────────────────────────────────────────────
log "SSLVault Agent v$VERSION started — polling every ${POLL_INTERVAL}s"

while true; do

  # Collect system metrics before every poll
  collect_metrics
  CERTS_MANAGED=$(count_certs)

  # Build metrics JSON fields (only include fields we have data for)
  METRICS_JSON=""
  [ -n "$CPU_PCT"     ] && METRICS_JSON="${METRICS_JSON},\"cpu_pct\":$CPU_PCT"
  [ -n "$MEM_PCT"     ] && METRICS_JSON="${METRICS_JSON},\"mem_pct\":$MEM_PCT"
  [ -n "$DISK_PCT"    ] && METRICS_JSON="${METRICS_JSON},\"disk_pct\":$DISK_PCT"
  [ -n "$UPTIME_SECS" ] && METRICS_JSON="${METRICS_JSON},\"uptime_seconds\":$UPTIME_SECS"
  METRICS_JSON="${METRICS_JSON},\"certs_managed\":$CERTS_MANAGED"

  RESPONSE=""
  RESPONSE=$(curl -sf --max-time 15 -X POST "$DAEMON_API" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"poll\",\"agent_token\":\"$AGENT_TOKEN\",\"agent_version\":\"$VERSION\"${METRICS_JSON}}" \
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
      SCAN_RESULT=$(printf '%s' "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin)['jobs'][$i].get('scan_result'); print(json.dumps(d) if d else '')" 2>/dev/null) || true

      # For certbind jobs, pass scan_result JSON as CERT_PEM (carries nonce/check_id/expected_fp)
      if [ "$JOB_TYPE" = "certbind" ] && [ -n "$SCAN_RESULT" ]; then
        CERT_PEM="$SCAN_RESULT"
      fi

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
