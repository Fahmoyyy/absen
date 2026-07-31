// ============================================================
// ABSENSI KKN - Backend (Google Apps Script)
// ============================================================
// Cara pakai:
// 1. Buat Google Spreadsheet baru dengan 3 sheet/tab:
//    - "Peserta"   -> kolom A: NIM, B: Nama, C: Password (isi NIM+Nama manual, kolom Password dibiarkan kosong -
//                     otomatis terisi saat peserta login pertama kali)
//    - "QR_Tokens" -> kolom A: Tanggal, B: Token, C: DibuatPada (biarkan kosong, diisi otomatis)
//    - "Absensi"   -> kolom A: Tanggal, B: NIM, C: Nama, D: Waktu, E: Status (biarkan kosong, diisi otomatis)
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
      case 'getPeserta':
        return jsonOut(getPeserta());
      case 'loginPeserta':
        return jsonOut(loginPeserta(e.parameter.nim, e.parameter.password));
      case 'checkPassword':
        return jsonOut({ ok: checkAdmin(e.parameter.password) });
      case 'generateToken':
        return jsonOut(generateToken(e.parameter.password));
      case 'getTodayToken':
        return jsonOut(getTodayToken(e.parameter.password));
      case 'submitAbsen':
        return jsonOut(submitAbsen(e.parameter));
      case 'getRekap':
        return jsonOut(getRekap(e.parameter.password, e.parameter.tanggal));
      default:
        return jsonOut({ ok: false, message: 'Aksi tidak dikenal' });
    }
  } catch (err) {
    return jsonOut({ ok: false, message: err.message });
  }
}

function getPeserta() {
  const sheet = getSheet('Peserta');
  const rows = sheet.getDataRange().getValues().slice(1).filter(r => r[0]);
  return { ok: true, peserta: rows.map(r => ({ nim: String(r[0]), nama: String(r[1]) })) };
}

function loginPeserta(nim, password) {
  if (!nim || !password) return { ok: false, message: 'NIM dan password wajib diisi.' };

  const sheet = getSheet('Peserta');
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex((r, i) => i > 0 && String(r[0]) === String(nim));
  if (rowIndex === -1) return { ok: false, message: 'NIM tidak terdaftar. Hubungi admin.' };

  const storedPassword = data[rowIndex][2];
  const nama = data[rowIndex][1];

  if (!storedPassword) {
    sheet.getRange(rowIndex + 1, 3).setValue(password);
    return { ok: true, nim: String(nim), nama, message: 'Password berhasil dibuat.' };
  }

  if (String(storedPassword) !== String(password)) {
    return { ok: false, message: 'Password salah.' };
  }

  return { ok: true, nim: String(nim), nama };
}

function generateToken(password) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };
  const sheet = getSheet('QR_Tokens');
  const tanggal = todayStr();
  const existing = sheet.getDataRange().getValues().slice(1).find(r => r[0] === tanggal);
  if (existing) return { ok: true, tanggal, token: existing[1] };
  const token = Utilities.getUuid();
  sheet.appendRow([tanggal, token, new Date()]);
  return { ok: true, tanggal, token };
}

function getTodayToken(password) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };
  const sheet = getSheet('QR_Tokens');
  const tanggal = todayStr();
  const existing = sheet.getDataRange().getValues().slice(1).find(r => r[0] === tanggal);
  if (!existing) return { ok: false, message: 'Belum ada QR untuk hari ini' };
  return { ok: true, tanggal, token: existing[1] };
}

function submitAbsen(params) {
  const { token, tanggal, nim } = params;
  const tanggalHariIni = todayStr();
  if (tanggal !== tanggalHariIni) {
    return { ok: false, message: 'QR ini bukan untuk hari ini. Gunakan QR yang berlaku hari ini.' };
  }

  const tokenRow = getSheet('QR_Tokens').getDataRange().getValues().slice(1).find(r => r[0] === tanggal);
  if (!tokenRow || String(tokenRow[1]) !== String(token)) {
    return { ok: false, message: 'QR tidak valid.' };
  }

  const pesertaRow = getSheet('Peserta').getDataRange().getValues().slice(1).find(r => String(r[0]) === String(nim));
  if (!pesertaRow) {
    return { ok: false, message: 'NIM tidak ditemukan di daftar peserta.' };
  }

  const absensiSheet = getSheet('Absensi');
  const already = absensiSheet.getDataRange().getValues().slice(1)
    .find(r => r[0] === tanggal && String(r[1]) === String(nim));
  if (already) {
    const jam = Utilities.formatDate(new Date(already[3]), TIMEZONE, 'HH:mm');
    return { ok: false, message: `Kamu sudah absen hari ini pukul ${jam}.` };
  }

  absensiSheet.appendRow([tanggal, nim, pesertaRow[1], new Date(), 'Hadir']);
  return { ok: true, message: 'Absen berhasil dicatat!', nama: pesertaRow[1] };
}

function getRekap(password, tanggal) {
  if (!checkAdmin(password)) return { ok: false, message: 'Password salah' };
  const targetTanggal = tanggal || todayStr();

  const peserta = getSheet('Peserta').getDataRange().getValues().slice(1).filter(r => r[0]);
  const absensi = getSheet('Absensi').getDataRange().getValues().slice(1).filter(r => r[0] === targetTanggal);

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
