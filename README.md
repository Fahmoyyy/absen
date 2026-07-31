# Absensi KKN

Sistem absensi berbasis QR code harian. Admin generate & cetak QR tiap hari, peserta scan QR untuk absen. Data disimpan di Google Sheets.

## Struktur

- `index.html` — menu utama (pilih Admin / Absen)
- `admin.html` + `js/admin.js` — login admin, generate/cetak QR harian, rekap kehadiran
- `scan.html` + `js/scan.js` — scan QR pakai kamera, pilih nama, submit absen
- `apps-script/Code.gs` — backend (Google Apps Script) yang membaca/menulis ke Google Sheets
- `js/config.js` — tempat mengisi URL Apps Script setelah deploy

## Setup

### 1. Buat Google Spreadsheet

Buat spreadsheet baru dengan 4 sheet (tab), nama harus persis:

- **Peserta** — kolom A = `NIM`, kolom B = `Nama`, kolom C = `Password`. Isi baris 1 sebagai header. Data peserta (termasuk password) lebih gampang diisi lewat menu **Kelola Peserta** di `admin.html`, tapi boleh juga diisi manual langsung di sheet ini.
- **QR_Tokens** — kolom A = `Tanggal`, B = `Token`, C = `DibuatPada`. Cukup isi header di baris 1, sisanya terisi otomatis.
- **Absensi** — kolom A = `Tanggal`, B = `NIM`, C = `Nama`, D = `Waktu`, E = `Status`. Cukup isi header, sisanya otomatis.
- **Laporan** — kolom A = `Tanggal`, B = `NIM`, C = `Nama`, D = `Judul`, E = `NamaFile`, F = `URL`, G = `Waktu`. Cukup isi header, sisanya otomatis terisi saat peserta upload laporan. File laporannya sendiri disimpan di folder Google Drive bernama **"Laporan Absensi KKN"** (dibuat otomatis di Drive akun admin saat upload pertama).

### 2. Deploy Apps Script

1. Di spreadsheet, buka **Extensions > Apps Script**.
2. Hapus isi default, paste seluruh isi `apps-script/Code.gs`.
3. Ganti `SHEET_ID` dengan ID spreadsheet (lihat di URL spreadsheet: `.../d/ID_SPREADSHEET/edit`).
4. Ganti `ADMIN_PASSWORD` dengan password admin pilihanmu.
5. Klik **Deploy > New deployment** → pilih tipe **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Klik Deploy, izinkan akses (authorize) saat diminta, lalu copy **URL Web App** yang muncul.

### 3. Hubungkan frontend ke backend

Buka `js/config.js`, ganti isinya:

```js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

### 4. Deploy ke Vercel

Push folder ini ke GitHub, lalu import project-nya di [vercel.com](https://vercel.com) (tidak perlu build command, ini pure static site). Atau pakai Vercel CLI:

```
vercel
```

## Cara Pakai

**Admin (setup awal + setiap hari):**
1. Buka `admin.html`, login pakai password admin.
2. Di menu **Kelola Peserta**, tambahkan setiap peserta KKN (NIM, Nama, Password) — password ini yang nanti diberi tahu ke peserta untuk login di HP mereka. Bisa juga Edit nama, Reset Password, atau Hapus peserta dari sini.
3. Setiap hari, buka menu **QR Hari Ini**, klik "Tampilkan / Buat QR Hari Ini" — QR baru otomatis dibuat sekali per hari (kalau dibuka ulang, QR yang sama akan muncul lagi, tidak dobel), lalu klik "Cetak QR" untuk print dan tempel di lokasi absen.
4. Untuk cek kehadiran, buka menu **Rekap Kehadiran**, pilih tanggal, klik "Muat Rekap". Ringkasan jumlah hadir juga tampil di **Dashboard**.

**Peserta (sekali di HP masing-masing):**
1. Buka `scan.html` di HP.
2. Login pakai NIM + password yang sudah diberikan admin.
3. Setelah login, identitas disimpan di HP tsb — kunjungan berikutnya langsung masuk ke halaman scan tanpa perlu login lagi (kecuali klik "Ganti Akun").
4. Ada 2 tab: **Absen** (izinkan akses kamera, scan QR yang ditempel — absen otomatis tercatat) dan **Laporan** (upload file laporan + judul/keterangan, dan lihat semua laporan yang sudah diupload peserta lain).

## Catatan

- QR berbeda tiap hari (berisi token unik + tanggal). QR kemarin otomatis ditolak kalau di-scan hari berikutnya.
- Sistem mencegah 1 peserta absen 2x di hari yang sama.
- Menambah/mengubah daftar peserta cukup edit langsung sheet **Peserta** di Google Sheets — tidak perlu redeploy apa pun.
- Password peserta disimpan apa adanya (plain text) di sheet **Peserta** kolom C — cukup aman untuk kebutuhan internal KKN, tapi jangan pakai password yang sama dengan akun penting lain.
- Semua peserta yang sudah login bisa melihat & mengunduh semua laporan yang pernah diupload (linknya bersifat "siapa saja yang punya link bisa lihat"), jadi jangan upload file yang sifatnya rahasia/pribadi ke sini.
