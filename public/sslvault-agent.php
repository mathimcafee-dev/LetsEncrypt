<?php
/**
 * SSLVault PHP Agent v1.0
 * For shared hosting (cPanel, GoDaddy, Bluehost, Hostinger, etc.)
 * 
 * INSTRUCTIONS:
 * 1. Upload this file to your website root folder
 * 2. Visit: https://yourdomain.com/sslvault-agent.php?token=YOUR_TOKEN
 * 3. Certificate installs automatically
 * 4. Delete this file after installation for security
 */

// Token from URL or hardcoded during download
$token = isset($_GET['token']) ? trim($_GET['token']) : '';
$AGENT_API = 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/agent';

// Security: only run via browser or direct request
header('Content-Type: text/html; charset=utf-8');

function callAPI($url, $data) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);
    if ($error) return ['error' => 'Connection failed: ' . $error];
    return json_decode($response, true) ?: ['error' => 'Invalid response'];
}

function getServerInfo() {
    $hostname = gethostname() ?: $_SERVER['HTTP_HOST'] ?? 'unknown';
    $ip = $_SERVER['SERVER_ADDR'] ?? 'unknown';
    $os = PHP_OS . ' (PHP ' . PHP_VERSION . ')';
    $software = $_SERVER['SERVER_SOFTWARE'] ?? 'unknown';
    return compact('hostname', 'ip', 'os', 'software');
}

function findWritablePaths($domain) {
    $candidates = [
        $_SERVER['DOCUMENT_ROOT'] . '/ssl/',
        dirname($_SERVER['DOCUMENT_ROOT']) . '/ssl/',
        dirname($_SERVER['DOCUMENT_ROOT']) . '/private/',
        sys_get_temp_dir() . '/sslvault/',
        $_SERVER['DOCUMENT_ROOT'] . '/.ssl/',
    ];
    foreach ($candidates as $path) {
        if (!file_exists($path)) @mkdir($path, 0700, true);
        if (is_writable($path)) return rtrim($path, '/');
    }
    return $_SERVER['DOCUMENT_ROOT'] . '/ssl';
}

function writeCertFiles($domain, $certPem, $keyPem) {
    $basePath = findWritablePaths($domain);
    $certPath = $basePath . '/fullchain.pem';
    $keyPath  = $basePath . '/privkey.pem';
    
    if (!file_put_contents($certPath, $certPem)) return ['error' => 'Cannot write cert file to ' . $certPath];
    if (!file_put_contents($keyPath, $keyPem))   return ['error' => 'Cannot write key file to ' . $keyPath];
    
    @chmod($certPath, 0644);
    @chmod($keyPath, 0600);
    
    return ['ok' => true, 'cert_path' => $certPath, 'key_path' => $keyPath, 'base' => $basePath];
}

function updateHtaccess($domain) {
    $htaccess = $_SERVER['DOCUMENT_ROOT'] . '/.htaccess';
    $redirect = "\n# SSLVault - Force HTTPS\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n";
    
    if (file_exists($htaccess)) {
        $content = file_get_contents($htaccess);
        if (strpos($content, 'Force HTTPS') !== false) return 'already_set';
        file_put_contents($htaccess, $content . $redirect);
        return 'updated';
    } else {
        file_put_contents($htaccess, "Options -Indexes\n" . $redirect);
        return 'created';
    }
}

// HTML output helper
function box($title, $content, $type = 'info') {
    $colors = ['info' => '#dbeafe:#1d4ed8', 'success' => '#dcfce7:#16a34a', 'error' => '#fee2e2:#dc2626', 'warn' => '#fef9c3:#b45309'];
    [$bg, $border] = explode(':', $colors[$type] ?? $colors['info']);
    echo "<div style='background:$bg;border:2px solid $border;border-radius:10px;padding:16px 20px;margin:12px 0'>
        <strong style='color:$border'>$title</strong><br>$content</div>";
}

