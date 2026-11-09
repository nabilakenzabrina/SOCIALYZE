# Socialyze Creative Agency — Django + MySQL

Proyek ini mempertahankan desain frontend Socialyze yang diberikan dan memindahkan penyimpanan pesanan/konsultasi dari `localStorage` ke backend Django dengan database MySQL.

## Fitur yang terhubung
- Homepage, aset, gaya, animasi, dan visual 3D asli tetap dipakai.
- Keranjang belanja masih disimpan di browser untuk kenyamanan pengguna.
- Form pesanan dikirim ke endpoint Django `/api/orders/` dan disimpan ke tabel MySQL `Order`.
- Form konsultasi dikirim ke `/api/consultations/` dan disimpan ke tabel MySQL `Consultation`.
- Dashboard internal memakai sesi dan autentikasi Django; akun harus mempunyai izin `staff`.
- Admin bisa mengubah status/menghapus pesanan dan mengekspor daftar pesanan ke CSV.
- Django Admin tersedia di `/django-admin/`.
- Metode pembayaran masih berupa pilihan demo; tidak ada payment gateway atau pembayaran otomatis.

## Persyaratan
- Python 3.10+
- MySQL Server 8+
- Koneksi internet untuk Google Fonts dan Three.js CDN

## Menjalankan di Windows / VS Code

1. Ekstrak ZIP, lalu buka folder proyek ini di VS Code.
2. Buat virtual environment:

   ```powershell
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   ```

3. Pasang dependensi:

   ```powershell
   python -m pip install -r requirements.txt
   ```

   Jika instalasi `mysqlclient` gagal di Windows, instal compiler/build tools yang diperlukan atau gunakan lingkungan Python yang kompatibel dengan wheel `mysqlclient`.

4. Buat database dan user MySQL. Jalankan di MySQL client sebagai pengguna yang berwenang:

   ```sql
   CREATE DATABASE socialyze_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'socialyze_user'@'localhost' IDENTIFIED BY 'ganti-password-ini';
   GRANT ALL PRIVILEGES ON socialyze_db.* TO 'socialyze_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. Salin `.env.example` menjadi `.env`, lalu isi `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, `MYSQL_PORT`, dan `DJANGO_SECRET_KEY` sesuai komputer kamu. Jangan unggah `.env` ke repositori publik.
6. Jalankan migrasi database:

   ```powershell
   python manage.py makemigrations website
   python manage.py migrate
   ```

7. Buat akun admin/staff:

   ```powershell
   python manage.py createsuperuser
   ```

8. Jalankan server:

   ```powershell
   python manage.py runserver
   ```

9. Buka `http://127.0.0.1:8000/`. Halaman admin Socialyze ada di `http://127.0.0.1:8000/staff-login/`; Django Admin ada di `http://127.0.0.1:8000/django-admin/`.

## Catatan penting
- Pesanan dan konsultasi baru akan tersimpan di MySQL setelah server Django berjalan.
- Keranjang tetap berada di `localStorage`, tetapi harga pesanan dihitung ulang oleh backend berdasarkan katalog paket yang diizinkan.
- Data pesanan/konsultasi lama yang tersimpan di `localStorage` browser tidak otomatis dipindahkan. Jika perlu dipertahankan, ekspor data lama terlebih dahulu dan lakukan impor terkontrol.
- Fitur chat tidak ditemukan di ZIP yang diterima, jadi tidak dibuat ulang tanpa kode/sumber fitur chat.
- Tidak ada kode Supabase aktif pada ZIP yang diterima; perubahan yang dilakukan mengganti penyimpanan demo browser menjadi Django + MySQL.
- Sebelum deployment publik, ubah `DJANGO_DEBUG=False`, buat `DJANGO_SECRET_KEY` acak yang kuat, atur `DJANGO_ALLOWED_HOSTS`, aktifkan HTTPS, dan siapkan backup database.


## Fitur akun sesuai instruksi tugas
- Daftar pengguna: `/register/`
- Login pengguna: `/login/`
- Dashboard pengguna dan pembaruan profil: `/my-dashboard/`
- Login admin: `/staff-login/`
- Dashboard admin: `/dashboard/`
- Pembaruan profil admin: `/admin-profile/`
- Logout: tombol Logout/Keluar di halaman akun.

Akun admin dibuat menggunakan `python manage.py createsuperuser`. Akun pengguna biasa dapat dibuat dari halaman Daftar. Riwayat pesanan pada dashboard pengguna dicocokkan menggunakan email akun; pesanan yang dibuat memakai email berbeda tidak akan muncul di dashboard akun tersebut.
