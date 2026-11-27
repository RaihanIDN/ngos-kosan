import { apiRequest, showToast } from "./api.js";
import { initGlobalAnimations, observeKostCards } from "./animations.js";

let searchTimer = null;

const app = {
    currentUser: null,
    kostsData: [],
    dashboardKosts: [],

    init() {
        initGlobalAnimations();
        this.checkSession();
        this.fetchKosts();
        this.bindEvents();
    },

    bindEvents() {
        const priceSlider = document.getElementById("filterPrice");
        const priceLabel = document.getElementById("priceLabel");
        if (priceSlider && priceLabel) {
            priceSlider.addEventListener("input", (e) => {
                priceLabel.innerText = `Rp ${Number(e.target.value).toLocaleString("id-ID")} / bln`;
            });
        }

        const searchInput = document.getElementById("filterSearch");
        if (searchInput) {
            searchInput.addEventListener("input", () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => this.fetchKosts(), 350);
            });
        }
    },

    isAdmin() {
        return this.currentUser && this.currentUser.role === "admin";
    },

    isManager() {
        return this.currentUser && ["admin", "landlord"].includes(this.currentUser.role);
    },

    getInitials(name = "") {
        return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "U";
    },

    getRoleLabel(role) {
        if (role === "admin") return "Admin Web";
        if (role === "landlord") return "Pemilik Kost";
        return "Penyewa";
    },

    // --- AUTH & PROFILE ---
    async checkSession() {
        try {
            const data = await apiRequest("auth.php?action=check_session");
            this.currentUser = data.status === "success" ? data.data : null;
            this.renderNavAuth();
        } catch (err) {
            console.error("Gagal cek sesi:", err);
        }
    },

    renderNavAuth() {
        const authArea = document.getElementById("navAuthArea");
        const mobileAvatarArea = document.getElementById("mobileAvatarArea");
        const linkRiwayat = document.getElementById("linkRiwayat");
        const linkLandlord = document.getElementById("linkLandlord");
        const drawerLinks = document.getElementById("mobileDrawerLinks");

        if (this.currentUser) {
            const initials = this.getInitials(this.currentUser.name);
            const roleLabel = this.getRoleLabel(this.currentUser.role);
            const roleClass = `role-badge-${this.currentUser.role}`;

            authArea.innerHTML = `
                <button class="profile-pill" onclick="app.openProfileModal()" title="Lihat & Edit Profil">
                    <span class="avatar-circle">${initials}</span>
                    <span class="profile-pill-info">
                        <strong>${this.currentUser.name}</strong>
                        <span class="role-badge ${roleClass}">${roleLabel}</span>
                    </span>
                </button>
                <button class="btn btn-outline" onclick="app.handleLogout()" title="Keluar" style="padding:8px 12px;">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            `;

            if (mobileAvatarArea) {
                mobileAvatarArea.innerHTML = `
                    <button class="avatar-circle avatar-mobile-btn" onclick="app.openProfileModal()" title="Profil Saya">
                        ${initials}
                    </button>
                `;
            }

            linkLandlord.style.display = this.isManager() ? "inline-block" : "none";
            linkLandlord.innerText = this.isAdmin() ? "Panel Admin" : "Dashboard Pemilik";
            linkRiwayat.style.display = this.isManager() ? "none" : "inline-block";
        } else {
            authArea.innerHTML = `<button class="btn btn-outline" onclick="app.openModal('modalAuth')">Masuk / Daftar</button>`;
            if (mobileAvatarArea) mobileAvatarArea.innerHTML = "";
            linkLandlord.style.display = "none";
            linkRiwayat.style.display = "none";
        }

        if (drawerLinks) {
            const userBanner = this.currentUser ? `
                <div class="drawer-user-box" onclick="app.openProfileModal(); app.toggleMobileMenu(false)">
                    <span class="avatar-circle">${this.getInitials(this.currentUser.name)}</span>
                    <div>
                        <strong style="display:block;font-size:0.92rem;">${this.currentUser.name}</strong>
                        <span class="role-badge role-badge-${this.currentUser.role}">${this.getRoleLabel(this.currentUser.role)}</span>
                    </div>
                </div>
            ` : "";

            drawerLinks.innerHTML = `
                ${userBanner}
                <a href="javascript:void(0)" onclick="app.showHomeView(); app.toggleMobileMenu(false)">Eksplorasi Kost</a>
                <a href="#features" onclick="app.showHomeView(); app.toggleMobileMenu(false)">Keunggulan</a>
                ${this.currentUser ? `<a href="javascript:void(0)" onclick="app.openProfileModal(); app.toggleMobileMenu(false)">Profil Saya</a>` : ""}
                ${this.isManager() ? `<a href="javascript:void(0)" onclick="app.showLandlordDashboard(); app.toggleMobileMenu(false)">${this.isAdmin() ? "Panel Admin" : "Dashboard Pemilik"}</a>` : ""}
                ${this.currentUser && !this.isManager() ? `<a href="javascript:void(0)" onclick="app.showBookingsHistory(); app.toggleMobileMenu(false)">Riwayat Sewa</a>` : ""}
                ${this.currentUser
                    ? `<button class="btn btn-outline btn-block" onclick="app.handleLogout(); app.toggleMobileMenu(false)">Keluar</button>`
                    : `<button class="btn btn-primary btn-block" onclick="app.openModal('modalAuth'); app.toggleMobileMenu(false)">Masuk / Daftar</button>`
                }
            `;
        }
    },

    openProfileModal() {
        if (!this.currentUser) return this.openModal("modalAuth");
        document.getElementById("profileAvatarBig").innerText = this.getInitials(this.currentUser.name);
        document.getElementById("profileRoleBadge").innerText = this.getRoleLabel(this.currentUser.role);
        document.getElementById("profileRoleBadge").className = `role-badge role-badge-${this.currentUser.role}`;
        document.getElementById("profileEmailText").innerText = this.currentUser.email;
        document.getElementById("profName").value = this.currentUser.name || "";
        document.getElementById("profPhone").value = this.currentUser.phone || "";
        document.getElementById("profNewPassword").value = "";
        this.openModal("modalProfile");
    },

    async handleUpdateProfile(e) {
        e.preventDefault();
        const res = await apiRequest("auth.php?action=update_profile", {
            method: "POST",
            body: JSON.stringify({
                name: document.getElementById("profName").value,
                phone: document.getElementById("profPhone").value,
                new_password: document.getElementById("profNewPassword").value
            })
        });
        showToast(res.message, res.status === "success" ? "success" : "error");
        if (res.status === "success") {
            this.currentUser = res.data;
            this.renderNavAuth();
            this.closeModal("modalProfile");
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const res = await apiRequest("auth.php?action=login", {
            method: "POST",
            body: JSON.stringify({
                email: document.getElementById("loginEmail").value,
                password: document.getElementById("loginPassword").value
            })
        });
        showToast(res.message, res.status === "success" ? "success" : "error");
        if (res.status === "success") {
            this.currentUser = res.data;
            this.closeModal("modalAuth");
            this.renderNavAuth();
            this.fetchKosts();
            if (this.isManager()) this.showLandlordDashboard();
            else this.showHomeView();
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const res = await apiRequest("auth.php?action=register", {
            method: "POST",
            body: JSON.stringify({
                name: document.getElementById("regName").value,
                email: document.getElementById("regEmail").value,
                phone: document.getElementById("regPhone").value,
                password: document.getElementById("regPassword").value,
                role: document.getElementById("regRole").value
            })
        });
        showToast(res.message, res.status === "success" ? "success" : "error");
        if (res.status === "success") this.switchAuthTab("login");
    },

    async handleLogout() {
        await apiRequest("auth.php?action=logout");
        this.currentUser = null;
        this.renderNavAuth();
        this.showHomeView();
        this.fetchKosts();
        showToast("Anda telah keluar.");
    },

    // --- KOST LISTING ---
    async fetchKosts() {
        const params = new URLSearchParams({
            search: document.getElementById("filterSearch").value,
            type: document.getElementById("filterType").value,
            max_price: document.getElementById("filterPrice").value
        });
        const res = await apiRequest(`kost.php?action=list&${params.toString()}`);
        if (res.status === "success") {
            this.kostsData = res.data;
            this.renderKosts(this.kostsData);
        }
    },

    renderKosts(kosts) {
        const container = document.getElementById("kostListContainer");
        if (!kosts.length) {
            container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;"><p class="text-muted">Properti tidak ditemukan. Coba ubah filter pencarian.</p></div>`;
            return;
        }
        container.innerHTML = kosts.map(k => `
            <div class="property-card">
                <div class="property-thumb">
                    <img src="${k.image_url}" alt="${k.name}" loading="lazy" decoding="async">
                    <span class="badge-tag">${k.type}</span>
                    <button class="btn-fav ${k.is_favorite ? "active" : ""}" onclick="app.toggleFavorite(${k.id}, this)" title="Simpan Favorit">
                        <i class="fa-${k.is_favorite ? "solid" : "regular"} fa-heart"></i>
                    </button>
                </div>
                <div class="property-body">
                    <h3 class="property-title">${k.name}</h3>
                    <p class="property-location"><i class="fa-solid fa-map-pin"></i> ${k.city} - ${k.address}</p>
                    <div class="amenities-badges">
                        ${k.facilities.slice(0, 3).map(f => `<span class="amenity-pill">${f}</span>`).join("")}
                        ${k.facilities.length > 3 ? `<span class="amenity-pill">+${k.facilities.length - 3}</span>` : ""}
                    </div>
                    <div class="property-footer">
                        <div class="price-text">Rp ${Number(k.price_monthly).toLocaleString("id-ID")}<span> / bln</span></div>
                        <button class="btn btn-primary" onclick="app.openKostDetail(${k.id})">Detail</button>
                    </div>
                </div>
            </div>
        `).join("");

        observeKostCards();
    },

    async toggleFavorite(kostId, btn) {
        if (!this.currentUser) {
            showToast("Silakan masuk untuk menyimpan favorit.", "error");
            return this.openModal("modalAuth");
        }
        const res = await apiRequest("kost.php?action=toggle_favorite", {
            method: "POST",
            body: JSON.stringify({ kost_id: kostId })
        });
        if (res.status === "success") {
            btn.classList.toggle("active", res.data.favorited);
            btn.innerHTML = `<i class="fa-${res.data.favorited ? "solid" : "regular"} fa-heart"></i>`;
            showToast(res.message);
        }
    },

    setQuickFilter(type, el) {
        document.querySelectorAll(".filter-quick-chips .chip").forEach(c => c.classList.remove("active"));
        el.classList.add("active");
        document.getElementById("filterType").value = type;
        this.fetchKosts();
    },

    async openKostDetail(id) {
        const res = await apiRequest(`kost.php?action=detail&id=${id}`);
        if (res.status !== "success") return showToast(res.message, "error");
        const k = res.data;
        const waText = encodeURIComponent(`Halo, saya tertarik dengan ${k.name} di Ngos-kosan. Apakah kamar masih tersedia?`);
        const waNum = (k.owner_phone || "").replace(/^0/, "62");

        document.getElementById("modalDetailBody").innerHTML = `
            <img src="${k.image_url}" alt="${k.name}" style="width:100%;height:280px;object-fit:cover;border-radius:12px;margin-bottom:15px;">
            <h2>${k.name}</h2>
            <p class="text-muted" style="margin-bottom:15px;"><i class="fa-solid fa-location-dot"></i> ${k.address}, ${k.city}</p>
            <div class="amenities-badges" style="margin-bottom:15px;">
                <span class="amenity-pill">KM ${k.bathroom_type}</span>
                <span class="amenity-pill">Sisa ${k.available_rooms} Kamar</span>
                <span class="amenity-pill">Pemilik: ${k.owner_name}</span>
            </div>
            <h4>Fasilitas</h4>
            <div class="facilities-checkbox-grid" style="margin:8px 0 15px;">
                ${k.facilities.map(f => `<div><i class="fa-solid fa-check" style="color:var(--primary)"></i> ${f}</div>`).join("")}
            </div>
            <h4>Peraturan</h4>
            <p class="text-muted" style="margin-bottom:20px;">${k.rules || "Menjaga ketertiban bersama."}</p>
            <div class="property-footer" style="gap:10px;flex-wrap:wrap;">
                <div class="price-text">Rp ${Number(k.price_monthly).toLocaleString("id-ID")}<span> / bln</span></div>
                <div style="display:flex;gap:8px;">
                    ${waNum ? `<a href="https://wa.me/${waNum}?text=${waText}" target="_blank" class="btn btn-outline"><i class="fa-brands fa-whatsapp"></i> Chat</a>` : ""}
                    <button class="btn btn-primary" onclick="app.startBookingProcess(${k.id}, '${k.name.replace(/'/g, "\'")}', ${k.price_monthly})">Ajukan Sewa</button>
                </div>
            </div>
        `;
        this.openModal("modalDetail");
    },

    // --- BOOKING ---
    startBookingProcess(id, name, price) {
        if (!this.currentUser) {
            this.closeModal("modalDetail");
            showToast("Silakan login terlebih dahulu.", "error");
            return this.openModal("modalAuth");
        }
        this.closeModal("modalDetail");
        document.getElementById("bookingKostId").value = id;
        document.getElementById("bookingKostTitle").innerText = name;
        document.getElementById("bookingMonthlyRate").value = price;
        document.getElementById("bookingStartDate").value = new Date().toISOString().split("T")[0];
        this.calculateBookingPrice();
        this.openModal("modalBooking");
    },

    calculateBookingPrice() {
        const rate = Number(document.getElementById("bookingMonthlyRate").value) || 0;
        const dur = Number(document.getElementById("bookingDuration").value) || 1;
        document.getElementById("bookingRateText").innerText = `Rp ${rate.toLocaleString("id-ID")} x ${dur} Bln`;
        document.getElementById("bookingTotalPriceText").innerText = `Rp ${(rate * dur).toLocaleString("id-ID")}`;
    },

    async submitBooking(e) {
        e.preventDefault();
        const res = await apiRequest("booking.php?action=create", {
            method: "POST",
            body: JSON.stringify({
                kost_id: document.getElementById("bookingKostId").value,
                start_date: document.getElementById("bookingStartDate").value,
                duration_months: document.getElementById("bookingDuration").value,
                payment_method: document.getElementById("bookingPaymentMethod").value
            })
        });
        showToast(res.message, res.status === "success" ? "success" : "error");
        if (res.status === "success") {
            this.closeModal("modalBooking");
            this.showBookingsHistory();
        }
    },

    async showBookingsHistory() {
        this.switchView("bookingsHistoryView");
        const res = await apiRequest("booking.php?action=my_bookings");
        const container = document.getElementById("tenantBookingsContainer");
        if (res.status !== "success" || !res.data.length) {
            container.innerHTML = `<p class="text-muted">Belum ada riwayat pengajuan sewa.</p>`;
            return;
        }
        container.innerHTML = res.data.map(b => `
            <div class="property-card" style="opacity:1">
                <div class="property-thumb" style="height:150px;">
                    <img src="${b.image_url}" alt="${b.kost_name}" loading="lazy">
                    <span class="badge-tag">${b.status}</span>
                </div>
                <div class="property-body">
                    <h3>${b.kost_name}</h3>
                    <p class="text-muted">Mulai: ${b.start_date} (${b.duration_months} Bulan)</p>
                    <p class="text-muted">Metode: ${b.payment_method}</p>
                    <div class="property-footer"><strong>Rp ${Number(b.total_price).toLocaleString("id-ID")}</strong></div>
                </div>
            </div>
        `).join("");
    },

    // --- DASHBOARD ADMIN & PEMILIK ---
    async showLandlordDashboard() {
        this.switchView("landlordView");

        // Bedakan judul & panel khusus Admin
        const isAdmin = this.isAdmin();
        document.getElementById("dashboardTitle").innerText = isAdmin ? "Panel Super Admin Website" : "Dashboard Pemilik Kost";
        document.getElementById("dashboardSubtitle").innerText = isAdmin
            ? "Verifikasi kost baru, kelola seluruh properti, booking, dan akun pengguna."
            : "Kelola properti milik Anda, pantau okupansi, dan konfirmasi booking.";
        document.getElementById("adminUsersCard").style.display = isAdmin ? "block" : "none";

        const res = await apiRequest("booking.php?action=dashboard");
        if (res.status !== "success") return showToast(res.message, "error");

        const { stats, kosts, bookings } = res.data;
        this.dashboardKosts = kosts;

        document.getElementById("statTotalProps").innerText = stats.total_properties;
        document.getElementById("statOccupancy").innerText = `${stats.occupancy_rate}% (${stats.occupied_rooms}/${stats.total_rooms})`;
        document.getElementById("statRevenue").innerText = `Rp ${Number(stats.total_revenue).toLocaleString("id-ID")}`;

        const propTable = document.getElementById("landlordKostTable");
        propTable.innerHTML = kosts.length ? kosts.map(k => {
            const st = k.status || "Approved";
            const ownerInfo = k.owner_name ? `<br><small style="color:var(--primary)">Pemilik: ${k.owner_name}</small>` : "";
            return `
            <tr>
                <td><strong>${k.name}</strong><br><small class="text-muted">${k.city} (${k.type})</small>${ownerInfo}</td>
                <td>Rp ${Number(k.price_monthly).toLocaleString("id-ID")}</td>
                <td>${k.available_rooms} / ${k.total_rooms} Kamar</td>
                <td><span class="status-pill status-${st.toLowerCase()}">${st}</span></td>
                <td style="white-space:nowrap;">
                    ${isAdmin && st === "Pending" ? `<button class="btn btn-primary" style="padding:4px 10px;font-size:0.8rem;" onclick="app.approveKost(${k.id}, 'Approved')">Setujui</button>` : ""}
                    <button class="btn btn-outline" style="padding:4px 10px;font-size:0.8rem;" onclick="app.openEditKost(${k.id})">Edit</button>
                    <button class="btn btn-outline" style="padding:4px 10px;font-size:0.8rem;border-color:#dc2626;color:#dc2626;" onclick="app.deleteKost(${k.id})">Hapus</button>
                </td>
            </tr>
        `;
        }).join("") : `<tr><td colspan="5" style="text-align:center;">Belum ada properti.</td></tr>`;

        const bookTable = document.getElementById("landlordBookingTableings");
        bookTable.innerHTML = bookings.length ? bookings.map(b => `
            <tr>
                <td><strong>${b.kost_name}</strong></td>
                <td>${b.tenant_name}</td>
                <td>${b.tenant_phone || "-"}</td>
                <td>${b.start_date}</td>
                <td>${b.duration_months} Bln</td>
                <td>Rp ${Number(b.total_price).toLocaleString("id-ID")}</td>
                <td>${b.payment_method}</td>
                <td><span class="amenity-pill">${b.status}</span></td>
                <td>
                    ${b.status === "Pending" ? `
                        <button class="btn btn-primary" style="padding:4px 8px;font-size:0.8rem;" onclick="app.updateBookingStatus(${b.id}, 'Approved')">Terima</button>
                        <button class="btn btn-outline" style="padding:4px 8px;font-size:0.8rem;border-color:#dc2626;color:#dc2626;" onclick="app.updateBookingStatus(${b.id}, 'Rejected')">Tolak</button>
                    ` : `<span class="text-muted">Selesai</span>`}
                </td>
            </tr>
        `).join("") : `<tr><td colspan="9" style="text-align:center;">Belum ada pengajuan booking.</td></tr>`;

        if (isAdmin) this.fetchAdminUsers();
    },

    async approveKost(id, status) {
        const res = await apiRequest("kost.php?action=approve", {
            method: "POST",
            body: JSON.stringify({ id, status })
        });
        showToast(res.message, res.status === "success" ? "success" : "error");
        if (res.status === "success") {
            this.showLandlordDashboard();
            this.fetchKosts();
        }
    },

    async fetchAdminUsers() {
        const res = await apiRequest("users.php?action=list");
        const tbody = document.getElementById("adminUsersTable");
        if (res.status !== "success" || !tbody) return;

        tbody.innerHTML = res.data.map(u => {
            const isSelf = this.currentUser && Number(u.id) === Number(this.currentUser.id);
            return `
            <tr>
                <td><strong>${u.name}</strong>${isSelf ? ' <small class="text-muted">(Anda)</small>' : ""}</td>
                <td>${u.email}</td>
                <td>${u.phone || "-"}</td>
                <td>
                    <select class="role-select" onchange="app.changeUserRole(${u.id}, this.value)" ${isSelf ? "disabled" : ""}>
                        <option value="tenant" ${u.role === "tenant" ? "selected" : ""}>Penyewa</option>
                        <option value="landlord" ${u.role === "landlord" ? "selected" : ""}>Pemilik Kost</option>
                        <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin Web</option>
                    </select>
                </td>
                <td>
                    ${isSelf ? `<span class="text-muted">-</span>` : `<button class="btn btn-outline" style="padding:4px 10px;font-size:0.8rem;border-color:#dc2626;color:#dc2626;" onclick="app.deleteUser(${u.id})">Hapus</button>`}
                </td>
            </tr>
            `;
        }).join("");
    },

    async changeUserRole(userId, role) {
        const res = await apiRequest("users.php?action=update_role", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, role })
        });
        showToast(res.message, res.status === "success" ? "success" : "error");
    },

    async deleteUser(userId) {
        if (!confirm("Yakin ingin menghapus akun pengguna ini?")) return;
        const res = await apiRequest("users.php?action=delete", {
            method: "POST",
            body: JSON.stringify({ user_id: userId })
        });
        showToast(res.message, res.status === "success" ? "success" : "error");
        if (res.status === "success") this.fetchAdminUsers();
    },

    openAddKost() {
        document.getElementById("formAddKost").reset();
        document.getElementById("kostEditId").value = "";
        document.getElementById("modalKostTitle").innerText = "Tambah Properti Kost Baru";
        this.openModal("modalAddKost");
    },

    openEditKost(id) {
        const k = this.dashboardKosts.find(item => item.id == id);
        if (!k) return;
        document.getElementById("kostEditId").value = k.id;
        document.getElementById("modalKostTitle").innerText = "Edit Properti Kost";
        document.getElementById("kostName").value = k.name;
        document.getElementById("kostType").value = k.type;
        document.getElementById("kostCity").value = k.city;
        document.getElementById("kostPrice").value = k.price_monthly;
        document.getElementById("kostAddress").value = k.address;
        document.getElementById("kostBathroom").value = k.bathroom_type;
        document.getElementById("kostRooms").value = k.available_rooms;
        document.getElementById("kostImage").value = k.image_url;
        document.getElementById("kostRules").value = k.rules || "";
        document.querySelectorAll('input[name="facilities"]').forEach(cb => {
            cb.checked = k.facilities.includes(cb.value);
        });
        this.openModal("modalAddKost");
    },

    async handleSaveKost(e) {
        e.preventDefault();
        const editId = document.getElementById("kostEditId").value;
        const facilities = Array.from(document.querySelectorAll('input[name="facilities"]:checked')).map(el => el.value);
        const payload = {
            id: editId,
            name: document.getElementById("kostName").value,
            type: document.getElementById("kostType").value,
            city: document.getElementById("kostCity").value,
            address: document.getElementById("kostAddress").value,
            price_monthly: document.getElementById("kostPrice").value,
            bathroom_type: document.getElementById("kostBathroom").value,
            total_rooms: document.getElementById("kostRooms").value,
            available_rooms: document.getElementById("kostRooms").value,
            image_url: document.getElementById("kostImage").value,
            facilities,
            rules: document.getElementById("kostRules").value
        };

        const action = editId ? "update" : "add";
        const res = await apiRequest(`kost.php?action=${action}`, { method: "POST", body: JSON.stringify(payload) });
        showToast(res.message, res.status === "success" ? "success" : "error");
        if (res.status === "success") {
            this.closeModal("modalAddKost");
            this.showLandlordDashboard();
            this.fetchKosts();
        }
    },

    async deleteKost(id) {
        if (!confirm("Yakin ingin menghapus properti ini?")) return;
        const res = await apiRequest("kost.php?action=delete", { method: "POST", body: JSON.stringify({ id }) });
        showToast(res.message, res.status === "success" ? "success" : "error");
        if (res.status === "success") {
            this.showLandlordDashboard();
            this.fetchKosts();
        }
    },

    async updateBookingStatus(bookingId, status) {
        const res = await apiRequest("booking.php?action=update_status", {
            method: "POST",
            body: JSON.stringify({ booking_id: bookingId, status })
        });
        showToast(res.message, res.status === "success" ? "success" : "error");
        this.showLandlordDashboard();
    },

    // --- UI HELPERS ---
    switchView(viewId) {
        ["homeView", "landlordView", "bookingsHistoryView"].forEach(id => {
            document.getElementById(id).style.display = id === viewId ? "block" : "none";
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    },
    showHomeView() { this.switchView("homeView"); },
    openModal(id) { document.getElementById(id)?.classList.add("active"); },
    closeModal(id) { document.getElementById(id)?.classList.remove("active"); },
    switchAuthTab(type) {
        document.getElementById("formLogin").style.display = type === "login" ? "block" : "none";
        document.getElementById("formRegister").style.display = type === "register" ? "block" : "none";
        document.getElementById("tabBtnLogin").classList.toggle("active", type === "login");
        document.getElementById("tabBtnRegister").classList.toggle("active", type === "register");
    },
    toggleMobileMenu(force) {
        const drawer = document.getElementById("mobileDrawer");
        if (typeof force === "boolean") drawer.classList.toggle("open", force);
        else drawer.classList.toggle("open");
    }
};

window.app = app;
document.addEventListener("DOMContentLoaded", () => app.init());
