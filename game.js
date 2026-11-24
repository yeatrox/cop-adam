'use strict';
const W = 1280, H = 720, GROUND = 600;
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
ctx.imageSmoothingQuality = 'high';
function fit() { const s = Math.min(innerWidth / W, innerHeight / H); cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; }
addEventListener('resize', fit); fit();

// ---------- Sprite ----------
const img = new Image(); img.src = 'assets/sprites.png';
const CW = 163, CH = 259, SC = 0.5, FH = CH * SC;
const ANIM = { walk: { row: 0 }, jump: { row: 1 }, crouch: { row: 2 } };
function drawFrame(anim, i, x, y, flip, sx = 1, sy = 1) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y + 4 * SC));
  if (flip) ctx.scale(-1, 1);
  ctx.scale(sx, sy);
  ctx.drawImage(img, i * CW, ANIM[anim].row * CH, CW, CH, -CW * SC / 2, -FH, CW * SC, FH);
  ctx.restore();
}

// ---------- Girdi ----------
const keys = {}, mouse = { x: 0, y: 0 }; let jumpPressed = false, clickL = false, clickR = false, btns = [];
const mpos = e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; };
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (!keys[e.code] && ['Space', 'KeyW', 'ArrowUp'].includes(e.code)) jumpPressed = true;
  if (e.code === 'Escape') mode = 'menu';
  keys[e.code] = true;
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousemove', mpos);
cv.addEventListener('mousedown', e => {
  mpos(e);
  if (mode === 'play') { if (e.button === 0) clickL = true; if (e.button === 2) clickR = true; }
  else if (e.button === 0) for (const b of btns) if (mouse.x > b.x && mouse.x < b.x + b.w && mouse.y > b.y && mouse.y < b.y + b.h) { b.fn(); break; }
});
const left = () => keys.KeyA || keys.ArrowLeft || joy.l, right = () => keys.KeyD || keys.ArrowRight || joy.r, down = () => keys.KeyS || keys.ArrowDown || joy.d;

