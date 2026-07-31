// ============================================================
// ABSENSI KKN - Backend (Google Apps Script)
// ============================================================
// Cara pakai:
// 1. Buat Google Spreadsheet baru dengan 3 sheet/tab:
//    - "Peserta"   -> kolom A: NIM, B: Nama, C: Password. Isi lewat menu "Kelola Peserta" di admin.html
//                     (password wajib diisi admin saat menambahkan peserta), atau isi manual di sheet ini.
//    - "QR_Tokens" -> kolom A: Tanggal, B: Token, C: DibuatPada (biarkan kosong, diisi otomatis)
//    - "Absensi"   -> kolom A: Tanggal, B: NIM, C: Nama, D: Waktu, E: Status (biarkan kosong, diisi otomatis)
//    - "Laporan"   -> kolom A: Tanggal, B: NIM, C: Nama, D: Judul, E: NamaFile, F: URL, G: Waktu (biarkan kosong, diisi otomatis)
// 2. Buka Extensions > Apps Script di spreadsheet tsb, hapus isi default,
//    lalu paste seluruh isi file ini.
// 3. Ganti SHEET_ID dan ADMIN_PASSWORD di bawah ini.
// 4. Deploy > New deployment > Web app.
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy URL yang diberikan, tempel ke js/config.js (APPS_SCRIPT_URL).

const SHEET_ID = '17LMpzzUaOTVzZk13W4gvaBdekmSSbfHVj5ooFfUlDAY';
const ADMIN_PASSWORD = 'barset212';
const TIMEZONE = 'Asia/Jakarta';

function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function todayStr() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

function normalizeTanggal(value) {
  if (value instanceof Date) return Utilities.formatDate(value, TIMEZONE, 'yyyy-MM-dd');
  return String(value);
}

function jsonOut(obj) { 
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function checkAdmin(password) {
  return password === ADMIN_PASSWORD;
}

function doGet(e) {
  const action = e.parameter.action;
  try {
    switch (action) {
      case 'login':
        return jsonOut(login(e.parameter.username, e.parameter.password));
      case 'getPesertaAdmin':
        return jsonOut(getPesertaAdmin(e.parameter.password));
      case 'addPeserta':
        return jsonOut(addPeserta(e.parameter.password, e.parameter.nim, e.parameter.nama, e.parameter.pesertaPassword));
      case 'editPeserta':
        return jsonOut(editPeserta(e.parameter.password, e.parameter.nim, e.parameter.nama));
      case 'deletePeserta':
        return jsonOut(deletePeserta(e.parameter.password, e.parameter.nim));
      case 'resetPasswordPeserta':
        return jsonOut(resetPasswordPeserta(e.parameter.password, e.parameter.nim, e.parameter.newPassword));
      case 'generateToken':
        return jsonOut(generateToken(e.parameter.password));
      case 'getTodayToken':
        return jsonOut(getTodayToken(e.parameter.password));
      case 'submitAbsen':
        return jsonOut(submitAbsen(e.parameter));
      case 'getRekap':
        return jsonOut(getRekap(e.parameter.password, e.parameter.tanggal));
      case 'getLaporan':
        return jsonOut(getLaporan());
      case 'getStatusHariIni':
        return jsonOut(getStatusHariIni(e.parameter.nim));
      default:
        return jsonOut({ ok: false, message: 'Aksi tidak dikenal' });
    }
  } catch (err) {
    return jsonOut({ ok: false, message: err.message });
  }
}

function doPost(e) {
  let params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ ok: false, message: 'Data tidak valid.' });
  }

  try {
    switch (params.action) {
      case 'uploadLaporan':
        return jsonOut(uploadLaporan(params));
      default:
        return jsonOut({ ok: false, message: 'Aksi tidak dikenal' });
    }
  } catch (err) {
    return jsonOut({ ok: false, message: err.message });
  }
}

