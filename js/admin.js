const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const passwordInput = document.getElementById('password-input');
const loginError = document.getElementById('login-error');

function getPassword() {
  return sessionStorage.getItem('admin_password');
}

async function tryLogin(password) {
  const result = await callApi('checkPassword', { password });
  if (!result.ok) {
    loginError.classList.remove('hidden');
    return;
  }
  sessionStorage.setItem('admin_password', password);
  showDashboard();
}

document.getElementById('login-btn').addEventListener('click', () => {
  loginError.classList.add('hidden');
  tryLogin(passwordInput.value);
});

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('admin_password');
  location.reload();
});

function showDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('rekap-tanggal').value = today;
}

document.getElementById('generate-btn').addEventListener('click', async () => {
  const result = await callApi('generateToken', { password: getPassword() });
  if (!result.ok) {
    alert(result.message || 'Gagal membuat QR.');
    return;
  }
  renderQr(result.tanggal, result.token);
});

function renderQr(tanggal, token) {
  document.getElementById('qr-tanggal').textContent = tanggal;
  const payload = JSON.stringify({ t: token, d: tanggal });
  QRCode.toCanvas(document.getElementById('qr-canvas'), payload, { width: 260 });
  document.getElementById('qr-result').classList.remove('hidden');
}

document.getElementById('print-btn').addEventListener('click', () => window.print());

document.getElementById('rekap-btn').addEventListener('click', async () => {
  const tanggal = document.getElementById('rekap-tanggal').value;
  const result = await callApi('getRekap', { password: getPassword(), tanggal });
  if (!result.ok) {
    alert(result.message || 'Gagal memuat rekap.');
    return;
  }
  renderRekap(result.rekap);
});

function renderRekap(rekap) {
  const hadir = rekap.filter(r => r.status === 'Hadir').length;
  document.getElementById('rekap-summary').textContent = `Hadir ${hadir} dari ${rekap.length} peserta`;

  const body = document.getElementById('rekap-body');
  body.innerHTML = '';
  rekap.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-100';
    const statusColor = r.status === 'Hadir' ? 'text-green-600' : 'text-gray-400';
    tr.innerHTML = `
      <td class="py-2 pr-4">${r.nim}</td>
      <td class="py-2 pr-4">${r.nama}</td>
      <td class="py-2 pr-4 font-medium ${statusColor}">${r.status}</td>
      <td class="py-2 pr-4">${r.waktu}</td>
    `;
    body.appendChild(tr);
  });
}

if (getPassword()) showDashboard();
