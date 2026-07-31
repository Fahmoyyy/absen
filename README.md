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

Buat spreadsheet baru dengan 3 sheet (tab), nama harus persis:

- **Peserta** — kolom A = `NIM`, kolom B = `Nama`. Isi baris 1 sebagai header, lalu isi daftar peserta KKN mulai baris 2.
- **QR_Tokens** — kolom A = `Tanggal`, B = `Token`, C = `DibuatPada`. Cukup isi header di baris 1, sisanya terisi otomatis.
- **Absensi** — kolom A = `Tanggal`, B = `NIM`, C = `Nama`, D = `Waktu`, E = `Status`. Cukup isi header, sisanya otomatis.

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

**Admin (setiap hari):**
1. Buka `admin.html`, login pakai password admin.
2. Klik "Tampilkan / Buat QR Hari Ini" — QR baru otomatis dibuat sekali per hari (kalau dibuka ulang, QR yang sama akan muncul lagi, tidak dobel).
3. Klik "Cetak QR" untuk print dan tempel di lokasi absen.
4. Untuk cek kehadiran, buka bagian "Rekap Kehadiran", pilih tanggal, klik "Muat Rekap".

**Peserta:**
1. Buka `scan.html` di HP, izinkan akses kamera.
2. Scan QR yang ditempel.
3. Cari & pilih nama sendiri dari daftar, klik "Konfirmasi Absen".

## Catatan

- QR berbeda tiap hari (berisi token unik + tanggal). QR kemarin otomatis ditolak kalau di-scan hari berikutnya.
- Sistem mencegah 1 peserta absen 2x di hari yang sama.
- Menambah/mengubah daftar peserta cukup edit langsung sheet **Peserta** di Google Sheets — tidak perlu redeploy apa pun.
