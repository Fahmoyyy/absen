const scanView = document.getElementById('scan-view');
const confirmView = document.getElementById('confirm-view');
const resultView = document.getElementById('result-view');

const namaInput = document.getElementById('nama-input');
const pesertaList = document.getElementById('peserta-list');
const submitBtn = document.getElementById('submit-btn');

let scanner = null;
let scannedData = null; // { t: token, d: tanggal }
let pesertaMap = {}; // "Nama — NIM" -> nim
let pesertaLoaded = false;

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
  scannedData = data;

  document.getElementById('confirm-tanggal').textContent = data.d;
  scanView.classList.add('hidden');
  confirmView.classList.remove('hidden');

  if (!pesertaLoaded) await loadPeserta();
}

async function loadPeserta() {
  const result = await callApi('getPeserta');
  if (!result.ok) return;
  pesertaMap = {};
  pesertaList.innerHTML = '';
  result.peserta.forEach(p => {
    const label = `${p.nama} — ${p.nim}`;
    pesertaMap[label] = p.nim;
    const opt = document.createElement('option');
    opt.value = label;
    pesertaList.appendChild(opt);
  });
  pesertaLoaded = true;
}

namaInput.addEventListener('input', () => {
  submitBtn.disabled = !pesertaMap[namaInput.value];
});

submitBtn.addEventListener('click', async () => {
  const nim = pesertaMap[namaInput.value];
  if (!nim || !scannedData) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Mengirim...';

  const result = await callApi('submitAbsen', {
    token: scannedData.t,
    tanggal: scannedData.d,
    nim,
  });

  submitBtn.textContent = 'Konfirmasi Absen';
  confirmView.classList.add('hidden');
  resultView.classList.remove('hidden');
  document.getElementById('result-icon').textContent = result.ok ? '✅' : '⚠️';
  document.getElementById('result-message').textContent = result.message;
});

document.getElementById('scan-again-btn').addEventListener('click', resetToScan);
document.getElementById('reset-btn').addEventListener('click', resetToScan);

function resetToScan() {
  scannedData = null;
  namaInput.value = '';
  submitBtn.disabled = true;
  resultView.classList.add('hidden');
  confirmView.classList.add('hidden');
  scanView.classList.remove('hidden');
  startScanner();
}

startScanner();
