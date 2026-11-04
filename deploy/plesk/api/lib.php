<?php
const FLEX_SID = 'flex_sid';
const FLEX_SID_DAYS = 30;

function flex_cfg() {
    static $cfg;
    if (!$cfg) $cfg = require __DIR__ . '/../../flexcfg/config.php';
    return $cfg;
}

function flex_db() {
    static $pdo;
    if (!$pdo) {
        $c = flex_cfg();
        $pdo = new PDO('mysql:host=' . $c['DB_HOST'] . ';dbname=' . $c['DB_NAME'] . ';charset=utf8mb4', $c['DB_USER'], $c['DB_PASS'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function flex_set_cookie($name, $value, $age) {
    setcookie($name, $value, [
        'expires' => $age ? time() + $age : 1,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function flex_day($v) {
    if (!$v) return null;
    $t = strtotime($v);
    return $t ? date('Y-m-d', $t) : null;
}

function flex_upsert_user(array $p) {
    if (empty($p['phone'])) return 0;
    $pdo = flex_db();
    $phone = preg_replace('/[^\d+]/', '', $p['phone']);
    $pdo->prepare('INSERT INTO users (phone, api_id, name, birthdate, registered_at) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE api_id = COALESCE(VALUES(api_id), api_id), name = COALESCE(VALUES(name), name),
        birthdate = COALESCE(VALUES(birthdate), birthdate), registered_at = COALESCE(VALUES(registered_at), registered_at)')
        ->execute([
            $phone,
            isset($p['id']) ? (string) $p['id'] : null,
            $p['name'] ?? null,
            flex_day($p['birthdate'] ?? null),
            !empty($p['registered_at']) ? date('Y-m-d H:i:s', strtotime($p['registered_at'])) : null,
        ]);
    $s = $pdo->prepare('SELECT id FROM users WHERE phone = ?');
    $s->execute([$phone]);
    return (int) $s->fetchColumn();
}

function flex_open_session($uid) {
    $sid = bin2hex(random_bytes(32));
    flex_db()->prepare('INSERT INTO site_sessions (sid_hash, user_id, expires_at) VALUES (?, ?, NOW() + INTERVAL ' . FLEX_SID_DAYS . ' DAY)')
        ->execute([hash('sha256', $sid), $uid]);
    flex_set_cookie(FLEX_SID, $sid, FLEX_SID_DAYS * 86400);
}

function flex_session_user() {
    $sid = $_COOKIE[FLEX_SID] ?? '';
    if (!preg_match('/^[a-f0-9]{64}$/', $sid)) return 0;
    $s = flex_db()->prepare('SELECT user_id FROM site_sessions WHERE sid_hash = ? AND expires_at > NOW()');
    $s->execute([hash('sha256', $sid)]);
    return (int) $s->fetchColumn();
}

function flex_close_session() {
    $sid = $_COOKIE[FLEX_SID] ?? '';
    if ($sid !== '') {
        try {
            flex_db()->prepare('DELETE FROM site_sessions WHERE sid_hash = ? OR expires_at < NOW()')->execute([hash('sha256', $sid)]);
        } catch (Exception $e) {
        }
    }
    flex_set_cookie(FLEX_SID, '', 0);
    flex_set_cookie('flex_session', '', 0);
}
