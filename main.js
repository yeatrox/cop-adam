const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ================= AYARLAR =================
const REPO = { owner: 'yeatrox', repo: 'cop-adam', branch: 'main' }; // dal adı main değilse değiştir
const BASE_URL = `https://raw.githubusercontent.com/${REPO.owner}/${REPO.repo}/${REPO.branch}/`;
const CHECK_TIMEOUT_MS = 10000;  // manifest indirme zaman aşımı
const IDLE_TIMEOUT_MS = 15000;   // indirme sırasında veri gelmezse iptal
// Güncellenebilir dosyalar (güvenlik için sadece bu yollara izin verilir)
const FILE_RE = /^(index\.html|game\.js|assets\/[\w.\-]+)$/;
// ===========================================

let win = null;
let pending = null; // check sonrası indirilecek dosyalar
let busy = false;

const gameDir = () => path.join(app.getPath('userData'), 'game');
const tmpDir = () => path.join(app.getPath('userData'), 'game-tmp');

function safePath(root, rel) {
  const p = path.resolve(root, rel);
  if (!p.startsWith(root + path.sep)) throw new Error('Geçersiz yol: ' + rel);
  return p;
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file)
      .on('data', (d) => h.update(d))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });
}

// Uygulamayla gelen dosyalar (ilk açılışta userData/game içine kopyalanır)
function bundledFiles() {
  const out = ['index.html', 'game.js'];
  const ad = path.join(__dirname, 'assets');
  if (fs.existsSync(ad)) {
    for (const f of fs.readdirSync(ad)) if (FILE_RE.test('assets/' + f)) out.push('assets/' + f);
  }
  return out.filter((f) => fs.existsSync(path.join(__dirname, f)));
}

function seedGameDir() {
  const root = gameDir();
  for (const rel of bundledFiles()) {
    const dest = safePath(root, rel);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(__dirname, rel), dest);
    }
  }
}

function encodePath(rel) {
  return rel.split('/').map(encodeURIComponent).join('/');
}

async function fetchManifest() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await net.fetch(BASE_URL + 'manifest.json?t=' + Date.now(), {
      signal: ctrl.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return { error: res.status === 404 ? 'notfound' : 'http' };
    let data;
    try { data = await res.json(); } catch { return { error: 'manifest' }; }
    if (!data || !Array.isArray(data.files)) return { error: 'manifest' };
    for (const f of data.files) {
      if (!f || !FILE_RE.test(f.path) || !Number.isInteger(f.size) || f.size < 0 ||
          !/^[a-f0-9]{64}$/.test(f.sha256)) return { error: 'manifest' };
    }
    return { data };
  } catch {
    return { error: 'network' }; // internet yok / zaman aşımı
  } finally {
    clearTimeout(timer);
  }
}

async function downloadFile(url, dest, onChunk) {
  const ctrl = new AbortController();
  let timer;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), IDLE_TIMEOUT_MS); };
  arm();
  try {
    const res = await net.fetch(url, { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const out = fs.createWriteStream(dest);
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      arm();
      await new Promise((ok, no) => out.write(value, (e) => (e ? no(e) : ok())));
      onChunk(value.length);
    }
    await new Promise((ok) => out.end(ok));
  } finally {
    clearTimeout(timer);
  }
}

function assertSplash(e) {
  const u = (e.senderFrame && e.senderFrame.url) || '';
  if (!u.endsWith('/splash.html')) throw new Error('forbidden');
}

ipcMain.handle('update:check', async (e) => {
  assertSplash(e);
  seedGameDir();
  const { data, error } = await fetchManifest();
  if (error) return { status: 'error', reason: error };

  const changed = [];
  for (const f of data.files) {
    const local = safePath(gameDir(), f.path);
    let same = false;
    if (fs.existsSync(local)) {
      try { same = (await sha256File(local)) === f.sha256; } catch { same = false; }
    }
    if (!same) changed.push(f);
  }
  if (!changed.length) { pending = null; return { status: 'uptodate' }; }
  pending = { manifest: data, changed };
  return {
    status: 'available',
    version: data.version || '',
    count: changed.length,
    totalBytes: changed.reduce((s, f) => s + f.size, 0),
  };
});

ipcMain.handle('update:download', async (e) => {
  assertSplash(e);
  if (!pending) return { ok: false, reason: 'unknown' };
  if (busy) return { ok: false, reason: 'busy' };
  busy = true;
  const tmp = tmpDir();
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    const total = pending.changed.reduce((s, f) => s + f.size, 0);
    let received = 0;
    let last = 0;
    const send = (force) => {
      const now = Date.now();
      if (force || now - last > 100) { last = now; e.sender.send('update:progress', { received, total }); }
    };
    send(true);
    for (const f of pending.changed) {
      const dest = safePath(tmp, f.path);
      await downloadFile(BASE_URL + encodePath(f.path) + '?t=' + Date.now(), dest, (n) => { received += n; send(false); });
      const st = fs.statSync(dest);
      if (st.size !== f.size || (await sha256File(dest)) !== f.sha256) {
        const err = new Error('verify'); err.reason = 'verify'; throw err;
      }
    }
    send(true);
    // Hepsi doğrulandıktan sonra yerine koy
    for (const f of pending.changed) {
      const target = safePath(gameDir(), f.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.renameSync(safePath(tmp, f.path), target);
    }
    fs.writeFileSync(path.join(gameDir(), 'manifest.json'), JSON.stringify(pending.manifest, null, 2));
    pending = null;
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.reason || 'network' };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    busy = false;
  }
});

ipcMain.handle('app:launch', (e) => {
  assertSplash(e);
  const idx = path.join(gameDir(), 'index.html');
  win.loadFile(fs.existsSync(idx) ? idx : path.join(__dirname, 'index.html'));
});

ipcMain.handle('app:quit', (e) => { assertSplash(e); app.quit(); });

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 640, minHeight: 360,
    backgroundColor: '#05050f',
    autoHideMenuBar: true,
    title: 'Neon Çöp Adam',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile(path.join(__dirname, 'splash.html'));
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
