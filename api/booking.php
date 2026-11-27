<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$body   = getJsonBody();

switch ($action) {
    case 'create':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        $user     = requireAuth();
        $kostId   = (int)($body['kost_id'] ?? 0);
        $start    = trim($body['start_date'] ?? '');
        $duration = max(1, (int)($body['duration_months'] ?? 1));
        $payment  = trim($body['payment_method'] ?? 'Transfer Bank');

        $stmtK = $pdo->prepare("SELECT price_monthly, available_rooms FROM kosts WHERE id = ?");
        $stmtK->execute([$kostId]);
        $kost = $stmtK->fetch();

        if (!$kost || $kost['available_rooms'] <= 0) {
            sendResponse('error', 'Maaf, kamar saat ini sedang penuh.');
        }

        $total = $kost['price_monthly'] * $duration;
        $pdo->prepare("INSERT INTO bookings (kost_id, tenant_id, start_date, duration_months, total_price, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')")
            ->execute([$kostId, $user['id'], $start, $duration, $total, $payment]);
        $pdo->prepare("UPDATE kosts SET available_rooms = available_rooms - 1 WHERE id = ?")->execute([$kostId]);

        sendResponse('success', 'Pengajuan sewa berhasil dikirim! Menunggu konfirmasi.');
        break;

    case 'my_bookings':
        $user = requireAuth();
        $stmt = $pdo->prepare("
            SELECT b.*, k.name AS kost_name, k.image_url, k.city, k.type
            FROM bookings b JOIN kosts k ON b.kost_id = k.id
            WHERE b.tenant_id = ? ORDER BY b.id DESC
        ");
        $stmt->execute([$user['id']]);
        sendResponse('success', 'Riwayat sewa', $stmt->fetchAll());
        break;

    case 'dashboard':
        $user    = requireAuth(['admin', 'landlord']);
        $isAdmin = ($user['role'] === 'admin');

        $stmtK = $isAdmin
            ? $pdo->query("SELECT k.*, u.name AS owner_name FROM kosts k JOIN users u ON k.owner_id = u.id ORDER BY k.id DESC")
            : $pdo->prepare("SELECT * FROM kosts WHERE owner_id = ? ORDER BY id DESC");
        if (!$isAdmin) $stmtK->execute([$user['id']]);
        $kosts = $stmtK->fetchAll();

        foreach ($kosts as &$k) {
            $k['facilities'] = json_decode($k['facilities'], true) ?? [];
        }

        $totalRooms = array_sum(array_column($kosts, 'total_rooms'));
        $availRooms = array_sum(array_column($kosts, 'available_rooms'));
        $occupied   = $totalRooms - $availRooms;
        $occupancy  = $totalRooms > 0 ? round(($occupied / $totalRooms) * 100, 1) : 0;

        $whereOwner = $isAdmin ? "" : "WHERE k.owner_id = ?";
        $params     = $isAdmin ? [] : [$user['id']];

        $stmtRev = $pdo->prepare("SELECT COALESCE(SUM(b.total_price), 0) AS rev FROM bookings b JOIN kosts k ON b.kost_id = k.id $whereOwner " . ($isAdmin ? "WHERE" : "AND") . " b.status = 'Approved'");
        $stmtRev->execute($params);
        $revenue = (int)$stmtRev->fetch()['rev'];

        $stmtB = $pdo->prepare("
            SELECT b.*, u.name AS tenant_name, u.phone AS tenant_phone, k.name AS kost_name
            FROM bookings b JOIN kosts k ON b.kost_id = k.id JOIN users u ON b.tenant_id = u.id
            $whereOwner ORDER BY b.id DESC
        ");
        $stmtB->execute($params);

        sendResponse('success', 'Dashboard dimuat', [
            'stats' => [
                'total_properties' => count($kosts),
                'total_rooms'      => $totalRooms,
                'occupied_rooms'   => $occupied,
                'occupancy_rate'   => $occupancy,
                'total_revenue'    => $revenue
            ],
            'kosts'    => $kosts,
            'bookings' => $stmtB->fetchAll()
        ]);
        break;

    case 'update_status':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        $user      = requireAuth(['admin', 'landlord']);
        $bookingId = (int)($body['booking_id'] ?? 0);
        $status    = $body['status'] ?? '';

        if (!in_array($status, ['Approved', 'Rejected'], true)) sendResponse('error', 'Status tidak valid.');

        $stmtGet = $pdo->prepare("SELECT b.kost_id, b.status, k.owner_id FROM bookings b JOIN kosts k ON b.kost_id = k.id WHERE b.id = ?");
        $stmtGet->execute([$bookingId]);
        $booking = $stmtGet->fetch();

        if (!$booking || ($user['role'] !== 'admin' && $booking['owner_id'] != $user['id'])) {
            sendResponse('forbidden', 'Tidak berhak mengubah booking ini.', null, 403);
        }

        $pdo->prepare("UPDATE bookings SET status = ? WHERE id = ?")->execute([$status, $bookingId]);
        if ($status === 'Rejected' && $booking['status'] === 'Pending') {
            $pdo->prepare("UPDATE kosts SET available_rooms = available_rooms + 1 WHERE id = ?")->execute([$booking['kost_id']]);
        }

        sendResponse('success', "Booking berhasil diubah menjadi {$status}.");
        break;

    default:
        sendResponse('error', 'Endpoint booking tidak valid.', null, 404);
}