function login(username, password) {
  if (!username || !password) return { ok: false, message: 'Username dan password wajib diisi.' };

  if (String(username).toLowerCase() === 'admin') {
    if (password !== ADMIN_PASSWORD) return { ok: false, message: 'Username atau password salah.' };
    return { ok: true, role: 'admin' };
  }

  const sheet = getSheet('Peserta');
  const data = sheet.getDataRange().getValues();
  const rowIndex = findPesertaRowIndex(data, username);
  if (rowIndex === -1) return { ok: false, message: 'Username atau password salah.' };

  const storedPassword = data[rowIndex][2];
  const nama = data[rowIndex][1];
  if (!storedPassword) return { ok: false, message: 'Password belum diset admin. Hubungi admin.' };
  if (String(storedPassword) !== String(password)) return { ok: false, message: 'Username atau password salah.' };

  return { ok: true, role: 'peserta', nim: String(username), nama };
}

function getPesertaAdmin(password) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };
  const rows = getSheet('Peserta').getDataRange().getValues().slice(1).filter(r => r[0]);
  return { ok: true, peserta: rows.map(r => ({ nim: String(r[0]), nama: String(r[1]), hasPassword: !!r[2] })) };
}

function findPesertaRowIndex(data, nim) {
  return data.findIndex((r, i) => i > 0 && String(r[0]) === String(nim));
}

function addPeserta(password, nim, nama, pesertaPassword) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };
  if (!nim || !nama || !pesertaPassword) return { ok: false, message: 'NIM, Nama, dan Password wajib diisi.' };

  const sheet = getSheet('Peserta');
  const data = sheet.getDataRange().getValues();
  if (findPesertaRowIndex(data, nim) !== -1) return { ok: false, message: 'NIM sudah terdaftar.' };

  sheet.appendRow([nim, nama, pesertaPassword]);
  return { ok: true, message: 'Peserta berhasil ditambahkan.' };
}

function editPeserta(password, nim, nama) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };
  if (!nim || !nama) return { ok: false, message: 'NIM dan Nama wajib diisi.' };

  const sheet = getSheet('Peserta');
  const rowIndex = findPesertaRowIndex(sheet.getDataRange().getValues(), nim);
  if (rowIndex === -1) return { ok: false, message: 'NIM tidak ditemukan.' };

  sheet.getRange(rowIndex + 1, 2).setValue(nama);
  return { ok: true, message: 'Nama berhasil diperbarui.' };
}

function deletePeserta(password, nim) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };

  const sheet = getSheet('Peserta');
  const rowIndex = findPesertaRowIndex(sheet.getDataRange().getValues(), nim);
  if (rowIndex === -1) return { ok: false, message: 'NIM tidak ditemukan.' };

  sheet.deleteRow(rowIndex + 1);
  return { ok: true, message: 'Peserta berhasil dihapus.' };
}

function resetPasswordPeserta(password, nim, newPassword) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };
  if (!newPassword) return { ok: false, message: 'Password baru wajib diisi.' };

  const sheet = getSheet('Peserta');
  const rowIndex = findPesertaRowIndex(sheet.getDataRange().getValues(), nim);
  if (rowIndex === -1) return { ok: false, message: 'NIM tidak ditemukan.' };

  sheet.getRange(rowIndex + 1, 3).setValue(newPassword);
  return { ok: true, message: 'Password berhasil direset.' };
}

function generateToken(password) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };
  const sheet = getSheet('QR_Tokens');
  const tanggal = todayStr();
  const existing = sheet.getDataRange().getValues().slice(1).find(r => normalizeTanggal(r[0]) === tanggal);
  if (existing) return { ok: true, tanggal, token: existing[1] };
  const token = Utilities.getUuid();
  sheet.appendRow([tanggal, token, new Date()]);
  return { ok: true, tanggal, token };
}

function getTodayToken(password) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };
  const sheet = getSheet('QR_Tokens');
  const tanggal = todayStr();
  const existing = sheet.getDataRange().getValues().slice(1).find(r => normalizeTanggal(r[0]) === tanggal);
  if (!existing) return { ok: false, message: 'Belum ada QR untuk hari ini' };
  return { ok: true, tanggal, token: existing[1] };
}

