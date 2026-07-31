async function callApi(action, params = {}) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Gagal menghubungi server');
  return res.json();
}

async function callApiPost(action, data = {}) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...data }),
  });
  if (!res.ok) throw new Error('Gagal menghubungi server');
  return res.json();
}
