// Kullanım: node make-manifest.js
// Oyun dosyalarının boyut ve SHA-256 değerlerini manifest.json'a yazar.
// Oyun dosyalarını (game.js, index.html, assets/*) her değiştirişinde çalıştır
// ve manifest.json'u da GitHub'a yükle.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const FILE_RE = /^(index\.html|game\.js|assets\/[\w.\-]+)$/;

const list = ['index.html', 'game.js'];
const assets = path.join(root, 'assets');
if (fs.existsSync(assets)) {
  for (const f of fs.readdirSync(assets).sort()) {
    if (fs.statSync(path.join(assets, f)).isFile()) list.push('assets/' + f);
  }
}

const files = [];
for (const rel of list) {
  if (!FILE_RE.test(rel)) { console.warn('Atlandı (izin verilmeyen ad):', rel); continue; }
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) { console.error('EKSİK DOSYA:', rel); process.exit(1); }
  const buf = fs.readFileSync(full);
  files.push({ path: rel, size: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') });
}

// Sürüm: dosya içeriklerinden türetilir, sadece dosyalar değişince değişir
const version = crypto.createHash('sha256').update(files.map((f) => f.sha256).join('')).digest('hex').slice(0, 8);
const manifest = { version, updated: new Date().toISOString(), files };
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log('manifest.json yazıldı. Sürüm:', version);
for (const f of files) console.log(' ', f.path.padEnd(22), (f.size / 1024).toFixed(1).padStart(8), 'KB');
