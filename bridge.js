// TankTrouble Color Lab — storage bridge.
// Runs in the extension's isolated world (where chrome.storage is available) and loads/saves data for
// content.js, which runs inside the page. Only the keys below can be read or written.
(() => {
  const KEYS = ['tt_custom_colors', 'tt_color_history', 'tt_gui_pos', 'tt_migrated', 'tt_seen_hint', 'tt_settings', 'tt_boxes', 'tt_stats', 'tt_tutorial'];
  // A copy of everything is also kept in TankTrouble's own site storage in this browser, so removing and re-adding the
  // extension (or loading it from another folder) doesn't lose saved looks: a fresh install restores from it.
  const BK = 'ttcl_backup'; let bt = 0;
  const backup = () => { clearTimeout(bt); bt = setTimeout(() => { try { localStorage.setItem(BK, JSON.stringify({ v: 1, at: Date.now(), data })); } catch {} }, 400); };
  const merge = (a, b) => { // an imported file joined with what's here: its entries win, nothing here is lost
    if (Array.isArray(a) && Array.isArray(b)) { const seen = new Set(), out = []; for (const x of b.concat(a)) { const k = JSON.stringify(x); if (!seen.has(k)) { seen.add(k); out.push(x); } } return out; }
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) return Object.assign({}, a, b);
    return b === undefined ? a : b;
  };
  let data = null;
  const alive = () => { try { return !!(chrome.runtime && chrome.runtime.id); } catch { return false; } };
  const toPage = (msg) => window.postMessage(Object.assign({ __ttcl: true, dir: 'toPage' }, msg), location.origin);
  const pick = (items) => { const o = {}; if (items) for (const k of KEYS) if (k in items) o[k] = items[k]; return o; };

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.__ttcl !== true || d.dir !== 'toExt') return;
    if (!alive()) return; // the extension was reloaded or updated: this old copy stops quietly (refresh the page)
    if (d.type === 'hello') {
      if (data) toPage({ type: 'init', data });
    } else if (d.type === 'save') {
      const items = pick(d.items); delete items.tt_migrated;
      Object.assign(data || (data = {}), items);
      try { chrome.storage.local.set(items); } catch {} backup();
    } else if (d.type === 'export') {
      toPage({ type: 'exported', data: pick(data) });
    } else if (d.type === 'import' && d.items && typeof d.items === 'object') {
      const inc = pick(d.items), cur = data || {}, out = {};
      for (const k of KEYS) if (k in inc || k in cur) out[k] = k === 'tt_settings' || k === 'tt_gui_pos' ? (inc[k] || cur[k]) : merge(cur[k], inc[k]);
      out.tt_migrated = true; data = out;
      chrome.storage.local.set(out, () => { backup(); toPage({ type: 'imported', ok: !chrome.runtime.lastError }); });
    } else if (d.type === 'badge') {
      try { const p = chrome.runtime.sendMessage({ type: 'badge', on: !!d.on }); if (p && p.catch) p.catch(() => {}); } catch {}
    } else if (d.type === 'artFile' && typeof d.name === 'string' && /^[\w.-]+$/.test(d.name)) {
      // Color Lab's own pictures, read from the extension's art folder on your PC when the page needs one
      fetch(chrome.runtime.getURL('art/' + d.name)).then(r => r.ok ? r.blob() : null).catch(() => null).then(blob => toPage({ type: 'artFile', name: d.name, blob }));
    } else if (d.type === 'share' && (d.op === 'get' || d.op === 'put' || d.op === 'delete' || d.op === 'watch' || d.op === 'latest')) {
      // Shared looks: the extension's background page talks to Color Lab's look server, never the page itself.
      // Your tanks' looks are locked to this copy by a secret key kept here (and in the site storage backup, so a reinstall keeps it).
      const send = (key) => { try { chrome.runtime.sendMessage({ type: 'share', op: d.op, ids: d.ids, pid: d.pid, look: d.look, key }, (res) => { void chrome.runtime.lastError; toPage({ type: 'shareRes', rid: d.rid, res: res || null }); }); } catch { toPage({ type: 'shareRes', rid: d.rid, res: null }); } };
      if (d.op === 'get' || d.op === 'watch' || d.op === 'latest') send(null);
      else chrome.storage.local.get('ttcl_share_key', (it) => {
        let key = it && it.ttcl_share_key; try { if (!key) key = localStorage.getItem('ttcl_share_key'); } catch {}
        if (!key || !/^[0-9a-f]{64}$/.test(key)) { const b = new Uint8Array(32); crypto.getRandomValues(b); key = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); }
        chrome.storage.local.set({ ttcl_share_key: key }); try { localStorage.setItem('ttcl_share_key', key); } catch {}
        send(key);
      });
    } else if (d.type === 'devReload') { // (Ren's DEV copy only: reload the extension from the page while testing)
      try { const p = chrome.runtime.sendMessage({ type: 'devReload' }); if (p && p.catch) p.catch(() => {}); } catch {}
    } else if (d.type === 'migrate') {
      const items = pick(d.items);
      Object.assign(data || (data = {}), items);
      chrome.storage.local.set(items, () => { if (!chrome.runtime.lastError) toPage({ type: 'migrated' }); }); backup();
    }
  });

  // a watched tank's look was just saved: straight to the page
  chrome.runtime.onMessage.addListener((m) => { if (m && m.type === 'shareLive' && alive()) toPage({ type: 'shareLive', pid: m.pid, look: m.look }); });

  chrome.storage.local.get(KEYS, (items) => {
    data = items || {};
    if (!KEYS.some(k => k in data)) { // nothing saved: a fresh install. Bring back the copy from the site storage, if there is one
      try { const b = JSON.parse(localStorage.getItem(BK) || 'null'); if (b && b.data && typeof b.data === 'object') { data = pick(b.data); chrome.storage.local.set(data); data.tt_restored = true; } } catch {}
    } else backup();
    toPage({ type: 'init', data });
  });
})();
