// Web dosyalarını Capacitor için www/ klasörüne kopyalar
const fs = require('fs');
fs.rmSync('www', { recursive: true, force: true });
fs.mkdirSync('www');
['index.html', 'game.js'].forEach(f => fs.copyFileSync(f, 'www/' + f));
fs.cpSync('assets', 'www/assets', { recursive: true });
console.log('www hazır');
