<?php
/**
 * SSLVault PHP Agent v2.0
 * Fully automated SSL installation for cPanel shared hosting.
 * Calls cPanel UAPI directly — no manual steps required.
 *
 * INSTRUCTIONS:
 * 1. Download this pre-configured file from your SSLVault dashboard
 * 2. Upload to your website root (public_html)
 * 3. Visit: https://yourdomain.com/sslvault-agent.php
 * 4. Delete this file after installation
 */

// ── Injected by SSLVault (do not edit) ─────────────────────────────
$SSLVAULT_TOKEN    = '%%TOKEN%%';
$CPANEL_USERNAME   = '%%CPANEL_USERNAME%%';
$CPANEL_API_TOKEN  = '%%CPANEL_API_TOKEN%%';
// ───────────────────────────────────────────────────────────────────

$AGENT_API = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent';

header('Content-Type: text/html; charset=utf-8');

// ── Helpers ─────────────────────────────────────────────────────────

function callSSLVault($url, $data) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($data),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $resp  = curl_exec($ch);
    $err   = curl_error($ch);
    curl_close($ch);
    if ($err) return ['error' => 'SSLVault API connection failed: ' . $err];
    $decoded = json_decode($resp, true);
    return $decoded ?: ['error' => 'Invalid response from SSLVault API'];
}

function callCpanelUAPI($cpanelHost, $cpanelUser, $apiToken, $module, $func, $params = []) {
    $query = http_build_query($params);
    $url   = "https://{$cpanelHost}:2083/execute/{$module}/{$func}" . ($query ? "?{$query}" : '');

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER     => ["Authorization: cpanel {$cpanelUser}:{$apiToken}"],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $resp = curl_exec($ch);
    $err  = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err)       return ['error' => 'cPanel connection failed: ' . $err];
    if ($code == 0) return ['error' => 'No response from cPanel (port 2083 may be blocked by firewall)'];

    $decoded = json_decode($resp, true);
    if (!$decoded)  return ['error' => "cPanel returned non-JSON (HTTP $code). Check username and API token."];
    return $decoded;
}

function installSSLViaCpanel($cpanelHost, $cpanelUser, $apiToken, $domain, $certPem, $keyPem) {
    $result = callCpanelUAPI($cpanelHost, $cpanelUser, $apiToken, 'SSL', 'install_ssl', [
        'domain'   => $domain,
        'cert'     => $certPem,
        'key'      => $keyPem,
        'cabundle' => '',
    ]);

    if (isset($result['error'])) return $result;

    $r      = $result['result'] ?? $result;
    $status = $r['status'] ?? ($r['data']['status'] ?? null);

    if ($status == 1 || $status === true) {
        return ['ok' => true];
    }

    $errors = $r['errors'] ?? $r['messages'] ?? [];
    $msg    = is_array($errors) ? implode('; ', $errors) : (string)$errors;
    return ['error' => $msg ?: 'cPanel install_ssl returned failure with no error message'];
}

function getCpanelHosts() {
    $hosts = [];
    $serverIp = $_SERVER['SERVER_ADDR'] ?? '';
    $httpHost = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? '');
    if ($serverIp && $serverIp !== '127.0.0.1') $hosts[] = $serverIp;
    if ($httpHost) $hosts[] = $httpHost;
    $hosts[] = 'localhost';
    return array_unique($hosts);
}

function updateHtaccess() {
    $htaccess = $_SERVER['DOCUMENT_ROOT'] . '/.htaccess';
    $redirect = "\n# SSLVault Force HTTPS\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n";
    if (file_exists($htaccess)) {
        $content = file_get_contents($htaccess);
        if (strpos($content, 'SSLVault Force HTTPS') !== false) return 'already_set';
        file_put_contents($htaccess, $content . $redirect);
        return 'updated';
    }
    file_put_contents($htaccess, "Options -Indexes\n" . $redirect);
    return 'created';
}

function box($title, $content, $type = 'info') {
    $map = ['info' => ['#dbeafe','#1d4ed8'], 'success' => ['#dcfce7','#16a34a'], 'error' => ['#fee2e2','#dc2626'], 'warn' => ['#fef9c3','#b45309']];
    [$bg, $border] = $map[$type] ?? $map['info'];
    echo "<div style='background:{$bg};border:2px solid {$border};border-radius:10px;padding:16px 20px;margin:12px 0'><strong style='color:{$border}'>$title</strong><br>$content</div>";
}

