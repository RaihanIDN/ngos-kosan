<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$body   = getJsonBody();

switch ($action) {
    case 'list':
        $search   = !empty($_GET['search']) ? '%' . trim($_GET['search']) . '%' : null;
        $type     = (!empty($_GET['type']) && $_GET['type'] !== 'All') ? $_GET['type'] : null;
        $maxPrice = (!empty($_GET['max_price']) && is_numeric($_GET['max_price'])) ? (int)$_GET['max_price'] : null;
        $userId   = $_SESSION['user']['id'] ?? 0;

        $sql = "SELECT k.*, u.name AS owner_name, u.phone AS owner_phone,
                (SELECT COUNT(*) FROM favorites f WHERE f.kost_id = k.id AND f.user_id = ?) AS is_favorite
                FROM kosts k JOIN users u ON k.owner_id = u.id
                WHERE k.status = 'Approved'";
        $params = [$userId];

        if ($search) {
            $sql .= " AND (k.name LIKE ? OR k.city LIKE ? OR k.address LIKE ?)";
            array_push($params, $search, $search, $search);
        }
        if ($type) {
            $sql .= " AND k.type = ?";
            $params[] = $type;
        }
        if ($maxPrice) {
            $sql .= " AND k.price_monthly <= ?";
            $params[] = $maxPrice;
        }

        $sql .= " ORDER BY k.id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $kosts = $stmt->fetchAll();

        foreach ($kosts as &$k) {
            $k['facilities']  = json_decode($k['facilities'], true) ?? [];
            $k['is_favorite'] = (bool)$k['is_favorite'];
        }
        sendResponse('success', 'Data kost dimuat', $kosts);
        break;

    case 'detail':
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT k.*, u.name AS owner_name, u.phone AS owner_phone FROM kosts k JOIN users u ON k.owner_id = u.id WHERE k.id = ?");
        $stmt->execute([$id]);
        $kost = $stmt->fetch();
        if (!$kost) sendResponse('error', 'Properti tidak ditemukan', null, 404);
        $kost['facilities'] = json_decode($kost['facilities'], true) ?? [];
        sendResponse('success', 'Detail kost', $kost);
        break;

    case 'add':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        $user = requireAuth(['admin', 'landlord']);

        $name  = trim($body['name'] ?? '');
        $city  = trim($body['city'] ?? '');
        $price = (int)($body['price_monthly'] ?? 0);
        if (!$name || !$city || $price <= 0) sendResponse('error', 'Lengkapi nama, kota, dan harga.');

        $rooms  = max(1, (int)($body['total_rooms'] ?? 5));
        $img    = trim($body['image_url'] ?? '') ?: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
        $status = ($user['role'] === 'admin') ? 'Approved' : 'Pending';

        $stmt = $pdo->prepare("
            INSERT INTO kosts (owner_id, name, type, city, address, price_monthly, duration_type, bathroom_type, facilities, rules, image_url, total_rooms, available_rooms, status)
            VALUES (?, ?, ?, ?, ?, ?, 'Bulanan', ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $user['id'], $name, $body['type'] ?? 'Campur', $city, trim($body['address'] ?? ''),
            $price, $body['bathroom_type'] ?? 'Dalam', json_encode($body['facilities'] ?? []),
            trim($body['rules'] ?? ''), $img, $rooms, $rooms, $status
        ]);

        $msg = $status === 'Approved'
            ? 'Properti baru berhasil dipublikasikan.'
            : 'Properti dikirim! Menunggu persetujuan Admin agar tampil di katalog.';
        sendResponse('success', $msg);
        break;

    case 'update':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        $user = requireAuth(['admin', 'landlord']);
        $id   = (int)($body['id'] ?? 0);

        $avail = max(0, (int)($body['available_rooms'] ?? 0));
        $sql = "UPDATE kosts SET name=?, type=?, city=?, address=?, price_monthly=?, bathroom_type=?, facilities=?, rules=?, image_url=?, available_rooms=?, total_rooms=GREATEST(total_rooms, ?) WHERE id=?";
        $params = [
            trim($body['name']), $body['type'], trim($body['city']), trim($body['address']),
            (int)$body['price_monthly'], $body['bathroom_type'], json_encode($body['facilities'] ?? []),
            trim($body['rules'] ?? ''), trim($body['image_url']), $avail, $avail, $id
        ];

        if ($user['role'] !== 'admin') {
            $sql .= " AND owner_id = ?";
            $params[] = $user['id'];
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        sendResponse('success', 'Data properti berhasil diperbarui.');
        break;

    case 'approve':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        requireAuth(['admin']);
        $id     = (int)($body['id'] ?? 0);
        $status = in_array($body['status'] ?? '', ['Approved', 'Pending'], true) ? $body['status'] : 'Approved';

        $pdo->prepare("UPDATE kosts SET status = ? WHERE id = ?")->execute([$status, $id]);
        sendResponse('success', "Status properti diubah menjadi {$status}.");
        break;

    case 'delete':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        $user = requireAuth(['admin', 'landlord']);
        $id   = (int)($body['id'] ?? 0);

        $sql    = "DELETE FROM kosts WHERE id = ?" . ($user['role'] !== 'admin' ? " AND owner_id = ?" : "");
        $params = $user['role'] !== 'admin' ? [$id, $user['id']] : [$id];

        $pdo->prepare($sql)->execute($params);
        sendResponse('success', 'Properti berhasil dihapus.');
        break;

    case 'toggle_favorite':
        if ($method !== 'POST') sendResponse('error', 'Metode tidak diizinkan', null, 405);
        $user   = requireAuth();
        $kostId = (int)($body['kost_id'] ?? 0);

        $check = $pdo->prepare("SELECT id FROM favorites WHERE user_id = ? AND kost_id = ?");
        $check->execute([$user['id'], $kostId]);
        if ($check->fetch()) {
            $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND kost_id = ?")->execute([$user['id'], $kostId]);
            sendResponse('success', 'Dihapus dari favorit', ['favorited' => false]);
        } else {
            $pdo->prepare("INSERT INTO favorites (user_id, kost_id) VALUES (?, ?)")->execute([$user['id'], $kostId]);
            sendResponse('success', 'Disimpan ke favorit', ['favorited' => true]);
        }
        break;

    default:
        sendResponse('error', 'Endpoint kost tidak valid.', null, 404);
}