function stepLine($n, $label, $status, $detail = '') {
    $icon = $status === 'ok' ? '✅' : ($status === 'warn' ? '⚠️' : ($status === 'fail' ? '❌' : '⏳'));
    echo "<div style='display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #e5e7eb;align-items:flex-start'>
        <span style='font-size:18px;flex-shrink:0'>$icon</span>
        <div><strong>Step $n: $label</strong>" . ($detail ? "<br><span style='font-size:13px;color:#6b7280'>$detail</span>" : '') . "</div></div>";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SSLVault Agent — Certificate Installer</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; padding: 24px }
  .container { max-width: 680px; margin: 0 auto }
  h1 { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 4px }
  p { color: #64748b; font-size: 14px; margin-bottom: 16px }
  .card { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06) }
  code { background: #f1f5f9; padding: 2px 8px; border-radius: 5px; font-family: monospace; font-size: 13px; word-break: break-all }
  .btn { display: inline-block; background: #2563eb; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; border: none; cursor: pointer }
  table { width: 100%; border-collapse: collapse; font-size: 13px }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9 }
  td:first-child { font-weight: 600; color: #64748b; width: 160px }
</style>
</head>
<body>
<div class="container">

<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding:20px;background:linear-gradient(135deg,#1e40af,#2563eb);border-radius:14px;color:white">
  <div style="font-size:32px">🔒</div>
  <div>
    <h1 style="color:white;font-size:22px">SSLVault Certificate Installer</h1>
    <p style="color:rgba(255,255,255,0.8);margin:0">Shared Hosting PHP Agent v1.0</p>
  </div>
</div>

<?php if (empty($token)): ?>

<div class="card">
  <h2 style="font-size:18px;font-weight:700;margin-bottom:12px">⚠️ No Token Found</h2>
  <p>This installer requires a token from SSLVault. Please follow these steps:</p>
  <ol style="padding-left:20px;font-size:14px;color:#475569;line-height:2">
    <li>Go to <strong>https://www.easysecurity.in/dashboard</strong></li>
    <li>Expand your certificate domain panel</li>
    <li>Click <strong>"Install on Server"</strong></li>
    <li>Select <strong>"Shared Hosting (PHP)"</strong></li>
    <li>Download the pre-configured agent file</li>
    <li>Upload it to your website and visit the URL</li>
  </ol>
</div>

<?php else: ?>

<div class="card">
  <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">🚀 Installing Certificate...</h2>

<?php
  $info = getServerInfo();
  $steps = [];
  $success = false;
  $certPath = '';
  $keyPath = '';
  $basePath = '';

  // Step 1: Check requirements
  $hasCurl = function_exists('curl_init');
  $hasOpenSSL = function_exists('openssl_x509_parse');
  stepLine(1, 'Checking server requirements', 
    ($hasCurl ? 'ok' : 'fail'),
    'PHP ' . PHP_VERSION . ' | cURL: ' . ($hasCurl ? 'Yes' : 'No') . ' | OpenSSL: ' . ($hasOpenSSL ? 'Yes' : 'No')
  );

  if (!$hasCurl) {
    box('❌ cURL Not Available', 'Your hosting does not have PHP cURL enabled. Please contact your hosting provider to enable it, or install the certificate manually.', 'error');
    echo "</div></div></body></html>";
    exit;
  }

  // Step 2: Register with SSLVault
  stepLine(2, 'Connecting to SSLVault API', 'ok', 'Validating token and downloading certificate...');
  flush();

  $regData = callAPI($AGENT_API, [
    'action'     => 'register',
    'token'      => $token,
    'hostname'   => $info['hostname'],
    'os'         => $info['os'],
    'ip'         => $info['ip'],
    'web_server' => 'shared-hosting-php',
  ]);

  if (!empty($regData['error'])) {
    stepLine(2, 'Connecting to SSLVault API', 'fail', $regData['error']);
    box('❌ Connection Failed', htmlspecialchars($regData['error']) . '<br><br>Common causes: token expired (generate a new one), or network issue.', 'error');
    echo "</div></div></body></html>";
    exit;
  }

  $domain  = $regData['domain'] ?? '';
  $certPem = $regData['cert_pem'] ?? '';
  $keyPem  = $regData['key_pem'] ?? '';

  if (empty($domain) || empty($certPem) || empty($keyPem)) {
    box('❌ Incomplete Data', 'Certificate data missing from API response. Please try generating a new token.', 'error');
    echo "</div></div></body></html>";
    exit;
  }

  echo "<script>document.querySelector('h2').textContent='Installing Certificate for " . htmlspecialchars($domain) . "...'</script>";

  // Step 3: Save certificate files
  stepLine(3, 'Saving certificate files', 'ok', 'Writing to server filesystem...');
  flush();

  $writeResult = writeCertFiles($domain, $certPem, $keyPem);
  if (!empty($writeResult['error'])) {
    stepLine(3, 'Saving certificate files', 'fail', $writeResult['error']);
    box('❌ Cannot Write Files', htmlspecialchars($writeResult['error']), 'error');
    callAPI($AGENT_API, ['action' => 'confirm', 'token' => $token, 'success' => false, 'error_message' => $writeResult['error'], 'web_server' => 'shared-hosting-php']);
    echo "</div></div></body></html>";
    exit;
  }

  $certPath = $writeResult['cert_path'];
  $keyPath  = $writeResult['key_path'];
  $basePath = $writeResult['base'];

  stepLine(3, 'Saving certificate files', 'ok', 'Saved to: ' . $basePath);

  // Step 4: Verify certificate
  $certValid = false;
  if ($hasOpenSSL) {
    $parsed = @openssl_x509_parse($certPem);
    if ($parsed) {
      $certValid = true;
      $expiry = date('Y-m-d', $parsed['validTo_time_t']);
      $subject = $parsed['subject']['CN'] ?? $domain;
      $issuer = $parsed['issuer']['O'] ?? 'Unknown';
      stepLine(4, 'Verifying certificate', 'ok', "Domain: $subject | Issuer: $issuer | Expires: $expiry");
    }
  } else {
    stepLine(4, 'Verifying certificate', 'warn', 'OpenSSL not available for verification (cert still saved)');
  }

  // Step 5: Update .htaccess for HTTPS redirect
  $htResult = updateHtaccess($domain);
  $htMsg = $htResult === 'already_set' ? 'Already configured' : ($htResult === 'updated' ? 'Updated existing .htaccess' : 'Created new .htaccess');
  stepLine(5, 'Configuring HTTPS redirect', 'ok', $htMsg);

  // Step 6: Report success to SSLVault
  callAPI($AGENT_API, [
    'action'        => 'confirm',
    'token'         => $token,
    'install_path'  => $basePath,
    'web_server'    => 'shared-hosting-php',
    'success'       => true,
    'error_message' => '',
  ]);
  stepLine(6, 'Reporting to SSLVault dashboard', 'ok', 'Installation status updated');

  $success = true;
?>

</div>

<?php if ($success): ?>
<div class="card" style="border:2px solid #16a34a">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
    <div style="font-size:40px">✅</div>
    <div>
      <h2 style="font-size:20px;font-weight:800;color:#16a34a">Installation Complete!</h2>
      <p style="margin:0">Certificate files saved to your server</p>
    </div>
  </div>

  <table>
    <tr><td>Domain</td><td><code><?= htmlspecialchars($domain) ?></code></td></tr>
    <tr><td>Certificate</td><td><code><?= htmlspecialchars($certPath) ?></code></td></tr>
    <tr><td>Private Key</td><td><code><?= htmlspecialchars($keyPath) ?></code></td></tr>
    <tr><td>Server</td><td><code><?= htmlspecialchars($info['software']) ?></code></td></tr>
    <tr><td>HTTPS Redirect</td><td><code><?= $htMsg ?></code></td></tr>
  </table>
</div>

<div class="card" style="border:2px solid #f59e0b;background:#fffbeb">
  <h3 style="font-weight:700;margin-bottom:12px">⚠️ One More Step Required — cPanel SSL</h3>
  <p style="margin-bottom:12px">Your certificate files are saved. Now install them in cPanel:</p>
  <ol style="padding-left:20px;font-size:14px;color:#475569;line-height:2.2">
    <li>Login to <strong>cPanel</strong> (yourdomain.com/cpanel)</li>
    <li>Search for <strong>"SSL/TLS"</strong> → click <strong>Manage SSL Sites</strong></li>
    <li>Select your domain: <strong><?= htmlspecialchars($domain) ?></strong></li>
    <li>In the <strong>Certificate (CRT)</strong> box, paste the contents of:<br>
        <code><?= htmlspecialchars($certPath) ?></code></li>
    <li>In the <strong>Private Key (KEY)</strong> box, paste the contents of:<br>
        <code><?= htmlspecialchars($keyPath) ?></code></li>
    <li>Click <strong>Install Certificate</strong></li>
  </ol>

  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-top:12px;font-size:13px">
    <strong>To view file contents:</strong> Go to cPanel → File Manager → navigate to <code><?= htmlspecialchars($basePath) ?></code> → right-click the .pem file → View/Edit
  </div>
</div>

<div class="card" style="background:#f0fdf4">
  <h3 style="font-weight:700;margin-bottom:12px">🔒 Security — Delete This File</h3>
  <p style="font-size:14px;margin-bottom:8px">Delete <code>sslvault-agent.php</code> from your website after installation. It contains your token which should not be accessible publicly.</p>
  <p style="font-size:13px;color:#64748b">Via cPanel File Manager: navigate to your website root → find sslvault-agent.php → delete it.</p>
</div>

<div style="display:flex;gap:12px;flex-wrap:wrap">
  <a href="https://www.ssllabs.com/ssltest/analyze.html?d=<?= urlencode($domain) ?>" target="_blank" class="btn" style="background:#059669">🔍 Test SSL Grade</a>
  <a href="https://www.easysecurity.in/dashboard" target="_blank" class="btn">📊 View Dashboard</a>
</div>

<?php endif; ?>
<?php endif; ?>

</div>
</body>
</html>
