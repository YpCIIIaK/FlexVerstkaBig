<?php
$cfg = require __DIR__ . '/../flexcfg/config.php';
$root = __DIR__;

function flex_authorized($cfg) {
    $token = $_COOKIE['flex_session'] ?? '';
    if ($token === '' || !preg_match('/^[\w.\-~+\/=]+$/', $token)) return false;
    $ctx = stream_context_create(['http' => [
        'method' => 'GET',
        'header' => "Accept: application/json\r\nX-Site-Key: {$cfg['SITE_KEY']}\r\nAuthorization: Bearer {$token}\r\n",
        'ignore_errors' => true,
        'timeout' => 10,
    ]]);
    @file_get_contents(rtrim($cfg['API_URL'], '/') . '/api/v1/cabinet/me', false, $ctx);
    $status = 0;
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('#^HTTP/\S+\s+(\d+)#', $h, $m)) $status = (int) $m[1];
    }
    return $status >= 200 && $status < 300;
}

function flex_send($file, $cfg, $code = 200) {
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Robots-Tag: noindex, nofollow');
    echo str_replace('YANDEX_MAPS_KEY', $cfg['YANDEX_MAPS_KEY'] ?? '', file_get_contents($file));
    exit;
}

function flex_stub($root) {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Robots-Tag: noindex, nofollow');
    $html = file_get_contents($root . '/stub/index.html');
    echo preg_replace('/<head>/i', '<head><base href="/stub/">', $html, 1);
    exit;
}

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$aliases = ['/referral' => '/referral.html', '/starterkit' => '/starter-kit.html'];
$path = $aliases[rtrim($path, '/')] ?? $path;
if (substr($path, -1) === '/') $path .= 'index.html';
elseif (!preg_match('/\.html$/', $path) && is_dir($root . $path)) $path .= '/index.html';

$file = realpath($root . $path);
$valid = $file && strpos($file, realpath($root) . DIRECTORY_SEPARATOR) === 0 && is_file($file) && preg_match('/\.html$/', $file);

if (!flex_authorized($cfg)) {
    if ($path !== '/index.html') {
        header('Location: /', true, 302);
        exit;
    }
    flex_stub($root);
}

if (!$valid) flex_send($root . '/404.html', $cfg, 404);
flex_send($file, $cfg);