// ---------- Dokunmatik kontroller (mobil) ----------
let touchMode = matchMedia('(pointer: coarse)').matches;
const JOY = { x: 190, y: 540, r: 95 }, BTN_A = { x: 1130, y: 540, r: 80 }, BTN_S = { x: 950, y: 620, r: 62 }, BTN_M = { x: 1230, y: 46, r: 28 };
const joy = { id: null, dx: 0, dy: 0, l: false, r: false, u: false, d: false }, hold = { a: null, s: null };
const toCv = t => { const r = cv.getBoundingClientRect(); return { x: (t.clientX - r.left) * W / r.width, y: (t.clientY - r.top) * H / r.height }; };
const inCircle = (p, b, k = 1.25) => Math.hypot(p.x - b.x, p.y - b.y) < b.r * k;
function joyUpdate(p) {
  let dx = p.x - JOY.x, dy = p.y - JOY.y; const d = Math.hypot(dx, dy) || 1, m = Math.min(d, JOY.r);
  dx = dx / d * m; dy = dy / d * m; joy.dx = dx; joy.dy = dy;
  const u = dy < -JOY.r * .55;
  if (u && !joy.u) jumpPressed = true;                         // yukarı itince zıpla
  joy.u = u; joy.l = dx < -JOY.r * .3; joy.r = dx > JOY.r * .3; joy.d = dy > JOY.r * .55;
}
function touchReset() { joy.id = null; joy.dx = joy.dy = 0; joy.l = joy.r = joy.u = joy.d = false; hold.a = hold.s = null; }
function onTouch(e) {
  e.preventDefault(); touchMode = true;
  for (const t of e.changedTouches) {
    const p = toCv(t);
    if (e.type === 'touchstart') {
      if (mode !== 'play') { for (const b of btns) if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { b.fn(); break; } continue; }
      if (inCircle(p, BTN_M, 1.3)) { mode = 'menu'; touchReset(); }
      else if (inCircle(p, BTN_A)) { hold.a = t.identifier; clickL = true; }
      else if (inCircle(p, BTN_S)) { hold.s = t.identifier; clickR = true; }
      else if (p.x < W * .45 && joy.id === null) { joy.id = t.identifier; joyUpdate(p); }
    } else if (e.type === 'touchmove') { if (t.identifier === joy.id) joyUpdate(p); }
    else {
      if (t.identifier === joy.id) { joy.id = null; joy.dx = joy.dy = 0; joy.l = joy.r = joy.u = joy.d = false; }
      if (t.identifier === hold.a) hold.a = null;
      if (t.identifier === hold.s) hold.s = null;
    }
  }
}
['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(n => cv.addEventListener(n, onTouch, { passive: false }));
function circleBtn(b, label, pressed, color) {
  ctx.globalAlpha = pressed ? .55 : .28; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
  ctx.globalAlpha = .9; ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff'; ctx.font = `bold ${b.r > 70 ? 24 : 17}px monospace`; ctx.textAlign = 'center'; ctx.fillText(label, b.x, b.y + 7);
}
function drawTouch() {
  ctx.save();
  ctx.globalAlpha = .25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(JOY.x, JOY.y, JOY.r, 0, 7); ctx.fill();
  ctx.globalAlpha = .6; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
  ctx.globalAlpha = .85; ctx.fillStyle = '#28d7ff'; ctx.beginPath(); ctx.arc(JOY.x + joy.dx, JOY.y + joy.dy, 40, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  circleBtn(BTN_A, 'VUR', hold.a !== null, '#ff5a5a');
  const ready = P.sp >= 1, pulse = Math.floor(performance.now() / 120) % 2 ? '#ffe14d' : '#ffffff';
  circleBtn(BTN_S, 'SÜPER', hold.s !== null, ready ? pulse : '#28d7ff');
  ctx.strokeStyle = ready ? pulse : '#28d7ff'; ctx.lineWidth = 6; ctx.beginPath();
  ctx.arc(BTN_S.x, BTN_S.y, BTN_S.r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * P.sp); ctx.stroke();   // süper dolum halkası
  circleBtn(BTN_M, 'II', false, '#ffffff');
  ctx.restore();
}

// ---------- Haritalar (her maçta rastgele) ----------
const THEMES = [
  { name: 'Neon Şehir', sky: ['#07061a', '#1b0f45', '#3d1668'], far: ['#161436', '#1b1844'], near: ['#1f1a4d', '#251f5c'], line: '#28d7ff', win: ['#ff4fd8', '#28d7ff'], gnd: '#0d0b1f' },
  { name: 'Volkan Gecesi', sky: ['#12030a', '#3a0a12', '#8a2a10'], far: ['#2a0f12', '#34130f'], near: ['#44180f', '#521e10'], line: '#ff6a1a', win: ['#ffb02e', '#ff4d2e'], gnd: '#1a0a08' },
  { name: 'Zehirli Orman', sky: ['#02100c', '#06301f', '#0e5a3a'], far: ['#08241a', '#0a2c20'], near: ['#0d3a28', '#104630'], line: '#39ff88', win: ['#b6ff3d', '#39ff88'], gnd: '#06150f' },
  { name: 'Buz Çağı', sky: ['#050a1f', '#12306b', '#5aa0d8'], far: ['#1a3470', '#1e3d80'], near: ['#2a5399', '#3366b3'], line: '#bff4ff', win: ['#ffffff', '#9be8ff'], gnd: '#0c1a33' }
];
let lastTheme = -1;
function makeCity(w, f, minH, maxH, cols, wins) {
  const list = []; let x = -50;
  while (x < w * f + W + 200) {
    const bw = 70 + Math.random() * 90, bh = minH + Math.random() * (maxH - minH), c = Math.floor(bw / 18), r = Math.floor(bh / 24);
    list.push({ x, w: bw, h: bh, c: cols[Math.random() < .5 ? 0 : 1], cols: c, win: wins ? Array.from({ length: c * r }, () => Math.random() < .35) : null });
    x += bw + 6 + Math.random() * 30;
  }
  return list;
}
function pickMap() {
  let i; do i = Math.floor(Math.random() * THEMES.length); while (i === lastTheme); lastTheme = i;
  const t = THEMES[i], w = 1800 + Math.floor(Math.random() * 800);
  return { ...t, w, stars: Array.from({ length: 120 }, () => ({ x: Math.random() * (w * .05 + W), y: Math.random() * 380, s: Math.random() < .2 ? 3 : 2 })),
           farC: makeCity(w, .25, 140, 330, t.far, false), nearC: makeCity(w, .5, 90, 250, t.near, true) };
}
function drawCity(list, f, cam, M) {
  for (const b of list) {
    const sx = Math.round(b.x - cam * f); if (sx > W || sx + b.w < 0) continue;
    ctx.fillStyle = b.c; ctx.fillRect(sx, GROUND - b.h, b.w, b.h);
    if (b.win) b.win.forEach((on, i) => { if (on) { ctx.fillStyle = M.win[i % 2]; ctx.fillRect(sx + 8 + (i % b.cols) * 18, GROUND - b.h + 10 + Math.floor(i / b.cols) * 24, 8, 10); } });
  }
}
function drawWorld(cam, M) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, M.sky[0]); g.addColorStop(.6, M.sky[1]); g.addColorStop(1, M.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e6f4ff';
  for (const s of M.stars) ctx.fillRect(((s.x - cam * .05) % (W + 40) + W + 40) % (W + 40), s.y, s.s, s.s);
  drawCity(M.farC, .25, cam, M); drawCity(M.nearC, .5, cam, M);
  ctx.fillStyle = M.gnd; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = M.line; ctx.fillRect(0, GROUND, W, 3);
  ctx.globalAlpha = .12; ctx.fillRect(0, GROUND + 3, W, 10); ctx.globalAlpha = .08;
  for (let x = -((cam % 64) + 64) % 64; x < W; x += 64) ctx.fillRect(x, GROUND + 14, 2, H - GROUND);
  for (let y = GROUND + 46; y < H; y += 46) ctx.fillRect(0, y, W, 2);
  ctx.globalAlpha = 1;
}

// ---------- Dövüşçü ----------
const SPEED = 280, CROUCH_SPEED = 90, GRAV = 2300, JUMP_V = -900, HITS_FOR_SUPER = 5;
const DIFF = {
  Kolay:  { spd: 170, acd: 1.0,  dmg: 5, react: .35, aggr: .6,  atkP: .5, supP: .2, jumpP: .04, dodge: false },
  Normal: { spd: 230, acd: .65,  dmg: 7, react: .2,  aggr: .85, atkP: .7, supP: .5, jumpP: .08, dodge: false },
  Zor:    { spd: 290, acd: .42,  dmg: 9, react: .1,  aggr: 1,   atkP: .9, supP: .9, jumpP: .12, dodge: true }
};
let diff = 'Normal';
const mk = (x, face, bot) => ({ x, y: GROUND, vx: 0, vy: 0, kx: 0, face, state: 'ground', t: 0, walkT: 0, crouch: 0, anim: 'walk', frame: 0, idleT: 0,
  hp: 100, sp: 0, bot, atk: -1, sup: -1, hitDone: false, stun: 0, flash: 0, cd: 0, acd: .38, dmg: 8, speed: SPEED, dir: 0, ai: 0, jmp: false });
const sparks = [];
const spark = (x, y, c) => { for (let i = 0; i < 12; i++) sparks.push({ x, y, vx: (Math.random() - .5) * 500, vy: -Math.random() * 400, t: .35, c }); };

function step(f, dir, jump, crch, dt) {
  if (f.stun > 0) { f.stun -= dt; dir = 0; jump = false; crch = false; }
  if (f.sup >= 0) { dir = 0; jump = false; crch = false; }
  const tg = (crch && f.state === 'ground') ? 5 : 0;
  f.crouch += Math.sign(tg - f.crouch) * Math.min(Math.abs(tg - f.crouch), 30 * dt);
  f.vx = dir * (f.crouch >= 1 ? CROUCH_SPEED : f.speed);
  if (dir) f.face = dir;
  switch (f.state) {
    case 'ground': if (jump && f.crouch < 2) { f.state = 'prep'; f.t = 0; } break;
    case 'prep': f.t += dt; f.vx *= .5; if (f.t >= .12) { f.state = 'air'; f.vy = JUMP_V; } break;
    case 'air': f.vy += GRAV * dt; f.y += f.vy * dt; if (f.y >= GROUND) { f.y = GROUND; f.vy = 0; f.state = 'land'; f.t = 0; } break;
    case 'land': f.t += dt; f.vx *= .6; if (jump) { f.state = 'prep'; f.t = 0; } else if (f.t >= .09) f.state = 'ground'; break;
  }
  if (f.sup >= 0) f.vx = f.face * 720;
  f.kx *= Math.pow(.003, dt);
  f.x += (f.vx + f.kx) * dt;
  if (f.state === 'prep') { f.anim = 'jump'; f.frame = Math.min(2, Math.floor(f.t / .04)); }
  else if (f.state === 'air') { f.anim = 'jump'; f.frame = f.vy < 0 ? 3 + Math.min(2, Math.floor((1 - -f.vy / -JUMP_V) * 3)) : (f.vy / -JUMP_V < .45 ? 6 : 7); }
  else if (f.state === 'land') { f.anim = 'jump'; f.frame = 8; }
  else if (f.crouch > .01) { f.anim = 'crouch'; f.frame = Math.min(7, Math.floor(f.crouch)); }
  else if (dir) { f.anim = 'walk'; f.walkT += dt * 11; f.frame = Math.floor(f.walkT) % 7; }
  else { f.anim = 'walk'; f.frame = 0; f.walkT = 0; }
  f.idleT = (f.anim === 'walk' && f.frame === 0 && f.state === 'ground' && f.sup < 0 && f.atk < 0) ? f.idleT + dt : 0;
  f.flash -= dt; f.cd -= dt;
}
const inRange = (f, o, r) => { const dx = (o.x - f.x) * f.face; return dx > -20 && dx < r && Math.abs(o.y - f.y) < 100; };
function hit(f, o, dmg, kb, isSup) {
  o.hp = Math.max(0, o.hp - dmg); o.stun = isSup ? .45 : .2; o.kx = f.face * kb; o.flash = .15; o.atk = -1;
  spark(o.x, o.y - 70, isSup ? '#ffe14d' : '#ffffff');
  f.sp = isSup ? .4 : Math.min(1, f.sp + 1 / HITS_FOR_SUPER);      // süper isabet ederse bar kısmen dolar
}
function combat(f, o, dt) {
  if (f.atk >= 0) {
    f.atk += dt;
    if (!f.hitDone && f.atk >= .07) { f.hitDone = true; if (inRange(f, o, 90)) hit(f, o, f.dmg, 260, false); }
    if (f.atk > .3) f.atk = -1;
  }
  if (f.sup >= 0) {
    f.sup += dt;
    if (!f.hitDone && inRange(f, o, 70)) { f.hitDone = true; hit(f, o, 30, 750, true); }
    if (f.sup > .32) f.sup = -1;
  }
}
const startAtk = f => { if (f.cd <= 0 && f.atk < 0 && f.sup < 0 && f.stun <= 0) { f.atk = 0; f.hitDone = false; f.cd = f.acd; } };
const startSup = f => { if (f.sp >= 1 && f.sup < 0 && f.stun <= 0) { f.sp = 0; f.sup = 0; f.hitDone = false; f.atk = -1; } };

function botAI(f, o, dt) {
  const D = DIFF[diff], dx = o.x - f.x, ad = Math.abs(dx), s = Math.sign(dx) || 1;
  f.ai -= dt; f.jmp = false;
  if (f.ai <= 0) {
    f.ai = D.react * (.7 + Math.random() * .6);
    f.dir = ad > 80 ? (Math.random() < D.aggr ? s : 0) : (Math.random() < .25 ? -s : 0);
    if (Math.random() < D.jumpP) f.jmp = true;
    if (D.dodge && o.atk >= 0 && ad < 130 && Math.random() < .5) { f.dir = -s; f.jmp = true; }
    if (f.stun <= 0 && f.sup < 0) {
      if (f.sp >= 1 && ad > 90 && ad < 260 && Math.random() < D.supP) { f.face = s; startSup(f); }
      else if (ad < 95 && Math.random() < D.atkP) { f.face = s; startAtk(f); }
    }
  }
  return f.dir;
}

// ---------- Maç ----------
let mode = 'menu', M = pickMap(), P, E, cam = 0, intro = 0, winner = '';
function startMatch() {
  M = pickMap(); P = mk(M.w * .3, 1, false); E = mk(M.w * .7, -1, true);
  const D = DIFF[diff]; E.speed = D.spd; E.acd = D.acd; E.dmg = D.dmg;
  touchReset(); sparks.length = 0; winner = ''; intro = 1.1; mode = 'play'; cam = 0;
}
function updatePlay(dt) {
  if (intro > 0) { intro -= dt; step(P, 0, false, false, dt); step(E, 0, false, false, dt); }
  else if (!winner) {
    if (hold.a !== null) clickL = true;
    if (!touchMode && (clickL || clickR)) P.face = (mouse.x + cam > P.x - cam + cam) ? 1 : -1;
    step(P, (right() ? 1 : 0) - (left() ? 1 : 0), jumpPressed, down(), dt);
    if (clickL) startAtk(P); if (clickR) startSup(P);
    const d = botAI(E, P, dt); step(E, d, E.jmp, false, dt);
    if (E.sup < 0 && E.stun <= 0) E.face = Math.sign(P.x - E.x) || 1;
  } else { step(P, 0, false, false, dt); step(E, 0, false, false, dt); }
  clickL = clickR = jumpPressed = false;
  combat(P, E, dt); combat(E, P, dt);
  for (const f of [P, E]) f.x = Math.max(40, Math.min(M.w - 40, f.x));
  if (!winner && (P.hp <= 0 || E.hp <= 0)) { winner = P.hp > 0 ? 'KAZANDIN!' : 'KAYBETTİN'; mode = 'over'; }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 1400 * dt; if (s.t <= 0) sparks.splice(i, 1); }
  const tc = Math.max(0, Math.min(M.w - W, (P.x + E.x) / 2 - W / 2)); cam += (tc - cam) * Math.min(1, dt * 8);
}

