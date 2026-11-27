<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$body   = getJsonBody();

$admin = requireAuth(['admin']);

switch ($action) {
    case 'list':
        $stmt = $pdo->query("SELECT id, name, email, phone, role, created_at FROM users ORDER BY id DESC");
        sendResponse('success', 'Daftar pengguna', $stmt->fetchAll());
        break;

    case 'update_role':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        $userId = (int)($body['user_id'] ?? 0);
        $role   = $body['role'] ?? '';

        if ($userId === (int)$admin['id']) {
            sendResponse('error', 'Tidak dapat mengubah peran akun sendiri.');
        }
        if (!in_array($role, ['admin', 'landlord', 'tenant'], true)) {
            sendResponse('error', 'Peran tidak valid.');
        }

        $pdo->prepare("UPDATE users SET role = ? WHERE id = ?")->execute([$role, $userId]);
        sendResponse('success', 'Peran pengguna berhasil diperbarui.');
        break;

    case 'delete':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        $userId = (int)($body['user_id'] ?? 0);

        if ($userId === (int)$admin['id']) {
            sendResponse('error', 'Tidak dapat menghapus akun sendiri.');
        }

        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
        sendResponse('success', 'Pengguna berhasil dihapus.');
        break;

    default:
        sendResponse('error', 'Endpoint users tidak valid.', null, 404);
}
