-- Database: `db_kostify`
-- Full Updated Schema (Admin, Landlord, Tenant)

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `db_kostify` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `db_kostify`;

DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `kosts`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('admin','landlord','tenant') NOT NULL DEFAULT 'tenant',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Password semua akun demo: password123
INSERT INTO `users` (`id`, `name`, `email`, `password`, `phone`, `role`) VALUES
(1, 'Hendra Wijaya (Owner)', 'owner@example.com', '$2y$10$vI8aWBnW3fID.ZQ4/zo1G.qH0vJ2vF88tY7c7R3qU6jBfU8e1tK4K', '081234567890', 'landlord'),
(2, 'Sarah Amalia (Penyewa)', 'tenant@example.com', '$2y$10$vI8aWBnW3fID.ZQ4/zo1G.qH0vJ2vF88tY7c7R3qU6jBfU8e1tK4K', '089876543210', 'tenant'),
(3, 'Super Admin (Pemilik Web)', 'admin@example.com', '$2y$10$vI8aWBnW3fID.ZQ4/zo1G.qH0vJ2vF88tY7c7R3qU6jBfU8e1tK4K', '081100009999', 'admin');

CREATE TABLE `kosts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `type` enum('Putra','Putri','Campur') NOT NULL,
  `city` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `price_monthly` int(11) NOT NULL,
  `duration_type` enum('Harian','Bulanan','Tahunan') DEFAULT 'Bulanan',
  `bathroom_type` enum('Dalam','Luar') DEFAULT 'Dalam',
  `facilities` text NOT NULL,
  `rules` text DEFAULT NULL,
  `image_url` text NOT NULL,
  `rating` decimal(2,1) DEFAULT 4.8,
  `total_rooms` int(11) DEFAULT 5,
  `available_rooms` int(11) DEFAULT 5,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `kosts_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `kosts` (`id`, `owner_id`, `name`, `type`, `city`, `address`, `price_monthly`, `duration_type`, `bathroom_type`, `facilities`, `rules`, `image_url`, `rating`, `total_rooms`, `available_rooms`) VALUES
(1, 1, 'Verdant Hills Executive Living', 'Campur', 'Bandung', 'Jl. Bukit Pakar No. 88, Ciburial', 2750000, 'Bulanan', 'Dalam', '["AC", "Wi-Fi", "Kasur", "Lemari", "Bebas 24 Jam", "Parkir"]', 'Tidak boleh merokok di dalam kamar, Tamu lawan jenis dilarang menginap', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', 4.9, 10, 4),
(2, 1, 'Griya Amartha Kost Putri', 'Putri', 'Jakarta Selatan', 'Jl. Tebet Barat Dalam No. 12', 1850000, 'Bulanan', 'Dalam', '["AC", "Wi-Fi", "Kasur", "Lemari", "Parkir"]', 'Gerbang tutup pukul 23:00 WIB, Khusus putri single/mahasiswi', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80', 4.8, 8, 2),
(3, 1, 'Pavilion Residence Senayan', 'Campur', 'Jakarta Pusat', 'Jl. Asia Afrika No. 45', 3500000, 'Bulanan', 'Dalam', '["AC", "Wi-Fi", "Kasur", "Lemari", "Bebas 24 Jam", "Parkir"]', 'Menjaga kebersihan dan ketenangan lingkungan sekitar', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80', 5.0, 6, 1),
(4, 1, 'Kost Arya Man Putra', 'Putra', 'Yogyakarta', 'Jl. Kaliurang KM 5, Sleman', 950000, 'Bulanan', 'Luar', '["Wi-Fi", "Kasur", "Lemari", "Parkir"]', 'Dilarang membawa miras dan narkoba', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80', 4.6, 12, 5);

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kost_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `duration_months` int(11) NOT NULL DEFAULT 1,
  `total_price` int(11) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `kost_id` (`kost_id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`kost_id`) REFERENCES `kosts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `favorites` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `kost_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_kost_unique` (`user_id`,`kost_id`),
  KEY `kost_id` (`kost_id`),
  CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`kost_id`) REFERENCES `kosts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;
