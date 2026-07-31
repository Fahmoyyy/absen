const IDENTITY_KEY = 'kkn_identity';

const mainView = document.getElementById('main-view');
const resultView = document.getElementById('result-view');
const identityNameEl = document.getElementById('greeting-text');
const identityInitialEl = document.getElementById('identity-initial');

let scanner = null;
let scannerRunning = false;
let identity = null; // { nim, nama }

function getIdentity() {
  const raw = localStorage.getItem(IDENTITY_KEY);
  return raw ? JSON.parse(raw) : null;
}

function clearIdentity() {
  localStorage.removeItem(IDENTITY_KEY);
}

function getSalam() {
  const hour = new Date().getHours();
  if (hour < 10) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

document.querySelectorAll('.change-identity-btn').forEach(btn => btn.addEventListener('click', () => {
  clearIdentity();
  if (scanner && scannerRunning) scanner.stop().catch(() => {});
  location.href = 'index.html';
}));

function showMainView() {
  mainView.classList.remove('hidden');
  identityNameEl.textContent = `${getSalam()}, ${identity.nama.split(' ')[0]}! 👋`;
  identityInitialEl.textContent = identity.nama.trim().charAt(0).toUpperCase();
  switchTab('dashboard');
}

// --- Tab Dashboard / Absen / Laporan ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.querySelectorAll('.goto-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.gotoTab));
});

function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('text-teal-600', active);
    btn.classList.toggle('bg-teal-50', active);
    btn.classList.toggle('text-gray-400', !active);
  });

  if (scanner && scannerRunning && tab !== 'absen') {
    scanner.stop().catch(() => {});
    scannerRunning = false;
  }

  if (tab === 'dashboard') loadDashboardStatus();
  if (tab === 'absen') {
    resultView.classList.add('hidden');
    document.getElementById('scan-view').classList.remove('hidden');
    startScanner();
  }
  if (tab === 'laporan') loadLaporanList();
}

// --- Dashboard ---
async function loadDashboardStatus() {
  const result = await callApi('getStatusHariIni', { nim: identity.nim });
  const el = document.getElementById('status-absen-hari-ini');
  if (result.ok && result.sudahAbsen) {
    el.innerHTML = `
      <span class="text-3xl">✅</span>
      <div>
        <p class="font-semibold text-gray-800">Sudah Absen</p>
        <p class="text-xs text-gray-400">Pukul ${result.waktu}</p>
      </div>`;
  } else {
    el.innerHTML = `
      <span class="text-3xl">⏰</span>
      <div>
        <p class="font-semibold text-gray-800">Belum Absen</p>
        <p class="text-xs text-gray-400">Yuk scan QR sekarang</p>
      </div>`;
  }
}

// --- Absen ---
function startScanner() {
  if (scannerRunning) return;
  scanner = new Html5Qrcode('qr-reader');
  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 220 },
    onScanSuccess,
    () => {}
  );
  scannerRunning = true;
}

async function onScanSuccess(decodedText) {
  let data;
  try {
    data = JSON.parse(decodedText);
  } catch {
    return;
  }
  if (!data.t || !data.d) return;

  await scanner.stop();
  scannerRunning = false;
  document.getElementById('scan-view').classList.add('hidden');

  const result = await callApi('submitAbsen', {
    token: data.t,
    tanggal: data.d,
    nim: identity.nim,
  });

  resultView.classList.remove('hidden');
  document.getElementById('result-icon').textContent = result.ok ? '✅' : '⚠️';
  document.getElementById('result-message').textContent = result.message;
}

document.getElementById('reset-btn').addEventListener('click', () => {
  resultView.classList.add('hidden');
  document.getElementById('scan-view').classList.remove('hidden');
  startScanner();
});

// --- Laporan ---
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById('upload-laporan-btn').addEventListener('click', async () => {
  const fileInput = document.getElementById('laporan-file');
  const judulInput = document.getElementById('laporan-judul');
  const statusEl = document.getElementById('upload-status');
  const file = fileInput.files[0];

  if (!file) {
    statusEl.textContent = 'Pilih file dulu.';
    statusEl.classList.remove('hidden');
    return;
  }

  statusEl.textContent = 'Mengupload...';
  statusEl.classList.remove('hidden');

  const fileData = await fileToBase64(file);
  const result = await callApiPost('uploadLaporan', {
    nim: identity.nim,
    nama: identity.nama,
    judul: judulInput.value.trim(),
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileData,
  });

  statusEl.textContent = result.message;
  if (result.ok) {
    fileInput.value = '';
    judulInput.value = '';
    loadLaporanList();
  }
});

async function loadLaporanList() {
  const result = await callApi('getLaporan');
  const listEl = document.getElementById('laporan-list');
  listEl.innerHTML = '';

  if (!result.ok || !result.laporan.length) {
    listEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Belum ada laporan.</p>';
    return;
  }

  result.laporan.forEach(l => {
    const item = document.createElement('a');
    item.href = l.url;
    item.target = '_blank';
    item.rel = 'noopener';
    item.className = 'block bg-white border border-gray-200 rounded-xl p-3 hover:bg-gray-50 transition';
    item.innerHTML = `
      <p class="font-medium text-gray-800 text-sm">${l.judul || l.fileName}</p>
      <p class="text-xs text-gray-400">${l.nama} · ${l.tanggal}</p>
    `;
    listEl.appendChild(item);
  });
}

identity = getIdentity();
if (identity) {
  showMainView();
} else {
  location.href = 'index.html';
}