function stepLine($n, $label, $status, $detail = '') {
    $icon = $status==='ok' ? '✅' : ($status==='warn' ? '⚠️' : ($status==='fail' ? '❌' : '⏳'));
    echo "<div style='display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #e5e7eb;align-items:flex-start'><span style='font-size:18px;flex-shrink:0'>{$icon}</span><div><strong>Step {$n}: {$label}</strong>".($detail?"<br><span style='font-size:13px;color:#6b7280'>".htmlspecialchars($detail)."</span>":'')."</div></div>";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SSLVault Agent — Auto SSL Installer</title>
<style>
* { box-sizing:border-box; margin:0; padding:0 }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f8fafc; color:#1e293b; padding:24px }
.container { max-width:700px; margin:0 auto }
h1 { font-size:24px; font-weight:800; color:#1e293b; margin-bottom:4px }
p { color:#64748b; font-size:14px; margin-bottom:16px }
.card { background:white; border:1px solid #e2e8f0; border-radius:14px; padding:24px; margin-bottom:20px; box-shadow:0 1px 4px rgba(0,0,0,0.06) }
code { background:#f1f5f9; padding:2px 8px; border-radius:5px; font-family:monospace; font-size:13px; word-break:break-all }
.btn { display:inline-block; background:#2563eb; color:white; padding:10px 24px; border-radius:8px; text-decoration:none; font-weight:700; font-size:14px; border:none; cursor:pointer }
table { width:100%; border-collapse:collapse; font-size:13px }
td { padding:8px 12px; border-bottom:1px solid #f1f5f9 }
td:first-child { font-weight:600; color:#64748b; width:160px }
</style>
</head>
<body>
<div class="container">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding:20px;background:linear-gradient(135deg,#1e40af,#2563eb);border-radius:14px;color:white">
  <div style="font-size:32px">🔒</div>
  <div>
    <h1 style="color:white;font-size:22px">SSLVault Auto-Installer</h1>
    <p style="color:rgba(255,255,255,0.8);margin:0">cPanel UAPI — Fully Automated SSL v2.0</p>
  </div>
</div>

<?php
if ($SSLVAULT_TOKEN === '%%TOKEN%%' || $CPANEL_USERNAME === '%%CPANEL_USERNAME%%') {
    box('⚠️ File Not Configured', 'This file has not been configured with your credentials. Please download it from your <a href="https://www.easysecurity.in/dashboard" style="color:#1d4ed8">SSLVault dashboard</a>.', 'warn');
    echo "</div></body></html>"; exit;
}
if (!function_exists('curl_init')) {
    box('❌ cURL Not Available', 'Your server does not have PHP cURL enabled. Contact your hosting provider to enable it.', 'error');
    echo "</div></body></html>"; exit;
}

echo '<div class="card"><h2 style="font-size:18px;font-weight:700;margin-bottom:16px">🚀 Installing Certificate...</h2>';

$domain = $certPem = $keyPem = '';
$success = false;
$certInfo = [];

// Step 1
stepLine(1, 'Checking requirements', 'ok', 'PHP '.PHP_VERSION.' | cURL: Yes | OpenSSL: '.(function_exists('openssl_x509_parse')?'Yes':'No'));

// Step 2: Fetch cert from SSLVault
stepLine(2, 'Connecting to SSLVault API', 'ok', 'Validating token...');
flush();

$regData = callSSLVault($AGENT_API, [
    'action'     => 'register',
    'token'      => $SSLVAULT_TOKEN,
    'hostname'   => gethostname() ?: ($_SERVER['HTTP_HOST'] ?? 'unknown'),
    'os'         => PHP_OS.' (PHP '.PHP_VERSION.')',
    'ip'         => $_SERVER['SERVER_ADDR'] ?? 'unknown',
    'web_server' => 'shared-hosting-cpanel',
]);

if (!empty($regData['error'])) {
    stepLine(2, 'SSLVault API', 'fail', $regData['error']);
    box('❌ API Error', htmlspecialchars($regData['error']).'<br><br>Token may be expired. Generate a new one from the dashboard.', 'error');
    echo "</div></div></body></html>"; exit;
}

$domain = $regData['domain'] ?? '';
$certPem = $regData['cert_pem'] ?? '';
$keyPem = $regData['key_pem'] ?? '';

if (empty($domain) || empty($certPem) || empty($keyPem)) {
    box('❌ Incomplete Data', 'Certificate data missing. Please generate a new install token.', 'error');
    echo "</div></div></body></html>"; exit;
}
stepLine(2, 'SSLVault API', 'ok', "Certificate fetched for: {$domain}");

// Step 3: Verify cert
if (function_exists('openssl_x509_parse')) {
    $parsed = @openssl_x509_parse($certPem);
    if ($parsed) {
        $certInfo = ['expiry' => date('Y-m-d', $parsed['validTo_time_t']), 'issuer' => $parsed['issuer']['O'] ?? 'Unknown', 'subject' => $parsed['subject']['CN'] ?? $domain];
        stepLine(3, 'Certificate verified', 'ok', "Issuer: {$certInfo['issuer']} | Expires: {$certInfo['expiry']}");
    } else {
        stepLine(3, 'Certificate check', 'warn', 'Could not parse — proceeding anyway');
    }
} else {
    stepLine(3, 'Certificate check', 'warn', 'OpenSSL unavailable — skipping verification');
}

// Step 4: Install via cPanel UAPI — try multiple hosts
stepLine(4, 'Activating SSL via cPanel UAPI', 'ok', "Connecting to cPanel for {$domain}...");
flush();

$installResult = ['error' => 'No hosts to try'];
$usedHost = '';
foreach (getCpanelHosts() as $host) {
    $res = installSSLViaCpanel($host, $CPANEL_USERNAME, $CPANEL_API_TOKEN, $domain, $certPem, $keyPem);
    if (empty($res['error'])) {
        $installResult = $res;
        $usedHost = $host;
        break;
    }
    $installResult = $res; // keep last error
}

if (!empty($installResult['error'])) {
    stepLine(4, 'cPanel UAPI', 'fail', $installResult['error']);
    box('❌ cPanel SSL Activation Failed',
        htmlspecialchars($installResult['error']).'<br><br>
        <strong>Common fixes:</strong>
        <ul style="padding-left:18px;margin-top:8px;font-size:13px;line-height:2">
        <li>Double-check your cPanel <strong>username</strong> (short login name, not your email)</li>
        <li>Make sure the API token has <strong>SSL</strong> permissions enabled in cPanel</li>
        <li>Verify port 2083 is not blocked on your server</li>
        <li>Re-download the agent from SSLVault with fresh credentials</li>
        </ul>',
        'error');
    callSSLVault($AGENT_API, ['action'=>'confirm','token'=>$SSLVAULT_TOKEN,'web_server'=>'shared-hosting-cpanel','success'=>false,'error_message'=>'cPanel UAPI: '.$installResult['error']]);
    echo "</div></div></body></html>"; exit;
}

stepLine(4, 'SSL activated via cPanel UAPI', 'ok', "Certificate is live on {$domain} (via {$usedHost})");

// Step 5: .htaccess
$htResult = updateHtaccess();
$htMsg = $htResult === 'already_set' ? 'Already configured' : ($htResult === 'updated' ? 'Added to existing .htaccess' : 'Created new .htaccess');
stepLine(5, 'Configuring HTTPS redirect', 'ok', $htMsg);

// Step 6: Confirm
callSSLVault($AGENT_API, ['action'=>'confirm','token'=>$SSLVAULT_TOKEN,'install_path'=>'cpanel-uapi','web_server'=>'shared-hosting-cpanel','success'=>true,'error_message'=>'']);
stepLine(6, 'Status reported to SSLVault', 'ok', 'Dashboard updated');

$success = true;
echo '</div>';
?>

<?php if ($success): ?>
<div class="card" style="border:2px solid #16a34a">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
    <div style="font-size:40px">✅</div>
    <div>
      <h2 style="font-size:20px;font-weight:800;color:#16a34a">SSL Installed & Active!</h2>
      <p style="margin:0">Your certificate is live. No further steps needed.</p>
    </div>
  </div>
  <table>
    <tr><td>Domain</td><td><code><?= htmlspecialchars($domain) ?></code></td></tr>
    <?php if (!empty($certInfo['issuer'])): ?>
    <tr><td>Issuer</td><td><code><?= htmlspecialchars($certInfo['issuer']) ?></code></td></tr>
    <tr><td>Expires</td><td><code><?= htmlspecialchars($certInfo['expiry']) ?></code></td></tr>
    <?php endif; ?>
    <tr><td>cPanel User</td><td><code><?= htmlspecialchars($CPANEL_USERNAME) ?></code></td></tr>
    <tr><td>HTTPS Redirect</td><td><code><?= $htMsg ?></code></td></tr>
  </table>
</div>

<div class="card" style="background:#fff7ed;border:2px solid #fb923c">
  <h3 style="font-weight:700;margin-bottom:8px;color:#9a3412">🔒 Delete This File Immediately</h3>
  <p style="font-size:14px;margin-bottom:4px">Delete <code>sslvault-agent.php</code> from your server now. It contains your cPanel API token.</p>
  <p style="font-size:13px;color:#64748b">cPanel → File Manager → find the file → Delete</p>
</div>

<div style="display:flex;gap:12px;flex-wrap:wrap">
  <a href="https://www.ssllabs.com/ssltest/analyze.html?d=<?= urlencode($domain) ?>" target="_blank" class="btn" style="background:#059669">🔍 Test SSL Grade</a>
  <a href="https://www.easysecurity.in/dashboard" target="_blank" class="btn">📊 View Dashboard</a>
</div>
<?php endif; ?>

</div></body></html>
