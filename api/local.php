<?php
require __DIR__ . '/lib.php';
$cfg = flex_cfg();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function db($cfg) {
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO('mysql:host=' . $cfg['DB_HOST'] . ';dbname=' . $cfg['DB_NAME'] . ';charset=utf8mb4', $cfg['DB_USER'], $cfg['DB_PASS'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function api_me($cfg, $token) {
    $ch = curl_init(rtrim($cfg['API_URL'], '/') . '/api/v1/cabinet/me');
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'X-Site-Key: ' . $cfg['SITE_KEY'], 'Authorization: Bearer ' . $token],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($body === false || $status < 200 || $status >= 300) return null;
    $data = json_decode($body, true);
    return $data['profile'] ?? null;
}

function day($v) {
    if (!$v) return null;
    $t = strtotime($v);
    return $t ? date('Y-m-d', $t) : null;
}

function current_user($cfg) {
    $uid = flex_session_user();
    if ($uid) return $uid;
    $token = $_COOKIE['flex_session'] ?? '';
    if ($token === '') out(['detail' => 'Не авторизован'], 401);
    $hash = hash('sha256', $token);
    $pdo = db($cfg);

    $s = $pdo->prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND checked_at > NOW() - INTERVAL 10 MINUTE');
    $s->execute([$hash]);
    $uid = $s->fetchColumn();
    if ($uid) return (int) $uid;

    $p = api_me($cfg, $token);
    if (!$p || empty($p['phone'])) out(['detail' => 'Не авторизован'], 401);

    $phone = preg_replace('/[^\d+]/', '', $p['phone']);
    $pdo->prepare('INSERT INTO users (phone, api_id, name, birthdate, registered_at) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE api_id = VALUES(api_id), name = VALUES(name), birthdate = VALUES(birthdate), registered_at = VALUES(registered_at)')
        ->execute([$phone, isset($p['id']) ? (string) $p['id'] : null, $p['name'] ?? null, day($p['birthdate'] ?? null), isset($p['registered_at']) ? date('Y-m-d H:i:s', strtotime($p['registered_at'])) : null]);
    $s = $pdo->prepare('SELECT id FROM users WHERE phone = ?');
    $s->execute([$phone]);
    $uid = (int) $s->fetchColumn();

    $pdo->prepare('REPLACE INTO sessions (token_hash, user_id, checked_at) VALUES (?, ?, NOW())')->execute([$hash, $uid]);
    return $uid;
}

function input() {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

try {
    $route = trim($_GET['r'] ?? '', '/');
    $method = $_SERVER['REQUEST_METHOD'];
    $uid = current_user($cfg);
    $pdo = db($cfg);

    if ($route === 'favorites') {
        if ($method === 'GET') {
            $s = $pdo->prepare('SELECT item_id AS id, html FROM favorites WHERE user_id = ? ORDER BY created_at, item_id');
            $s->execute([$uid]);
            out(['items' => $s->fetchAll()]);
        }
        $in = input();
        $id = trim((string) ($in['id'] ?? ''));
        if ($id === '' || strlen($id) > 255) out(['detail' => 'Нет id'], 422);

        if ($method === 'POST') {
            $html = (string) ($in['html'] ?? '');
            if ($html === '' || strlen($html) > 65536) out(['detail' => 'Неверная карточка'], 422);
            $pdo->prepare('INSERT INTO favorites (user_id, item_id, html) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE html = VALUES(html)')
                ->execute([$uid, $id, $html]);
            out(['ok' => true]);
        }
        if ($method === 'DELETE') {
            $pdo->prepare('DELETE FROM favorites WHERE user_id = ? AND item_id = ?')->execute([$uid, $id]);
            out(['ok' => true]);
        }
        out(['detail' => 'Метод не поддерживается'], 405);
    }

    if ($route === 'profile') {
        if ($method === 'GET') {
            $s = $pdo->prepare('SELECT phone, name, birthdate, email, email_confirmed_at, registered_at FROM users WHERE id = ?');
            $s->execute([$uid]);
            out(['profile' => $s->fetch()]);
        }
        out(['detail' => 'Метод не поддерживается'], 405);
    }

    out(['detail' => 'Не найдено'], 404);
} catch (PDOException $e) {
    error_log('flex local api: ' . $e->getMessage());
    out(['detail' => 'Ошибка базы данных'], 500);
}