// ---------- Çizim ----------
function drawFighter(f, tint) {
  const x = f.x - cam, y = f.y;
  const h = Math.max(0, GROUND - y), k = Math.max(.4, 1 - h / 400);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 6, 34 * k, 7 * k, 0, 0, 7); ctx.fill();
  let bx = 1, by = 1;
  if (f.idleT > 0) { const fd = Math.min(1, f.idleT / .3), b = (Math.sin(f.idleT * Math.PI * 2 / 2.6 - Math.PI / 2) + 1) / 2; by = 1 + .028 * b * fd; bx = 1 - .012 * b * fd; }
  const p = f.atk >= 0 ? Math.min(1, f.atk / .25) : 0, lunge = Math.sin(p * Math.PI) * 16 * f.face;
  if (f.sup >= 0) for (let i = 3; i >= 1; i--) { ctx.save(); ctx.globalAlpha = .18 * (4 - i); ctx.filter = 'brightness(2) saturate(2)'; drawFrame(f.anim, f.frame, x - f.face * i * 34, y, f.face < 0); ctx.restore(); }
  ctx.save(); ctx.filter = f.flash > 0 ? 'brightness(3)' : (tint || 'none');
  ctx.translate(x, y); ctx.rotate(Math.sin(p * Math.PI) * .12 * f.face + (f.stun > 0 ? -.12 * f.face : 0)); ctx.translate(-x + lunge, -y);
  if (img.complete) drawFrame(f.anim, f.frame, x, y, f.face < 0, bx, by);
  ctx.restore();
  if (f.atk >= 0 && f.atk < .25) { ctx.save(); ctx.translate(x + f.face * 40, y - 60); ctx.scale(f.face, 1); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-10, 0, 55 + p * 20, -1.1, 1.1); ctx.stroke(); ctx.restore(); }
}
function drawBars(f, label) {
  const x = Math.round(f.x - cam), y = Math.round(f.y - FH - 22), w = 76;
  ctx.fillStyle = '#000a'; ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 20);
  const r = f.hp / 100; ctx.fillStyle = r > .5 ? '#3dff6e' : r > .25 ? '#ffd23d' : '#ff3d3d'; ctx.fillRect(x - w / 2, y, w * r, 7);
  const ready = f.sp >= 1; ctx.fillStyle = '#1a2233'; ctx.fillRect(x - w / 2, y + 9, w, 5);
  ctx.fillStyle = ready ? (Math.floor(performance.now() / 120) % 2 ? '#ffe14d' : '#fff') : '#28d7ff'; ctx.fillRect(x - w / 2, y + 9, w * f.sp, 5);
  ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(label + (ready && !f.bot ? (touchMode ? ' • SÜPER HAZIR' : ' • SAĞ TIK: SÜPER') : ''), x, y - 6);
}
function button(label, x, y, w, h, fn, active) {
  const hov = mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + h;
  ctx.fillStyle = active ? M.line : hov ? '#2a2a55' : '#12122b'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = M.line; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = active ? '#05050f' : '#fff'; ctx.font = `bold ${h > 50 ? 30 : 20}px monospace`; ctx.textAlign = 'center'; ctx.fillText(label, x + w / 2, y + h / 2 + (h > 50 ? 10 : 7));
  btns.push({ x, y, w, h, fn });
}
function title(t, y, size, c) { ctx.textAlign = 'center'; ctx.font = `bold ${size}px monospace`; ctx.fillStyle = '#000'; ctx.fillText(t, W / 2 + 4, y + 4); ctx.fillStyle = c; ctx.fillText(t, W / 2, y); }

