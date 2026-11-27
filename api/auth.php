<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$body   = getJsonBody();

switch ($action) {
    case 'register':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        $name     = trim($body['name'] ?? '');
        $email    = trim($body['email'] ?? '');
        $password = trim($body['password'] ?? '');
        $phone    = trim($body['phone'] ?? '');
        $role     = in_array($body['role'] ?? '', ['tenant', 'landlord'], true) ? $body['role'] : 'tenant';

        if (!$name || !$email || strlen($password) < 6) {
            sendResponse('error', 'Nama, email, dan sandi (min. 6 karakter) wajib diisi.');
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->rowCount() > 0) sendResponse('error', 'Email sudah terdaftar.');

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$name, $email, $hash, $phone, $role]);
        sendResponse('success', 'Pendaftaran berhasil! Silakan masuk.');
        break;

    case 'login':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        $email    = trim($body['email'] ?? '');
        $password = trim($body['password'] ?? '');

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            session_regenerate_id(true);
            unset($user['password']);
            $_SESSION['user'] = $user;
            sendResponse('success', 'Selamat datang, ' . $user['name'], $user);
        }
        sendResponse('error', 'Email atau kata sandi salah.');
        break;

    case 'check_session':
        if (!empty($_SESSION['user'])) {
            sendResponse('success', 'Sesi aktif', $_SESSION['user']);
        }
        sendResponse('unauthorized', 'Belum login');
        break;

    case 'logout':
        session_destroy();
        sendResponse('success', 'Berhasil keluar.');
        break;

    default:
        sendResponse('error', 'Endpoint auth tidak valid.', null, 404);
}
