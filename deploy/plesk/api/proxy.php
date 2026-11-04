<?php
$cfg = require __DIR__ . '/../../flexcfg/config.php';

$route = trim($_GET['path'] ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];

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
    flex_cookie('', 0);
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
$body = curl_exec($ch);

header('Cache-Control: no-store');
if ($body === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['detail' => 'API недоступно', 'code' => 'PROXY_ERROR'], JSON_UNESCAPED_UNICODE);
    exit;
}

$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'application/json';
curl_close($ch);

if (($route === 'cabinet/session' || $route === 'cabinet/login/verify') && $status >= 200 && $status < 300) {
    $data = json_decode($body, true);
    if (!empty($data['token'])) flex_cookie($data['token'], 86400);
}

http_response_code($status);
header('Content-Type: ' . $type);
echo $body;
