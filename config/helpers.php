<?php
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => isset($_SERVER['HTTPS'])
]);
session_start();

header("Content-Type: application/json; charset=UTF-8");

function getJsonBody(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function sendResponse(string $status, string $message, $data = null, int $code = 200): void {
    http_response_code($code);
    echo json_encode([
        'status'  => $status,
        'message' => $message,
        'data'    => $data
    ]);
    exit();
}

function requireAuth(array $allowedRoles = []): array {
    if (empty($_SESSION['user'])) {
        sendResponse('unauthorized', 'Silakan login terlebih dahulu.', null, 401);
    }
    if (!empty($allowedRoles) && !in_array($_SESSION['user']['role'], $allowedRoles, true)) {
        sendResponse('forbidden', 'Akses ditolak untuk peran Anda.', null, 403);
    }
    return $_SESSION['user'];
}
