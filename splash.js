const $ = (id) => document.getElementById(id);
const screens = ['checking', 'available', 'downloading', 'error'];
const show = (name) => screens.forEach((s) => { $(s).hidden = s !== name; });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fmt(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}

const ERRORS = {
  network: 'Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.',
  notfound: 'Güncelleme bilgisi sunucuda bulunamadı.',
  http: 'Sunucu şu an yanıt vermiyor. Biraz sonra tekrar dene.',
  manifest: 'Güncelleme bilgisi okunamadı.',
  verify: 'İndirilen dosya doğrulanamadı. Tekrar dene.',
  unknown: 'Beklenmeyen bir hata oluştu.',
};
function showError(reason) {
  $('errText').textContent = ERRORS[reason] || ERRORS.unknown;
  show('error');
}

async function run() {
  show('checking');
  try {
    const [r] = await Promise.all([window.updater.check(), sleep(900)]);
    if (r.status === 'uptodate') return window.updater.launch();
    if (r.status === 'available') {
      $('availInfo').textContent = 'İndirilecek: ' + fmt(r.totalBytes) + (r.version ? '  ·  Sürüm ' + r.version : '');
      return show('available');
    }
    showError(r.reason);
  } catch {
    showError('unknown');
  }
}

async function doUpdate() {
  $('sizeText').textContent = '0 B / 0 B';
  $('barFill').style.width = '0%';
  show('downloading');
  try {
    const r = await window.updater.download();
    if (r.ok) { await sleep(500); return window.updater.launch(); }
    showError(r.reason);
  } catch {
    showError('unknown');
  }
}

window.updater.onProgress(({ received, total }) => {
  $('sizeText').textContent = fmt(received) + ' / ' + fmt(total);
  $('barFill').style.width = (total ? Math.min(100, (received / total) * 100) : 0) + '%';
});
$('btnUpdate').addEventListener('click', doUpdate);
$('btnRetry').addEventListener('click', run);
$('btnQuit').addEventListener('click', () => window.updater.quit());
run();
