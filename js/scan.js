const IDENTITY_KEY = 'kkn_identity';

const identifyView = document.getElementById('identify-view');
const scanView = document.getElementById('scan-view');
const resultView = document.getElementById('result-view');

const nimInput = document.getElementById('nim-input');
const passwordInput = document.getElementById('password-input');
const lanjutBtn = document.getElementById('lanjut-btn');
const loginError = document.getElementById('login-error');
const identityNameEl = document.getElementById('identity-name');

let scanner = null;
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
  showScanView();
});

document.querySelectorAll('.change-identity-btn').forEach(btn => btn.addEventListener('click', () => {
  clearIdentity();
  identity = null;
  if (scanner) scanner.stop().catch(() => {});
  scanView.classList.add('hidden');
  resultView.classList.add('hidden');
  identifyView.classList.remove('hidden');
  nimInput.value = '';
  passwordInput.value = '';
}));

function showScanView() {
  identifyView.classList.add('hidden');
  resultView.classList.add('hidden');
  scanView.classList.remove('hidden');
  identityNameEl.textContent = identity.nama;
  startScanner();
}

function startScanner() {
  scanner = new Html5Qrcode('qr-reader');
  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 220 },
    onScanSuccess,
    () => {}
  );
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
  scanView.classList.add('hidden');

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
  showScanView();
});

identity = getIdentity();
if (identity) {
  showScanView();
} else {
  identifyView.classList.remove('hidden');
}
