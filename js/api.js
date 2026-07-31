async function callApi(action, params = {}) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Gagal menghubungi server');
  return res.json();
}
