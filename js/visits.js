// Daily visit counter shown at the bottom of the sidebar.
// Counts are stored by the free Abacus counter API (one key per UTC day).
// Each browser session is counted once per day; local development is never counted.

const API = 'https://abacus.jasoncameron.dev';
const NAMESPACE = 'saxs-transmission';

async function showVisits() {
  const el = document.getElementById('visitsToday');
  if (!el) return;
  const day = new Date().toISOString().slice(0, 10);
  const key = `visits-${day}`;
  const flag = `saxs-visit-${day}`;
  const local = !/\.github\.io$/.test(location.hostname);

  let counted = false;
  try { counted = sessionStorage.getItem(flag) === '1'; } catch (e) {}
  const action = local || counted ? 'get' : 'hit';

  try {
    const res = await fetch(`${API}/${action}/${NAMESPACE}/${key}`);
    const data = res.ok ? await res.json() : { value: 0 }; // 404 = no visits yet today
    if (action === 'hit') { try { sessionStorage.setItem(flag, '1'); } catch (e) {} }
    el.querySelector('b').textContent = Number(data.value || 0).toLocaleString('en');
    el.hidden = false;
  } catch (e) { /* counter unavailable: keep it hidden */ }
}

showVisits();
