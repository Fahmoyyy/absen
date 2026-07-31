const IDENTITY_KEY = 'kkn_identity';

const identifyView = document.getElementById('identify-view');
const mainView = document.getElementById('main-view');
const resultView = document.getElementById('result-view');

const nimInput = document.getElementById('nim-input');
const passwordInput = document.getElementById('password-input');
const lanjutBtn = document.getElementById('lanjut-btn');
const loginError = document.getElementById('login-error');
const identityNameEl = document.getElementById('identity-name');

let scanner = null;
let scannerRunning = false;
let identity = null; // { nim, nama }

function getIdentity() {
  const raw = localStorage.getItem(IDENTITY_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveIdentity(id) {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
}

function clearIdentity() {
  localStorage.removeItem(IDENTITY_KEY);
}

lanjutBtn.addEventListener('click', async () => {
  const nim = nimInput.value.trim();
  const password = passwordInput.value;
  loginError.classList.add('hidden');

  if (!nim || !password) {
    loginError.textContent = 'NIM dan password wajib diisi.';
    loginError.classList.remove('hidden');
    return;
  }

  lanjutBtn.disabled = true;
  lanjutBtn.textContent = 'Memeriksa...';
  const result = await callApi('loginPeserta', { nim, password });
  lanjutBtn.disabled = false;
  lanjutBtn.textContent = 'Masuk';

  if (!result.ok) {
    loginError.textContent = result.message;
    loginError.classList.remove('hidden');
    return;
  }

  identity = { nim: result.nim, nama: result.nama };
  saveIdentity(identity);
  showMainView();
});

document.querySelectorAll('.change-identity-btn').forEach(btn => btn.addEventListener('click', () => {
  clearIdentity();
  identity = null;
  if (scanner && scannerRunning) scanner.stop().catch(() => {});
  scannerRunning = false;
  mainView.classList.add('hidden');
  identifyView.classList.remove('hidden');
  nimInput.value = '';
  passwordInput.value = '';
}));

function showMainView() {
  identifyView.classList.add('hidden');
  mainView.classList.remove('hidden');
  identityNameEl.textContent = identity.nama;
  switchTab('absen');
}

// --- Tab Absen / Laporan ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('bg-white', active);
    btn.classList.toggle('shadow', active);
    btn.classList.toggle('text-gray-800', active);
    btn.classList.toggle('text-gray-500', !active);
  });

  if (tab === 'absen') {
    resultView.classList.add('hidden');
    document.getElementById('scan-view').classList.remove('hidden');
    startScanner();
  } else {
    if (scanner && scannerRunning) scanner.stop().catch(() => {});
    scannerRunning = false;
    loadLaporanList();
  }
}

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
    item.className = 'block bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition';
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
  identifyView.classList.remove('hidden');
}