function submitAbsen(params) {
  const { token, tanggal, nim } = params;
  const tanggalHariIni = todayStr();
  if (tanggal !== tanggalHariIni) {
    return { ok: false, message: 'QR ini bukan untuk hari ini. Gunakan QR yang berlaku hari ini.' };
  }

  const tokenRow = getSheet('QR_Tokens').getDataRange().getValues().slice(1).find(r => normalizeTanggal(r[0]) === tanggal);
  if (!tokenRow || String(tokenRow[1]) !== String(token)) {
    return { ok: false, message: 'QR tidak valid.' };
  }

  const pesertaRow = getSheet('Peserta').getDataRange().getValues().slice(1).find(r => String(r[0]) === String(nim));
  if (!pesertaRow) {
    return { ok: false, message: 'NIM tidak ditemukan di daftar peserta.' };
  }

  const absensiSheet = getSheet('Absensi');
  const already = absensiSheet.getDataRange().getValues().slice(1)
    .find(r => normalizeTanggal(r[0]) === tanggal && String(r[1]) === String(nim));
  if (already) {
    const jam = Utilities.formatDate(new Date(already[3]), TIMEZONE, 'HH:mm');
    return { ok: false, message: `Kamu sudah absen hari ini pukul ${jam}.` };
  }

  absensiSheet.appendRow([tanggal, nim, pesertaRow[1], new Date(), 'Hadir']);
  return { ok: true, message: 'Absen berhasil dicatat!', nama: pesertaRow[1] };
}

function getStatusHariIni(nim) {
  if (!nim) return { ok: false, message: 'NIM wajib diisi.' };
  const tanggal = todayStr();
  const row = getSheet('Absensi').getDataRange().getValues().slice(1)
    .find(r => normalizeTanggal(r[0]) === tanggal && String(r[1]) === String(nim));
  if (!row) return { ok: true, sudahAbsen: false };
  return { ok: true, sudahAbsen: true, waktu: Utilities.formatDate(new Date(row[3]), TIMEZONE, 'HH:mm') };
}

function getRekap(password, tanggal) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };
  const targetTanggal = tanggal || todayStr();

  const peserta = getSheet('Peserta').getDataRange().getValues().slice(1).filter(r => r[0]);
  const absensi = getSheet('Absensi').getDataRange().getValues().slice(1).filter(r => normalizeTanggal(r[0]) === targetTanggal);

  const hadirMap = {};
  absensi.forEach(r => { hadirMap[String(r[1])] = r[3]; });

  const rekap = peserta.map(r => {
    const nim = String(r[0]);
    const waktu = hadirMap[nim];
    return {
      nim,
      nama: r[1],
      status: waktu ? 'Hadir' : 'Belum Hadir',
      waktu: waktu ? Utilities.formatDate(new Date(waktu), TIMEZONE, 'HH:mm:ss') : '-',
    };
  });

  return { ok: true, tanggal: targetTanggal, rekap };
}

function getLaporanFolder() {
  const folders = DriveApp.getFoldersByName('Laporan Absensi KKN');
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder('Laporan Absensi KKN');
}

function uploadLaporan(params) {
  const { nim, nama, judul, fileName, mimeType, fileData } = params;
  if (!nim || !nama || !fileName || !fileData) {
    return { ok: false, message: 'Data laporan tidak lengkap.' };
  }

  const pesertaRow = getSheet('Peserta').getDataRange().getValues().slice(1)
    .find(r => String(r[0]) === String(nim));
  if (!pesertaRow) return { ok: false, message: 'NIM tidak ditemukan di daftar peserta.' };

  const bytes = Utilities.base64Decode(fileData);
  const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName);
  const file = getLaporanFolder().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  getSheet('Laporan').appendRow([todayStr(), nim, nama, judul || '', fileName, file.getUrl(), new Date()]);
  return { ok: true, message: 'Laporan berhasil diupload.', url: file.getUrl() };
}

function getLaporan() {
  const rows = getSheet('Laporan').getDataRange().getValues().slice(1).filter(r => r[0]);
  const laporan = rows.map(r => ({
    tanggal: normalizeTanggal(r[0]),
    nim: String(r[1]),
    nama: r[2],
    judul: r[3],
    fileName: r[4],
    url: r[5],
  })).reverse();
  return { ok: true, laporan };
}
