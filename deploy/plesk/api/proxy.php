<?php
require __DIR__ . '/lib.php';
$cfg = flex_cfg();

$route = trim($_GET['path'] ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];

const FLEX_AUTH_ROUTES = ['phone', 'otp/verify', 'register', 'cabinet/session', 'cabinet/login/code', 'cabinet/login/verify'];

function flex_log($route, $method, $status, $ms, $extra = '') {
    if (!in_array($route, FLEX_AUTH_ROUTES, true) && $status !== 0 && $status < 500) return;
    $phone = '';
    $in = json_decode(file_get_contents('php://input'), true);
    if (is_array($in) && !empty($in['phone'])) $phone = ' phone=***' . substr(preg_replace('/\D/', '', $in['phone']), -4);
    $time = (new DateTime('now', new DateTimeZone('Asia/Almaty')))->format('Y-m-d H:i:s');
    $line = $time . ' ' . $method . ' ' . $route . ' upstream=' . ($status ?: 'NONE') . ' ' . $ms . 'ms' . $phone . ($extra !== '' ? ' ' . $extra : '') . PHP_EOL;
    $dir = __DIR__ . '/../../flexcfg/logs';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    if (@file_put_contents($dir . '/api-' . substr($time, 0, 10) . '.log', $line, FILE_APPEND | LOCK_EX) === false) error_log('flex api: ' . trim($line));
}

function flex_cookie($token, $age) {
    setcookie('flex_session', $token, [
        'expires' => $age ? time() + $age : 1,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

if ($route === 'logout') {
    flex_close_session();
    http_response_code(204);
    exit;
}

if (!preg_match('#^[\w\-/]+$#', $route)) {
    http_response_code(404);
    exit;
}

$query = $_GET;
unset($query['path']);
$url = rtrim($cfg['API_URL'], '/') . '/api/v1/' . $route . ($query ? '?' . http_build_query($query) : '');

$headers = ['Accept: application/json', 'X-Site-Key: ' . $cfg['SITE_KEY']];
foreach (['CONTENT_TYPE' => 'Content-Type', 'HTTP_AUTHORIZATION' => 'Authorization', 'HTTP_ACCEPT_LANGUAGE' => 'Accept-Language'] as $k => $name) {
    if (!empty($_SERVER[$k])) $headers[] = $name . ': ' . $_SERVER[$k];
}
if (empty($_SERVER['HTTP_AUTHORIZATION']) && !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $headers[] = 'Authorization: ' . $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
]);
if (!in_array($method, ['GET', 'HEAD'], true)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}
$started = microtime(true);
$body = curl_exec($ch);
$ms = (int) round((microtime(true) - $started) * 1000);

header('Cache-Control: no-store');
if ($body === false) {
    flex_log($route, $method, 0, $ms, 'curl_error=' . curl_errno($ch) . ' "' . curl_error($ch) . '"');
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['detail' => 'API недоступно', 'code' => 'PROXY_ERROR'], JSON_UNESCAPED_UNICODE);
    exit;
}

$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'application/json';
curl_close($ch);

$err = '';
if ($status >= 400) {
    $data = json_decode($body, true);
    $code = is_array($data) ? ($data['code'] ?? '') : '';
    $detail = is_array($data) && is_string($data['detail'] ?? null) ? $data['detail'] : (is_array($data) ? '' : substr(trim(strip_tags((string) $body)), 0, 120));
    $err = trim(($code ? 'code=' . $code : '') . ($detail !== '' ? ' detail="' . mb_substr($detail, 0, 150) . '"' : ''));
}
flex_log($route, $method, $status, $ms, $err);

if (($route === 'cabinet/session' || $route === 'cabinet/login/verify') && $status >= 200 && $status < 300) {
    $data = json_decode($body, true);
    if (!empty($data['token'])) {
        $age = !empty($data['expires_at']) ? max(60, strtotime($data['expires_at']) - time()) : 86400;
        flex_cookie($data['token'], $age);
        try {
            $uid = flex_upsert_user($data['profile'] ?? []);
            if ($uid) flex_open_session($uid);
        } catch (Exception $e) {
            error_log('flex session: ' . $e->getMessage());
        }
    }
}

http_response_code($status);
header('Content-Type: ' . $type);
echo $body;
