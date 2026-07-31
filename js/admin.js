const dashboardView = document.getElementById('dashboard-view');

function getPassword() {
  return sessionStorage.getItem('admin_password');
}

document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('admin_password');
  location.href = 'index.html';
});

function showDashboard() {
  dashboardView.classList.remove('hidden');
  document.getElementById('rekap-tanggal').value = new Date().toISOString().slice(0, 10);
  showSection('dashboard');
}

// --- Navigasi sidebar ---
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showSection(btn.dataset.section));
});

function showSection(name) {
  document.querySelectorAll('.section-panel').forEach(el => el.classList.add('hidden'));
  document.getElementById(`section-${name}`).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const active = btn.dataset.section === name;
    btn.classList.toggle('bg-slate-800', active);
    btn.classList.toggle('border-indigo-500', active);
    btn.classList.toggle('text-white', active);
  });
  if (name === 'dashboard') loadDashboardStats();
  if (name === 'peserta') loadPesertaList();
}

// --- Dashboard ---
async function loadDashboardStats() {
  const tanggal = new Date().toISOString().slice(0, 10);
  const result = await callApi('getRekap', { password: getPassword(), tanggal });
  if (!result.ok) return;
  const hadir = result.rekap.filter(r => r.status === 'Hadir').length;
  document.getElementById('stat-total').textContent = result.rekap.length;
  document.getElementById('stat-hadir').textContent = hadir;
  document.getElementById('stat-belum').textContent = result.rekap.length - hadir;
}

// --- Kelola Peserta ---
const addPesertaForm = document.getElementById('add-peserta-form');
const newNimInput = document.getElementById('new-nim');
const newNamaInput = document.getElementById('new-nama');
const newPasswordInput = document.getElementById('new-password');

function clearAddPesertaForm() {
  newNimInput.value = '';
  newNamaInput.value = '';
  newPasswordInput.value = '';
}

document.getElementById('show-add-peserta-btn').addEventListener('click', () => {
  addPesertaForm.classList.toggle('hidden');
});

document.getElementById('cancel-new-peserta-btn').addEventListener('click', () => {
  addPesertaForm.classList.add('hidden');
  clearAddPesertaForm();
});

document.getElementById('save-new-peserta-btn').addEventListener('click', async () => {
  const nim = newNimInput.value.trim();
  const nama = newNamaInput.value.trim();
  const pesertaPassword = newPasswordInput.value.trim();
  if (!nim || !nama || !pesertaPassword) {
    alert('NIM, Nama, dan Password wajib diisi.');
    return;
  }
  const result = await callApi('addPeserta', { password: getPassword(), nim, nama, pesertaPassword });
  if (!result.ok) {
    alert(result.message);
    return;
  }
  clearAddPesertaForm();
  addPesertaForm.classList.add('hidden');
  loadPesertaList();
});

async function loadPesertaList() {
  const result = await callApi('getPesertaAdmin', { password: getPassword() });
  if (!result.ok) return;
  renderPesertaList(result.peserta);
}

function renderPesertaList(peserta) {
  const body = document.getElementById('peserta-body');
  body.innerHTML = '';
  peserta.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-100';
    tr.innerHTML = `
      <td class="py-2 pr-4">${p.nim}</td>
      <td class="py-2 pr-4">${p.nama}</td>
      <td class="py-2 pr-4">${p.hasPassword ? '<span class="text-green-600">Sudah diset</span>' : '<span class="text-gray-400">Belum</span>'}</td>
      <td class="py-2 pr-4 whitespace-nowrap space-x-3">
        <button class="edit-btn text-indigo-600 hover:underline">Edit</button>
        <button class="reset-btn text-amber-600 hover:underline">Reset Pass</button>
        <button class="delete-btn text-red-600 hover:underline">Hapus</button>
      </td>
    `;

    tr.querySelector('.edit-btn').addEventListener('click', async () => {
      const namaBaru = prompt(`Nama baru untuk NIM ${p.nim}:`, p.nama);
      if (namaBaru === null || !namaBaru.trim()) return;
      const result = await callApi('editPeserta', { password: getPassword(), nim: p.nim, nama: namaBaru.trim() });
      if (!result.ok) return alert(result.message);
      loadPesertaList();
    });

    tr.querySelector('.reset-btn').addEventListener('click', async () => {
      const newPassword = prompt(`Password baru untuk ${p.nama} (${p.nim}):`);
      if (newPassword === null || !newPassword.trim()) return;
      const result = await callApi('resetPasswordPeserta', { password: getPassword(), nim: p.nim, newPassword: newPassword.trim() });
      alert(result.message);
      loadPesertaList();
    });

    tr.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm(`Hapus peserta ${p.nama} (${p.nim})? Aksi ini tidak bisa dibatalkan.`)) return;
      const result = await callApi('deletePeserta', { password: getPassword(), nim: p.nim });
      if (!result.ok) return alert(result.message);
      loadPesertaList();
    });

    body.appendChild(tr);
  });
}

// --- QR Hari Ini ---
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
  const qrContainer = document.getElementById('qr-canvas');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, { text: payload, width: 260, height: 260 });
  document.getElementById('qr-result').classList.remove('hidden');
}

document.getElementById('print-btn').addEventListener('click', () => window.print());

// --- Rekap Kehadiran ---
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

if (getPassword()) {
  showDashboard();
} else {
  location.href = 'index.html';
}