let last = performance.now(), menuA = { ...mk(420, 1, false) }, menuB = mk(860, -1, true);
function loop(now) {
  const dt = Math.min(.033, (now - last) / 1000); last = now; btns = [];
  if (mode === 'menu') {
    cam = 0; step(menuA, 0, false, false, dt); step(menuB, 0, false, false, dt); menuB.face = -1;
    drawWorld(0, M); drawFighter(menuA); drawFighter(menuB, 'hue-rotate(150deg)');
    ctx.fillStyle = '#05050fb0'; ctx.fillRect(0, 0, W, H * .62);
    title('NEON ÇÖP ADAM', 130, 72, M.line); title('A R E N A  1 v 1', 190, 30, '#fff');
    button('OYNA', W / 2 - 150, 240, 300, 70, startMatch);
    ctx.textAlign = 'center'; ctx.font = '16px monospace'; ctx.fillStyle = '#9bb'; ctx.fillText('ZORLUK', W / 2, 348);
    Object.keys(DIFF).forEach((d, i) => button(d.toUpperCase(), W / 2 - 235 + i * 160, 362, 150, 44, () => diff = d, diff === d));
    ctx.fillStyle = '#fff'; ctx.fillText(touchMode ? 'Joystick: yürü / yukarı: zıpla / aşağı: çömel • VUR • SÜPER (5 isabet sonrası)' : 'A/D yürü • W zıpla • S çömel • Sol tık: saldırı • Sağ tık: süper (5 isabet sonrası)', W / 2, 440);
  } else {
    updatePlay(dt); drawWorld(cam, M); drawFighter(E, 'hue-rotate(150deg)'); drawFighter(P);
    for (const s of sparks) { ctx.fillStyle = s.c; ctx.fillRect(s.x - cam, s.y, 5, 5); }
    drawBars(E, 'BOT • ' + diff.toUpperCase()); drawBars(P, 'SEN');
    if (touchMode && mode === 'play') drawTouch();
    ctx.textAlign = 'left'; ctx.font = '14px monospace'; ctx.fillStyle = '#fff9'; ctx.fillText('Harita: ' + M.name + (touchMode ? '' : '   [Esc] menü'), 16, 28);
    if (intro > 0) title(intro > .5 ? 'HAZIR...' : 'DÖVÜŞ!', 300, 80, '#fff');
    if (mode === 'over') {
      ctx.fillStyle = '#000a'; ctx.fillRect(0, 0, W, H);
      title(winner, 280, 90, winner === 'KAZANDIN!' ? '#ffe14d' : '#ff5a5a');
      button('TEKRAR OYNA (YENİ HARİTA)', W / 2 - 220, 350, 440, 64, () => { winner = ''; startMatch(); });
      button('MENÜ', W / 2 - 100, 430, 200, 50, () => { winner = ''; M = pickMap(); mode = 'menu'; });
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
