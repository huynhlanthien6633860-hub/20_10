/* ==========================================================
   Thiệp 20/10 – script.js  (JavaScript thuần, không phụ thuộc thư viện)
   Mục lục:
     0. CONFIG  (xưng hô theo data-who trên thẻ <html>)
     1. Tiện ích + trạng thái
     2. Hiệu ứng hạt (canvas): cánh hoa, tim, sao, pháo giấy
     3. Nhạc nền (music.mp3, lặp vô hạn)
     4. Trang trí từng cảnh (SVG) + bó hoa
     5. Đôi mắt, typewriter, điều hướng màn hình
     6. Kịch bản: intro → mở quà → câu chuyện → lời chúc → bất ngờ → kết thúc
     7. Khởi động
   ========================================================== */
'use strict';

/* ---------- 0. CONFIG ---------- */
// Trang em.html  → xưng "anh", gọi "em"   (data-who="em")
// Trang cau.html → xưng "tui", gọi "cậu"  (data-who="cau")
const WHO = document.documentElement.dataset.who === 'cau' ? 'cau' : 'em';
const ME = WHO === 'cau' ? 'tui' : 'anh', YOU = WHO === 'cau' ? 'cậu' : 'em';
const CONFIG = {
  defaults: {
    to: YOU,
    from: WHO === 'cau' ? 'Lân' : 'Lân',
    msg: `Chúc ${YOU} một ngày 20/10 thật rực rỡ, luôn vui vẻ, tự tin và được yêu thương theo cách tuyệt vời nhất. Mong rằng mỗi ngày đều có những điều nhỏ bé khiến ${YOU} mỉm cười, những ước mơ dần thành hiện thực và thật nhiều hạnh phúc ở phía trước.`,
    fin: `Cảm ơn vì đã luôn là phiên bản rực rỡ nhất của chính mình. Chúc ${YOU} mãi tươi tắn như hoa và mãi được yêu thương. ❀`,
    theme: '0',
    c: ''
  },
  // Nhạc nền: phát lặp vô hạn, không có nút tắt. Trình duyệt chỉ cho phát tiếng sau lần chạm đầu tiên của người xem.
  musicSrc: 'music.mp3',
  musicVolume: 0.6,
  story: {
    intro: `Hôm nay ${ME} có một nhiệm vụ quan trọng là...`,
    s1: `ui ${YOU} đẹp quá`,
    s2: 'à thì cũng sắp\n20/10 rồi',
    s3: `nên là ${ME} muốn`,
    s4: `chúc ${YOU} thật nhiều sức khỏe`,
    s5: `chúc ${YOU} thật xinh đẹp`,
    s6: `và chúc ${YOU} luôn giữ\nnụ cười trên môi`,
    s6sub: ['mỗi ngày đều có điều nhỏ bé', `khiến ${YOU} mỉm cười`, 'ước mơ nào cũng thành thật']
  }
};

/* ---------- 1. Tiện ích + trạng thái ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduce = () => mq.matches;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', ''), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return { h, s: s * 100, l: l * 100 };
}
const hsl = (h, s, l, a = 1) => `hsla(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%,${a})`;

const THEMES = [
  { name: 'Hồng pastel', a: '#ff8fb1', d: '#e0457a', eye: '#3df2ff' },
  { name: 'Đỏ hồng',     a: '#ff5c86', d: '#c9154f', eye: '#5ab8ff' },
  { name: 'Hồng đào',    a: '#ffa38a', d: '#e0654a', eye: '#7dffd8' },
  { name: 'Tím mộng mơ', a: '#c3a1ff', d: '#8a55e0', eye: '#b8f0ff' }
];

const S = { ...CONFIG.defaults };

function themeColors() {
  if (S.theme === 'c') { const x = hexToHsl(S.c); return { a: '#' + S.c, d: hsl(x.h, Math.min(80, x.s + 10), Math.max(32, x.l * .68)), eye: THEMES[0].eye }; }
  return THEMES[+S.theme] || THEMES[0];
}
function applyTheme() {
  const t = themeColors(), r = document.documentElement.style;
  r.setProperty('--accent', t.a); r.setProperty('--accent-d', t.d); r.setProperty('--eye', t.eye);
  FX.setAccent(t.a); FX.setEye(t.eye);
}

/* ---------- 2. Hiệu ứng hạt (một canvas dùng chung) ---------- */
const FX = (() => {
  const cv = $('#fx'), cx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, parts = [], stars = [], acc = {}, last = 0, raf = 0, mode = {}, starA = 1, starT = 1, dawn = false;
  let accent = '#ff8fb1', pal = [], eyeCol = '#3df2ff', motes = [];
  const cvf = $('#fxf'), cxf = cvf.getContext('2d'); const aura = { on: false, x: 0, y: 0, es: 60, s: 1, rx: 0, ry: 0, z: 0, a: 1 };
  const MODES = {
    s0: { spark: 3, petal: .5 }, s1: { petal: 5, spark: 1 }, s2: { petal: 3, leaf: 2.5, shoot: .15 },
    s3: { spark: 4, shoot: .25 }, s4: { heart: 1.1, spark: 2 }, s5: { petal: 1.5, spark: 3 },
    s6: { heart: 1.1, petal: 2, spark: 1 }, sc: { spark: 4, shoot: .3, petal: .8, heart: .5 }, dawn: { petal: 2.4, spark: 2.5, heart: .4 }, surprise: { heart: 2.8, petal: 3, spark: 3 }
  };
  const max = () => (W < 560 ? 70 : 130);

  function setPalette() {
    const x = hexToHsl(accent);
    pal = dawn
      ? ['#fff4f0', '#ffe3ea', '#ffd0b0', '#ffffff', hsl(x.h, 90, 88)]
      : [accent, hsl(x.h, 85, 82), '#ffd6e0', hsl(x.h, 70, 65), '#fff0f4'];
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cvf.width = cv.width; cvf.height = cv.height; cxf.setTransform(dpr, 0, 0, dpr, 0, 0); initMotes();
    const n = Math.round(Math.min(90, W * H / 9000));
    stars = Array.from({ length: n }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(.4, 1.4), p: rand(0, TAU), s: rand(.6, 2.2) }));
    if (reduce()) drawStatic();
  }
  function spawn(t, o = {}) {
    if (parts.length >= max() && !o.force) return;
    const base = { t, x: rand(0, W), y: -20, vx: 0, vy: 0, a: 1, c: pick(pal), age: 0, life: Infinity, r: rand(0, TAU), vr: rand(-2, 2), f: rand(0, TAU), vf: rand(1, 3), s: 8 };
    const sm = W < 560 ? .85 : 1.1;
    if (t === 'petal') Object.assign(base, { x: rand(-20, W + 20), vx: rand(-14, 14), vy: rand(34, 74), s: rand(6, 11) * sm, a: rand(.55, .95), sw: rand(0, TAU), sws: rand(.8, 1.8), swa: rand(14, 34) });
    else if (t === 'leaf') Object.assign(base, { x: rand(0, W), vx: rand(-20, 10), vy: rand(30, 60), s: rand(4, 7) * sm, c: pick(['#ff9d3c', '#ffc15a', '#e8892f']), a: .85, sw: rand(0, TAU), sws: rand(1, 2), swa: rand(12, 26) });
    else if (t === 'heart') Object.assign(base, { y: H + 20, vy: -rand(44, 96), s: rand(7, 15) * sm, a: rand(.5, .9), sw: rand(0, TAU), sws: rand(.8, 1.6), swa: rand(10, 24), c: dawn ? pick(['#fff', '#ffe3ea', '#ffc2d4']) : pick([accent, '#ff7a9a', '#ffc2d4']) });
    else if (t === 'spark') Object.assign(base, { y: rand(0, H), life: rand(1.2, 2.4), s: rand(2.5, 5.5), c: dawn ? pick(['#fff4c8', '#ffe8a8', '#fff']) : pick(['#fff6d8', '#ffe39a', '#ffd6ea', '#cfeaff']), vy: rand(-8, -2) });
    else if (t === 'shoot') Object.assign(base, { x: rand(W * .35, W * 1.05), y: rand(0, H * .4), vx: -rand(520, 760), vy: rand(190, 280), life: .9, len: rand(80, 140), c: '#fff' });
    else if (t === 'conf') Object.assign(base, { y: o.y, x: o.x, vx: o.vx, vy: o.vy, w: rand(6, 11), h: rand(3, 6), life: rand(3.2, 4.6), c: pick(['#ff8fb1', '#ffd6e0', '#f6d98a', '#ffffff', '#ff5c86', '#ffc39a', accent]), vr: rand(-9, 9) });
    Object.assign(base, o); parts.push(base);
  }
  function setMode(m) { mode = MODES[m] || {}; dawn = (m === 'dawn' || m === 'surprise'); starT = dawn ? .22 : 1; setPalette(); }
  function update(dt) {
    for (const k in mode) { acc[k] = (acc[k] || 0) + mode[k] * dt; while (acc[k] >= 1) { acc[k] -= 1; spawn(k); } }
    starA += (starT - starA) * Math.min(1, dt * 1.2);
    for (const p of parts) {
      p.age += dt;
      if (p.t === 'conf') { p.vy += 620 * dt; p.vx *= (1 - 1.1 * dt); p.vy *= (1 - .35 * dt); p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.f += 8 * dt;
        if (p.age > p.life - .8) p.a = Math.max(0, (p.life - p.age) / .8); }
      else if (p.t === 'shoot') { p.x += p.vx * dt; p.y += p.vy * dt; p.a = Math.sin(Math.PI * Math.min(1, p.age / p.life)); }
      else if (p.t === 'spark') { p.y += p.vy * dt; }
      else { p.y += p.vy * dt; p.sw += p.sws * dt; p.x += (p.vx + Math.cos(p.sw) * p.swa) * dt; p.r += p.vr * dt; p.f += p.vf * dt;
        if (p.t === 'heart') p.a = Math.min(p.a, Math.max(0, p.y / (H * .6))); }
    }
    parts = parts.filter(p => p.age < p.life && p.y < H + 40 && p.y > -80 && p.x > -80 && p.x < W + 80 && p.a > 0.01);
  }
  function heart(s) { cx.beginPath(); cx.moveTo(0, s * .35); cx.bezierCurveTo(-s * 1.1, -s * .25, -s * .55, -s * .95, 0, -s * .4); cx.bezierCurveTo(s * .55, -s * .95, s * 1.1, -s * .25, 0, s * .35); cx.fill(); }
  function drawStars(t) {
    if (starA < .02) return; cx.fillStyle = '#fff';
    for (const s of stars) { cx.globalAlpha = starA * (.35 + .65 * Math.abs(Math.sin(s.p + t * s.s * .6))); cx.fillRect(s.x, s.y, s.r * 1.6, s.r * 1.6); }
    cx.globalAlpha = 1;
  }
  function drawMain(t) {
    cx.clearRect(0, 0, W, H); drawStars(reduce() ? 0 : t);
    for (const p of parts) {
      cx.save(); cx.translate(p.x, p.y); cx.fillStyle = p.c; cx.globalAlpha = p.a;
      if (p.t === 'petal' || p.t === 'leaf') {
        cx.rotate(p.r); cx.scale(1, .5 + .5 * Math.abs(Math.cos(p.f))); const s = p.s;
        cx.beginPath(); cx.moveTo(0, -s); cx.quadraticCurveTo(s * .95, -s * .2, 0, s); cx.quadraticCurveTo(-s * .95, -s * .2, 0, -s); cx.fill();
      } else if (p.t === 'heart') { cx.rotate(Math.sin(p.sw) * .3); heart(p.s); }
      else if (p.t === 'spark') {
        const k = Math.sin(Math.PI * Math.min(1, p.age / p.life)); cx.globalAlpha = k * .95; const s = p.s * (.6 + .6 * k);
        cx.beginPath(); cx.moveTo(0, -s * 1.6); cx.quadraticCurveTo(0, 0, s * 1.6, 0); cx.quadraticCurveTo(0, 0, 0, s * 1.6); cx.quadraticCurveTo(0, 0, -s * 1.6, 0); cx.quadraticCurveTo(0, 0, 0, -s * 1.6); cx.fill();
      } else if (p.t === 'shoot') {
        const a = Math.atan2(p.vy, p.vx), g = cx.createLinearGradient(0, 0, Math.cos(a) * -p.len, Math.sin(a) * -p.len);
        g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.strokeStyle = g; cx.lineWidth = 1.6; cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(Math.cos(a) * -p.len, Math.sin(a) * -p.len); cx.stroke();
      } else if (p.t === 'conf') { cx.rotate(p.r); cx.scale(1, Math.cos(p.f)); cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      cx.restore();
    }
  }
  /* Hạt quỹ đạo 3D quanh đôi mắt: chiếu phối cảnh theo đúng góc xoay của đôi mắt; hạt phía sau vẽ ở canvas dưới, hạt phía trước ở canvas trên */
  function initMotes() { const n = W < 560 ? 14 : 24; motes = Array.from({ length: n }, () => ({ a: rand(0, TAU), R: rand(1.5, 3.1), sp: rand(.18, .55) * (Math.random() < .5 ? -1 : 1), tilt: rand(-1.25, 1.25), sz: rand(1.1, 2.8) })); }
  function drawAura(t) {
    cxf.clearRect(0, 0, W, H); if (!aura.on) return;
    const ry = aura.ry * Math.PI / 180, rx = aura.rx * Math.PI / 180, cyr = Math.cos(ry), syr = Math.sin(ry), cxr = Math.cos(rx), sxr = Math.sin(rx), P = 820;
    for (const m of motes) {
      const ang = m.a + t * m.sp, r = aura.es * m.R, x0 = Math.cos(ang) * r, y0 = Math.sin(ang) * r * Math.sin(m.tilt), z0 = Math.sin(ang) * r * Math.cos(m.tilt);
      const x1 = x0 * cyr + z0 * syr, z1 = -x0 * syr + z0 * cyr, y2 = y0 * cxr - z1 * sxr, z2 = y0 * sxr + z1 * cxr;
      const k = P / Math.max(120, P - (z2 + aura.z)), X = aura.x + x1 * k * aura.s, Y = aura.y + y2 * k * aura.s;
      const al = Math.max(.12, Math.min(1, .55 + z2 / (aura.es * 3.2) * .5)) * aura.a, sz = m.sz * k * (aura.s > .8 ? 1.1 : .8), c = z2 >= 0 ? cxf : cx;
      c.globalAlpha = al * .25; c.fillStyle = eyeCol; c.beginPath(); c.arc(X, Y, sz * 3, 0, TAU); c.fill();
      c.globalAlpha = al; c.fillStyle = '#e8ffff'; c.beginPath(); c.arc(X, Y, sz, 0, TAU); c.fill(); c.globalAlpha = 1;
    }
  }
  function draw(t) { drawMain(t); drawAura(t); }
  function drawStatic() { cx.clearRect(0, 0, W, H); cxf.clearRect(0, 0, W, H); drawStars(0); }
  function frame(t) { raf = requestAnimationFrame(frame); const dt = Math.min(.05, (t - last) / 1000) || .016; last = t; update(dt); draw(t / 1000); }
  function start() { if (reduce()) { drawStatic(); return; } cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  return {
    init() { resize(); setPalette(); start();
      addEventListener('resize', () => { resize(); });
      document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
      mq.addEventListener && mq.addEventListener('change', () => { parts = []; start(); }); },
    setMode, setAccent(c) { accent = c; setPalette(); }, setEye(c) { eyeCol = c; }, setAura(o) { Object.assign(aura, o); },
    burst(x, y, nPetal = 24, nHeart = 8) {
      if (reduce()) return;
      for (let i = 0; i < nPetal; i++) { const a = rand(0, TAU), v = rand(120, 380); spawn('petal', { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, force: true }); }
      for (let i = 0; i < nHeart; i++) { const a = rand(-Math.PI, 0), v = rand(80, 240); spawn('heart', { x, y, vx: Math.cos(a) * v * .4, vy: Math.sin(a) * v - 60, force: true }); }
    },
    tap(x, y) {
      if (reduce()) return;
      for (let i = 0; i < 5; i++) { const a = rand(0, TAU), v = rand(30, 90); spawn('spark', { x, y, vy: Math.sin(a) * v - 20, vx: Math.cos(a) * v, life: rand(.5, .9), force: true }); }
      spawn('heart', { x, y, vy: -rand(60, 90), s: rand(8, 12), force: true });
    },
    confetti() {
      if (reduce()) return; const n = W < 560 ? 70 : 120;
      for (let i = 0; i < n; i++) {
        const left = i % 2 === 0, a = (left ? rand(-80, -55) : rand(-125, -100)) * Math.PI / 180, v = rand(620, 1000);
        spawn('conf', { x: left ? W * .06 : W * .94, y: H * .96, vx: Math.cos(a) * v, vy: Math.sin(a) * v, force: true });
      }
      for (let i = 0; i < 40; i++) spawn('conf', { x: rand(W * .2, W * .8), y: -10, vx: rand(-60, 60), vy: rand(60, 220), force: true });
    }
  };
})();

/* ---------- 3. Nhạc nền: phát lặp vĩnh viễn (không có nút tắt/mở) ---------- */
const Snd = (() => {
  const a = new Audio(CONFIG.musicSrc);
  a.loop = true; a.preload = 'auto'; a.setAttribute('playsinline', ''); a.volume = 0;
  let started = false, fade = 0;
  function fadeIn() {
    clearInterval(fade); const t0 = performance.now();
    fade = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / 2500); a.volume = CONFIG.musicVolume * k; if (k >= 1) clearInterval(fade); }, 60);
  }
  function play() { const p = a.play(); if (p && p.then) p.then(() => { if (!started) { started = true; fadeIn(); } }).catch(() => {}); }
  a.addEventListener('ended', () => { a.currentTime = 0; play(); });       // phòng trường hợp loop bị bỏ qua
  a.addEventListener('pause', () => { if (started && !document.hidden) setTimeout(play, 300); }); // không cho nhạc bị dừng
  // Trình duyệt chặn tự phát tiếng → thử ngay khi mở trang, nếu bị chặn thì phát ở lần chạm/nhấn phím đầu tiên
  const EV = ['pointerup', 'touchend', 'click', 'keydown'];
  const unlock = () => { play(); if (started) EV.forEach(e => document.removeEventListener(e, unlock, true)); };
  EV.forEach(e => document.addEventListener(e, unlock, true));
  document.addEventListener('visibilitychange', () => { if (!started) return; if (document.hidden) a.pause(); else play(); });
  return { start: play };
})();

/* ---------- Toast ---------- */
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

/* ---------- 4. Trang trí từng cảnh (SVG) + bó hoa ---------- */
function buildDecor() {
  const d = n => $(`.deco[data-deco="${n}"]`);

  // s2: cỏ mọc + hoa line-art + hai thiếu nữ áo dài vàng
  { const r = rng(11), cols = ['#e8c85a', '#c9d95a', '#8fd14f', '#3fd6a0', '#35b9ff', '#d9b84a'];
    let blades = '', fl = '';
    for (let i = 0; i < 110; i++) { const x = r() * 1000, h = 60 + r() * 140, b = (r() - .5) * 40;
      blades += `<path class="blade" style="--d:${(r() * 1.8).toFixed(2)}s" stroke="${cols[Math.floor(r() * cols.length)]}" stroke-width="${(1.4 + r() * 2).toFixed(1)}" opacity="${(.55 + r() * .45).toFixed(2)}" d="M${x.toFixed(0)} 300 Q${(x + b * .3).toFixed(0)} ${(300 - h * .55).toFixed(0)} ${(x + b).toFixed(0)} ${(300 - h).toFixed(0)}"/>`; }
    const fc = ['#ff8fb1', '#ffb36b', '#ffe27a', '#ff7ac0', '#ffffff', '#9fd8ff'];
    for (let i = 0; i < 16; i++) { const x = 40 + r() * 920, h = 70 + r() * 120, y = 300 - h, col = fc[Math.floor(r() * fc.length)], n = 5 + Math.floor(r() * 3); let p = '';
      for (let k = 0; k < n; k++) p += `<ellipse cx="${x.toFixed(0)}" cy="${(y - 9).toFixed(0)}" rx="4" ry="9" transform="rotate(${(k / n * 360).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})" stroke="${col}" stroke-width="1.4"/>`;
      fl += `<g class="fl" style="--d:${(1.6 + r() * 2.6).toFixed(2)}s"><path d="M${x.toFixed(0)} 300 Q${(x + (r() - .5) * 14).toFixed(0)} ${(300 - h * .5).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}" stroke="#7fd58a" stroke-width="1.6"/>${p}<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="3.2" fill="${col}" stroke="none"/></g>`; }
    const lady = (cx, y0, hat) => {
      const P = (dd, extra = '') => `<path class="draw" pathLength="1" style="--d:${(.6 + Math.random() * .6).toFixed(2)}s" d="${dd}" ${extra}/>`;
      let s = '';
      if (hat) s += P(`M${cx - 34} ${y0 + 44} Q${cx} ${y0 + 38} ${cx + 34} ${y0 + 44} L${cx} ${y0 + 4} Z`) + P(`M${cx - 12} ${y0 + 44} Q${cx} ${y0 + 74} ${cx + 12} ${y0 + 44}`);
      else s += `<circle cx="${cx + 5}" cy="${y0 + 40}" r="9"/>`;
      s += `<ellipse cx="${cx}" cy="${y0 + 58}" rx="11" ry="14"/>`;
      s += P(`M${cx - 11} ${y0 + 52} Q${cx - 22} ${y0 + 100} ${cx - 14} ${y0 + 152}`) + P(`M${cx + 11} ${y0 + 52} Q${cx + 22} ${y0 + 100} ${cx + 14} ${y0 + 152}`);
      s += P(`M${cx - 26} ${y0 + 94} Q${cx} ${y0 + 80} ${cx + 26} ${y0 + 94}`);
      s += P(`M${cx - 24} ${y0 + 94} C${cx - 16} ${y0 + 140} ${cx - 20} ${y0 + 190} ${cx - 32} ${y0 + 334} Q${cx} ${y0 + 348} ${cx + 36} ${y0 + 334} C${cx + 22} ${y0 + 190} ${cx + 16} ${y0 + 140} ${cx + 24} ${y0 + 94} Z`);
      s += P(`M${cx - 2} ${y0 + 172} Q${cx - 6} ${y0 + 254} ${cx - 10} ${y0 + 340}`);
      s += P(`M${cx - 24} ${y0 + 94} Q${cx - 36} ${y0 + 150} ${cx - 27} ${y0 + 208}`) + P(`M${cx + 24} ${y0 + 94} Q${cx + 36} ${y0 + 150} ${cx + 27} ${y0 + 208}`);
      s += P(`M${cx - 16} ${y0 + 338} L${cx - 18} ${y0 + 404}`) + P(`M${cx + 20} ${y0 + 336} L${cx + 22} ${y0 + 404}`);
      return s;
    };
    d('s2').innerHTML =
      `<svg class="grass" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMax slice">${blades}${fl}</svg>` +
      `<svg class="ladies" viewBox="0 0 240 430">${lady(70, 8, true)}${lady(170, 26, false)}</svg>`;
  }

  // s3: chòm sao (vài chuỗi điểm nối nhau) + viên kim cương xoay
  { const r = rng(5); let ln = '', dots = '';
    for (let ch = 0; ch < 4; ch++) { let x = 30 + r() * 340, y = 40 + r() * 600, prev = null;
      for (let i = 0; i < 6; i++) { x = Math.min(390, Math.max(10, x + (r() - .5) * 120)); y = Math.min(760, Math.max(10, y + (r() - .5) * 110));
        dots += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1 + r() * 1.6).toFixed(1)}"/>`;
        if (prev) ln += `<line pathLength="1" style="--d:${(i * .35 + ch * .3).toFixed(2)}s" x1="${prev[0].toFixed(0)}" y1="${prev[1].toFixed(0)}" x2="${x.toFixed(0)}" y2="${y.toFixed(0)}"/>`;
        prev = [x, y]; } }
    d('s3').innerHTML = `<svg class="sky" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">${ln}${dots}</svg><div class="orb"></div>`;
  }

  // s4: trái tim + nhịp tim
  d('s4').innerHTML =
    `<svg class="heart-big" viewBox="0 0 100 100"><path class="heart-fill" d="M50 88C10 58 6 28 28 20 40 16 48 24 50 32 52 24 60 16 72 20 94 28 90 58 50 88Z"/><path d="M50 88C10 58 6 28 28 20 40 16 48 24 50 32 52 24 60 16 72 20 94 28 90 58 50 88Z"/></svg>` +
    `<svg class="ecg" viewBox="0 0 400 80" preserveAspectRatio="none"><path pathLength="1" d="M0 40H120L135 40 145 12 158 68 170 28 180 40H260L272 40 282 18 294 58 304 40H400"/></svg>`;

  // s5: hoa dây hai bên + bướm + đường chân trời
  { const flower = (x, y, k, dd) => { let p = ''; for (let i = 0; i < 5; i++) p += `<ellipse cx="${x}" cy="${y - 11 * k}" rx="${5 * k}" ry="${11 * k}" transform="rotate(${i * 72} ${x} ${y})"/>`;
      return `<g class="pet" style="--d:${dd}s">${p}<circle cx="${x}" cy="${y}" r="${2.2 * k}"/></g>`; };
    const vine = c => `<svg class="vine ${c}" viewBox="0 0 200 500"><path class="stemv" pathLength="1" d="M60 500C20 420 100 380 70 300 45 230 110 190 80 120 65 80 90 50 100 20"/>` +
      flower(70, 300, 1.4, 1.6) + flower(80, 120, 1.2, 2.4) + flower(100, 20, 1, 3) + flower(48, 410, 1.1, 1.2) + flower(88, 215, 0.9, 2) + `</svg>`;
    const bf = c => `<svg class="bfly ${c}" viewBox="0 0 40 40" style="position:absolute"><g class="w"><path d="M20 20C8 3 0 12 6 22 10 30 18 26 20 20ZM20 20C32 3 40 12 34 22 30 30 22 26 20 20Z"/></g><path d="M20 12V30" stroke="#ffd6ea" stroke-width="1.4" fill="none"/></svg>`;
    d('s5').innerHTML = vine('l') + vine('r') + `<div class="horizon"></div>` + bf('b1') + bf('b2') + bf('b3');
  }

  // s6: đĩa than + hoa hồng + tim line-art
  { const tulip = (x, top, sc) => `<g class="t"><path class="stalk" d="M${x} 360C${x - 10} 280 ${x + 8} 220 ${x} ${top + 70}"/>
      <path class="petal" d="M${x} ${top + 70}C${x - 34} ${top + 60} ${x - 36} ${top + 20} ${x} ${top}C${x + 36} ${top + 20} ${x + 34} ${top + 60} ${x} ${top + 70}Z" transform="translate(0 0)"/>
      <path class="petal" d="M${x} ${top + 70}C${x - 50} ${top + 62} ${x - 54} ${top + 28} ${x - 30} ${top + 12}C${x - 28} ${top + 40} ${x - 12} ${top + 58} ${x} ${top + 70}Z" opacity=".85"/>
      <path class="petal" d="M${x} ${top + 70}C${x + 50} ${top + 62} ${x + 54} ${top + 28} ${x + 30} ${top + 12}C${x + 28} ${top + 40} ${x + 12} ${top + 58} ${x} ${top + 70}Z" opacity=".85"/></g>`;
    d('s6').innerHTML =
      `<div class="vinyl-wrap"><div class="vinyl"></div><span class="mnote">♪</span><span class="mnote n2">♫</span></div>` +
      `<svg class="tulips" viewBox="0 0 200 360">${tulip(60, 60, 1)}${tulip(140, 120, 1)}</svg>` +
      `<svg class="line-hearts" viewBox="0 0 150 120"><path d="M40 60C10 40 20 14 40 18 50 20 54 28 54 32 56 28 62 20 72 22 92 26 84 52 54 78Z"/><path d="M96 98C80 88 84 74 96 76 102 77 104 82 104 84 106 82 110 77 116 79 126 81 122 94 104 108Z"/><path d="M118 20l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M8 110C30 100 22 80 40 84"/></svg>`;
  }
}

/* Bó hoa (dựng lại mỗi lần để theo màu chủ đạo) */
function buildBouquet() {
  const x = hexToHsl(themeColors().a), r = rng(Date.now() % 1000);
  const FL = [
    { x: 200, y: 88, r: 46 }, { x: 132, y: 132, r: 40 }, { x: 268, y: 132, r: 40 }, { x: 88, y: 205, r: 33 },
    { x: 312, y: 205, r: 33 }, { x: 166, y: 190, r: 38 }, { x: 236, y: 190, r: 38 }, { x: 200, y: 245, r: 33 }
  ];
  const cols = [[x.h, 75, 72], [x.h + 12, 80, 78], [x.h - 14, 70, 70], [x.h, 60, 88], [20, 90, 82], [x.h + 8, 78, 66], [x.h - 8, 85, 80], [x.h, 55, 92]];
  let stems = '', leaves = '', flowers = '';
  FL.forEach((f, i) => {
    const dly = (.15 + i * .16).toFixed(2), c = cols[i];
    stems += `<path class="stem" pathLength="1" style="--d:${(i * .1).toFixed(2)}s" d="M200 350Q${(200 + (f.x - 200) * .25).toFixed(0)} ${(350 + f.y) / 2} ${f.x} ${f.y + f.r * .5}"/>`;
    flowers += `<g class="flower" style="--d:${dly}s"><g class="sway" style="animation-delay:${(-r() * 3).toFixed(1)}s">`;
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; flowers += `<circle cx="${(f.x + Math.cos(a) * f.r * .52).toFixed(1)}" cy="${(f.y + Math.sin(a) * f.r * .52).toFixed(1)}" r="${(f.r * .5).toFixed(1)}" fill="${hsl(c[0], c[1], c[2])}" stroke="${hsl(c[0], c[1], c[2] - 22)}" stroke-width="1.4"/>`; }
    flowers += `<circle cx="${f.x}" cy="${f.y}" r="${(f.r * .6).toFixed(1)}" fill="${hsl(c[0], c[1], c[2] + 3)}" stroke="${hsl(c[0], c[1], c[2] - 24)}" stroke-width="1.4"/>` +
      `<path d="M${f.x} ${f.y} m${(-f.r * .28).toFixed(1)} 0 a${(f.r * .28).toFixed(1)} ${(f.r * .28).toFixed(1)} 0 1 1 ${(f.r * .56).toFixed(1)} 0 a${(f.r * .17).toFixed(1)} ${(f.r * .17).toFixed(1)} 0 1 1 ${(-f.r * .36).toFixed(1)} 0" fill="none" stroke="${hsl(c[0], c[1], c[2] - 28)}" stroke-width="1.6" stroke-linecap="round"/>` +
      `<circle cx="${(f.x - f.r * .22).toFixed(1)}" cy="${(f.y - f.r * .26).toFixed(1)}" r="${(f.r * .12).toFixed(1)}" fill="#fff" opacity=".55"/></g></g>`;
  });
  [[150, 290, -50], [250, 290, 50], [112, 262, -70], [288, 262, 70], [200, 300, 0]].forEach((l, i) => {
    leaves += `<ellipse class="leaf" cx="${l[0]}" cy="${l[1]}" rx="11" ry="26" transform="rotate(${l[2]} ${l[0]} ${l[1]})" style="--d:${(.5 + i * .12).toFixed(2)}s"/>`; });
  const ac = hsl(x.h, 80, 60), acd = hsl(x.h, 75, 42);
  $('#bouquet').innerHTML = `<svg class="bq" id="bq" viewBox="0 0 400 440" aria-hidden="true">
    <defs><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf3"/><stop offset="1" stop-color="#ffd9e2"/></linearGradient></defs>
    ${stems}${leaves}${flowers}
    <g class="wrap-paper"><path d="M86 286L314 286 224 434 176 434Z" fill="url(#paper)" stroke="#f6d98a" stroke-width="2"/>
      <path d="M86 286L200 392 314 286" fill="none" stroke="${ac}" stroke-width="2" opacity=".55"/>
      <path d="M150 300L190 428M250 300L210 428M200 300V430" stroke="${ac}" stroke-width="1.4" opacity=".35" fill="none"/></g>
    <g class="bow"><ellipse cx="166" cy="322" rx="34" ry="15" transform="rotate(-22 166 322)" fill="${ac}" stroke="${acd}" stroke-width="2"/>
      <ellipse cx="234" cy="322" rx="34" ry="15" transform="rotate(22 234 322)" fill="${ac}" stroke="${acd}" stroke-width="2"/>
      <path d="M200 328L172 372M200 328L228 372" stroke="${acd}" stroke-width="7" stroke-linecap="round" fill="none"/>
      <circle cx="200" cy="326" r="10" fill="#f6d98a" stroke="#c9a24a" stroke-width="2"/></g></svg>`;
}

/* ---------- 5. Đôi mắt, typewriter, điều hướng ---------- */
/* ---------- Biểu cảm của đôi mắt ---------- */
const MOODS = { neutral: 'bình thường', happy: 'vui', laugh: 'cười lớn', sad: 'buồn', angry: 'giận', surprised: 'ngạc nhiên', love: 'say đắm', star: 'háo hức',
  sleepy: 'buồn ngủ', smug: 'tự mãn', shy: 'ngại ngùng', cry: 'khóc', dizzy: 'chóng mặt', wink: 'nháy mắt', curious: 'tò mò' };
const MOOD_COLOR = { angry: '#ff5a52', sad: '#78a4ff', cry: '#78a4ff', love: '#ff6fa5', star: '#ffe27a', smug: '#c9a4ff', dizzy: '#b8c4ff' };
const MOOD_GAZE = { shy: { x: -.7, y: .8 }, sleepy: { x: 0, y: .75 }, sad: { x: 0, y: .55 }, cry: { x: 0, y: .6 }, surprised: { x: 0, y: 0 }, love: { x: 0, y: 0 },
  star: { x: 0, y: -.2 }, smug: { x: .75, y: -.1 }, dizzy: { circle: true } };
const E = (() => {
  const el = $('#eyes'); let bt = 0, mt = 0, base = 'neutral', cur = 'neutral';
  function apply(name) {
    cur = name; Object.keys(MOODS).forEach(k => el.classList.remove('m-' + k));
    el.classList.toggle('happy', name === 'happy' || name === 'laugh'); el.classList.toggle('wink', name === 'wink'); el.classList.toggle('blushing', name === 'shy');
    if (name !== 'neutral') el.classList.add('m-' + name);
    el.classList.toggle('sym-on', name === 'love' || name === 'star' || name === 'dizzy');
    FX.setEye(MOOD_COLOR[name] || themeColors().eye); Rig.gaze(MOOD_GAZE[name] || null);
    const lab = $('#moodLabel'); if (lab) lab.textContent = name === 'neutral' ? '' : 'Đang cảm thấy: ' + MOODS[name];
  }
  const api = {
    get current() { return cur; },
    // trạng thái cũ của kịch bản (sleep, happy, blush, wink); luôn đặt lại biểu cảm về bình thường
    set(o = {}) { clearTimeout(mt); base = 'neutral'; apply('neutral'); el.classList.toggle('sleep', !!o.sleep); el.classList.toggle('happy', !!o.happy); el.classList.toggle('blushing', !!o.blush); el.classList.toggle('wink', !!o.wink); },
    // biểu cảm: ms = 0 giữ đến khi đổi; ms > 0 tạm thời rồi quay về biểu cảm nền
    mood(name, ms = 0) { clearTimeout(mt); el.classList.remove('sleep'); apply(name); if (ms) mt = setTimeout(() => apply(base), ms); else base = name; },
    blink(ms = 180) { if (['sleep', 'happy', 'sym-on', 'm-sleepy'].some(k => el.classList.contains(k))) return; el.classList.add('blink'); clearTimeout(bt); bt = setTimeout(() => el.classList.remove('blink'), ms); },
    loop() { setTimeout(() => { api.blink(); if (Math.random() < .25) setTimeout(() => api.blink(), 260); api.loop(); }, rand(2600, 5200)); }
  };
  return api;
})();

/* ---------- Đôi mắt 3D: dựng cấu trúc + bộ điều khiển lò xo ---------- */
function buildEyes() {
  const slab = Array.from({ length: 6 }, (_, i) => `<i style="--k:${i + 1}"></i>`).join('');
  const eye = c => `<span class="eye ${c}"><span class="shape"><i class="bloom"></i><span class="slab">${slab}</span><i class="face"></i><b class="sym"></b><u class="gl"></u></span><b class="tear"></b></span>`;
  $('#eyesIn').innerHTML = `<i class="ring r1"></i><i class="ring r2"></i>${eye('e1')}${eye('e2')}<span class="blush"><i>////</i><i>////</i></span>`;
}

const Rig = (() => {
  const wrap = $('#eyes'), inn = $('#eyesIn'), K = 90, C = 13, D = Math.PI / 180;
  let e1, e2, px = 0, py = 0, lastMove = -99, drag = null, move = null, nextAt = 3, last = 0, raf = 0, frame = 0, rect = null, es = 60, esL = 60, sc = 1, gz = null, look = null;
  const wander = { x: 0, y: 0, next: 0 };
  const sp = (k = K, c = C) => ({ x: 0, v: 0, t: 0, k, c });
  const S3 = { rx: sp(), ry: sp(), rz: sp(), tx: sp(), ty: sp(), z: sp(), dx: sp(), dy: sp(), g1x: sp(170, 18), g1y: sp(170, 18), g2x: sp(170, 18), g2y: sp(170, 18) };
  const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2, bell = p => Math.sin(p * Math.PI), wave = p => Math.sin(p * TAU);
  const norm = a => ((a % 360) + 540) % 360 - 180, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), nowS = () => performance.now() / 1000;
  const MOVES = {
    orbit: { dur: 4.4, f: p => ({ ry: wave(p) * 36, rz: -wave(p) * 5, z: bell(p) * 50 }) },
    spin: { dur: 2.6, f: p => ({ ry: ease(p) * 360, z: bell(p) * 100 }) },
    flip: { dur: 2.8, f: p => ({ rx: ease(p) * 360, z: bell(p) * 70 }) },
    roll: { dur: 2.8, f: p => ({ rz: ease(p) * 360, z: bell(p) * 60 }) },
    nod: { dur: 2.6, f: p => ({ rx: wave(p) * 24, z: bell(p) * 30 }) },
    tilt: { dur: 3.2, f: p => ({ rz: bell(p) * 15, ry: bell(p) * 24 }) },
    approach: { dur: 3.6, f: p => ({ z: bell(p) * 230, ry: wave(p) * 10 }) },
    retreat: { dur: 3.6, f: p => ({ z: -bell(p) * 180, rx: -bell(p) * 8 }) }
  };
  const IDLE = ['orbit', 'orbit', 'tilt', 'nod', 'approach', 'retreat', 'tilt', 'orbit', 'nod'];   // spin/flip/roll chỉ chạy khi bấm nút
  const amp = () => { const s = document.body.dataset.screen; return (s === 'card' || s === 'end' || s === 'surprise') ? .4 : 1; };
  const gazeOf = (dx, dy) => [Math.tanh(dx / 220), Math.tanh(dy / 180)];
  function begin(name, t) { move = { name, t0: t, dur: MOVES[name].dur, dir: Math.random() < .5 ? -1 : 1 }; }
  /* Hướng nhìn của từng mắt, chuẩn hoá -1..1: ưu tiên biểu cảm > chữ đang gõ/phần tử được focus > con trỏ > tự đảo mắt */
  function targets(t, calm) {
    if (gz) { if (gz.circle) { const a = t * 5, x = Math.cos(a) * .8, y = Math.sin(a) * .8; return [x, y, x, y]; } return [gz.x, gz.y, gz.x, gz.y]; }
    if (look && look.until > t) return [look.x, look.y, look.x, look.y];
    if (rect && t - lastMove < 6) { const d = esL * sc * .81, cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2; return [...gazeOf(px - (cx - d), py - cy), ...gazeOf(px - (cx + d), py - cy)]; }
    if (calm) return [0, 0, 0, 0];
    if (t > wander.next) { wander.x = rand(-.8, .8); wander.y = rand(-.45, .45); wander.next = t + rand(1.2, 3); }
    return [wander.x, wander.y, wander.x, wander.y];
  }
  function tick(now) {
    raf = requestAnimationFrame(tick); const t = now / 1000, dt = Math.min(.05, t - last) || .016; last = t; const calm = reduce();
    if (frame++ % 8 === 0 || !rect) { rect = wrap.getBoundingClientRect(); sc = rect.width / (wrap.offsetWidth || 1); esL = e1.offsetWidth; es = esL * sc; }
    const a = amp(), dragOn = drag && drag.moving, g = targets(t, calm), gax = (g[0] + g[2]) / 2, gay = (g[1] + g[3]) / 2;
    S3.g1x.t = g[0]; S3.g1y.t = g[1]; S3.g2x.t = g[2]; S3.g2y.t = g[3];
    S3.ry.t = -gax * 14 * a; S3.rx.t = -gay * 10 * a; S3.rz.t = gax * 3; S3.tx.t = gax * 8; S3.ty.t = gay * 6; S3.z.t = 0; S3.dx.t = 0; S3.dy.t = 0;
    for (const k in S3) { if (dragOn && (k === 'dx' || k === 'dy')) continue; const s = S3[k]; s.v += (s.k * (s.t - s.x) - s.c * s.v) * dt; s.x += s.v * dt; }
    let m = {}; const sw = calm ? 0 : 1;
    if (move) { const p = (t - move.t0) / move.dur; if (p >= 1) { move = null; nextAt = t + rand(3.5, 6.5); } else { m = MOVES[move.name].f(p); if (move.dir < 0) { if (m.rz && move.name !== 'spin') m.rz = -m.rz; if (m.ry && move.name !== 'orbit') m.ry = -m.ry; } } }
    else if (!calm && t >= nextAt && !dragOn) begin(IDLE[Math.floor(Math.random() * IDLE.length)], t);
    const ry = S3.ry.x + S3.dx.x + Math.sin(t * .7) * 6 * a * sw + (m.ry || 0), rx = S3.rx.x + S3.dy.x + Math.sin(t * .9 + 1) * 4 * a * sw + (m.rx || 0),
      rz = S3.rz.x + Math.sin(t * .5) * 2.5 * sw + (m.rz || 0), tx = S3.tx.x, ty = S3.ty.x + Math.sin(t * 1.1) * 4 * sw, z = S3.z.x + (m.z || 0) * (a < 1 ? .35 : 1);
    inn.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
    // mỗi mắt tự trượt về hướng nhìn của nó (đồng tử chạy trong hốc mắt), cộng độ sâu riêng
    const b1 = Math.sin(t * .8) * 7 * sw, b2 = Math.sin(t * .8 + 2.2) * 7 * sw;
    e1.style.transform = `translate3d(${(S3.g1x.x * .3 * esL).toFixed(1)}px,${(S3.g1y.x * .2 * esL).toFixed(1)}px,${b1.toFixed(1)}px) rotateY(${(Math.sin(t * .6) * 5 * sw).toFixed(1)}deg)`;
    e2.style.transform = `translate3d(${(S3.g2x.x * .3 * esL).toFixed(1)}px,${(S3.g2y.x * .2 * esL).toFixed(1)}px,${b2.toFixed(1)}px) rotateY(${(Math.sin(t * .6 + 1.4) * -5 * sw).toFixed(1)}deg)`;
    wrap.style.setProperty('--hx', (Math.sin(ry * D) * 7).toFixed(1) + 'px'); wrap.style.setProperty('--hy', (-Math.sin(rx * D) * 5).toFixed(1) + 'px');
    wrap.style.setProperty('--bloom', clamp(.85 + z / 520, .55, 1).toFixed(2));
    FX.setAura({ on: !calm, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, es, s: 1, rx, ry, z, a: clamp(rect.width / 160, .4, 1) });
  }
  function pointer(x, y) { px = x; py = y; lastMove = nowS(); }
  function endDrag() {
    if (drag && drag.moving) {
      S3.dx.x = norm(S3.dx.x); S3.dy.x = norm(S3.dy.x); S3.dx.v = clamp(drag.vx * .55, -1200, 1200); S3.dy.v = clamp(-drag.vy * .45, -1000, 1000);
      if (Math.abs(drag.vx) + Math.abs(drag.vy) > 1400 && ['intro', 'showcase'].includes(document.body.dataset.screen)) E.mood('dizzy', 1800);
    }
    drag = null;
  }
  return {
    start() {
      e1 = $('.e1', inn); e2 = $('.e2', inn);
      addEventListener('pointermove', e => {
        pointer(e.clientX, e.clientY);
        if (drag && !reduce()) { const now = performance.now(), dtm = Math.max(8, now - drag.lt) / 1000, dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
          if (!drag.moving && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) drag.moving = true;
          if (drag.moving) { S3.dx.x += dx * .55; S3.dx.v = 0; S3.dy.x += -dy * .45; S3.dy.v = 0; drag.vx = dx / dtm; drag.vy = dy / dtm; }
          drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now; }
      }, { passive: true });
      addEventListener('pointerdown', e => {
        pointer(e.clientX, e.clientY);
        if (reduce() || e.target.closest('button,input,textarea,a,label,.modal')) return;
        drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), moving: false, vx: 0, vy: 0 }; S3.z.v += 520;
      }, { passive: true });
      addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
      raf = requestAnimationFrame(tick);
    },
    play(name) { if (reduce()) { toast('Chuyển động đang tắt theo cài đặt giảm chuyển động của thiết bị'); return; } if (MOVES[name]) begin(name, nowS()); },
    gaze(o) { gz = o; },
    lookAt(x, y, ms = 1200) { if (!rect) return; const g = gazeOf(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2)); look = { x: g[0], y: g[1], until: nowS() + ms / 1000 }; },
    reading(el, frac) { const r = el.getBoundingClientRect(); this.lookAt(r.left + r.width * frac, r.top + r.height * .5, 800); },
    eyeRect() { return rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, r: es * 1.7 }; }
  };
})();

/* ---------- Phản ứng theo ngữ cảnh (chỉ ở màn mở đầu và showcase) ---------- */
const Behavior = (() => {
  let lastAct = performance.now(), stage = 0, pokes = [], gone = false;
  const active = () => ['intro', 'showcase'].includes(document.body.dataset.screen);
  function act() {
    lastAct = performance.now();
    if (stage) { stage = 0; const asleep = $('#eyes').classList.contains('sleep') || E.current === 'sleepy'; if (asleep && active()) { E.set({}); E.mood('surprised', 700); } }
  }
  return { start() {
    addEventListener('pointermove', act, { passive: true });
    addEventListener('pointerdown', e => {
      act(); if (!active() || E.current === 'angry' || e.target.closest('button,input,textarea,a,label,.modal')) return;
      const r = Rig.eyeRect(), near = r && Math.hypot(e.clientX - r.x, e.clientY - r.y) < r.r, now = performance.now();
      if (near) { pokes = pokes.filter(t => now - t < 3000); pokes.push(now); if (pokes.length >= 4) { pokes = []; E.mood('angry', 1600); } else E.mood('laugh', 900); }
      else E.mood('surprised', 450);
    }, { passive: true });
    document.addEventListener('mouseleave', () => { gone = true; setTimeout(() => { if (gone && active()) E.mood('sad'); }, 1200); });
    document.addEventListener('mouseenter', () => { if (gone) { gone = false; if (active()) E.mood('happy', 1200); } });
    setInterval(() => {
      if (!active()) return; const idle = (performance.now() - lastAct) / 1000;
      if (idle > 16 && stage < 2) { stage = 2; E.set({ sleep: true }); } else if (idle > 9 && stage < 1) { stage = 1; E.mood('sleepy'); }
    }, 500);
  } };
})();

/* ---------- Lời lãng mạn trôi mờ (câu tự viết, không dùng lời bài hát có sẵn) ---------- */
const Lyrics = (() => {
  const box = $('#lyrics'), L = [`giữa trời đêm đầy sao, ${YOU} vẫn là điều sáng nhất`, 'gió mang lời chúc bay qua những ngày dài', 'có những nụ cười đẹp hơn cả ánh trăng',
    `mong ${YOU} luôn được yêu thương thật dịu dàng`, `mỗi vì sao là một điều ước dành riêng cho ${YOU}`, `hoa nở vì ${YOU}, nên đừng quên mỉm cười`,
    `20/10 rồi, ${ME} gửi ${YOU} cả bầu trời sao`, `ở đâu có ${YOU}, ở đó có ánh sáng`, 'nhẹ nhàng thôi, như cánh hoa rơi trên vai', `điều ước nào cũng sẽ tìm đường về với ${YOU}`];
  let live = 0, idx = Math.floor(Math.random() * L.length);
  function spawn() {
    if (document.hidden || live >= (innerWidth < 560 ? 3 : 5)) return;
    const d = rand(.45, 1), el = document.createElement('p'); el.className = 'lyric'; el.textContent = L[idx++ % L.length];
    el.style.cssText = `left:${rand(4, 58).toFixed(0)}%;top:${rand(52, 92).toFixed(0)}%;font-size:${(12 + d * 6).toFixed(1)}px;filter:blur(${((1 - d) * 1.8).toFixed(1)}px);max-width:${innerWidth < 560 ? 72 : 42}vw`;
    box.appendChild(el); live++; const peak = .16 + d * .26;
    const an = el.animate([{ transform: 'translate3d(0,0,0)', opacity: 0 }, { opacity: peak, offset: .22 }, { opacity: peak, offset: .72 }, { transform: `translate3d(${rand(-30, 30).toFixed(0)}px,${(-rand(120, 260) * d).toFixed(0)}px,0)`, opacity: 0 }],
      { duration: rand(13000, 19000) / (.6 + d * .6), easing: 'ease-in-out' });
    an.onfinish = () => { el.remove(); live--; };
  }
  return { start() {
    if (reduce()) { [[8, 60], [30, 76], [12, 88]].forEach((p, i) => { const el = document.createElement('p'); el.className = 'lyric still'; el.textContent = L[i * 3]; el.style.cssText = `left:${p[0]}%;top:${p[1]}%;font-size:14px;max-width:70vw`; box.appendChild(el); }); return; }
    spawn(); setInterval(spawn, 2600);
  } };
})();

/* ---------- Bokeh mờ phía sau (nền kiểu anime) ---------- */
function buildBokeh() {
  const box = $('#bokeh'), r = rng(21), cols = ['rgba(90,225,255,', 'rgba(255,150,200,', 'rgba(190,160,255,'];
  for (let i = 0; i < 9; i++) { const s = 40 + r() * 110, b = document.createElement('i'); b.className = 'bk';
    b.style.cssText = `left:${(r() * 100).toFixed(0)}%;top:${(r() * 100).toFixed(0)}%;width:${s.toFixed(0)}px;height:${s.toFixed(0)}px;background:${cols[i % 3]}${(.07 + r() * .09).toFixed(2)});--t:${(18 + r() * 16).toFixed(0)}s;animation-delay:${(-r() * 20).toFixed(0)}s`;
    box.appendChild(b); }
}

let typing = null;
function cancelType() { if (typing) { const t = typing; typing = null; t.finish(); } }
function typeInto(el, text, speed = 52) {
  return new Promise(resolve => {
    cancelType(); el.textContent = '';
    if (reduce() || !text) { el.textContent = text; resolve(); return; }
    const chars = Array.from(text); let i = 0, timer = 0;
    el.classList.add('typing');
    const done = () => { clearTimeout(timer); el.textContent = text; el.classList.remove('typing'); if (typing && typing.el === el) typing = null; resolve(); };
    typing = { el, finish: done };
    (function tick() {
      i++; el.textContent = chars.slice(0, i).join(''); Rig.reading(el, i / chars.length);
      if (i >= chars.length) { done(); return; }
      const ch = chars[i - 1];
      timer = setTimeout(tick, speed * (ch === ' ' ? 1.1 : /[.,!…?]/.test(ch) ? 5 : 1) * rand(.75, 1.25));
    })();
  });
}

const SCREENS = ['intro', 'story', 'card', 'surprise', 'end'].reduce((o, k) => (o[k] = $('#' + k), o), {});
let runId = 0;            // mỗi luồng tự động có một id; đổi id = huỷ luồng cũ
const CANCEL = Symbol('cancel');

function go(name) {
  cancelType();
  Object.entries(SCREENS).forEach(([k, el]) => { const on = k === name; el.classList.toggle('active', on); el.inert = !on; });
  document.body.dataset.screen = name;
}
function setScene(id) {
  document.body.dataset.scene = id;
  $$('.deco').forEach(el => el.classList.toggle('on', el.dataset.deco === id));
  FX.setMode(id);
}

/* ---------- 6. Kịch bản ---------- */
const signText = () => S.from ? `— ${S.from}` : '';
let nudge = null;
function wait(ms) {
  return new Promise(res => {
    let t = 0; const fin = () => { clearTimeout(t); if (nudge === fin) nudge = null; res(); };
    nudge = fin; t = setTimeout(fin, ms);
  });
}

/* 6.1 Mở món quà */
let opening = false;
async function openGift() {
  if (opening) return; opening = true; const id = ++runId;
  const env = $('#envBtn'), rc = env.getBoundingClientRect(); env.classList.add('open'); SCREENS.intro.classList.add('leaving'); E.set({}); E.mood('star', 1800);
  await sleep(750); if (id !== runId) return;
  FX.burst(rc.left + rc.width / 2, rc.top + rc.height / 2, 30, 10);
  await sleep(1250); if (id !== runId) return;
  opening = false; go('story'); runStory();
}

/* 6.2 Câu chuyện (tái tạo thứ tự cảnh của video tham khảo) */
async function runStory() {
  const id = ++runId, top = $('#capTop'), bot = $('#capBot'), ST = CONFIG.story;
  const guard = () => { if (id !== runId) throw CANCEL; };
  const W = async ms => { await wait(ms); guard(); };
  const T = async (el, text, cls = '') => { el.className = `cap ${el === top ? 'cap-top' : 'cap-bot'} ${cls}`; await typeInto(el, text); guard(); };
  const clear = async el => { el.classList.add('fade'); await sleep(450); guard(); el.textContent = ''; el.className = `cap ${el === top ? 'cap-top' : 'cap-bot'}`; };
  try {
    // Cảnh 1: nền đen/tím mận, cánh hoa rơi, đôi mắt thẹn
    setScene('s1'); E.set({}); await W(900);
    await T(top, ST.intro); await W(1500);
    E.blink(260); await clear(top); E.set({ blush: true });
    await T(bot, ST.s1); await W(2400); await clear(bot); E.set({});
    // Cảnh 2: cỏ mọc, hoa nở, thiếu nữ áo dài, lá rơi, sao băng
    setScene('s2'); await W(1000); E.mood('surprised', 1100);
    await T(top, ST.s2, 'pink'); await W(4600); E.blink(); await clear(top);
    // Cảnh 3: bầu trời đêm xanh, chòm sao, mắt cười cong
    setScene('s3'); E.set({ happy: true }); await W(1100);
    await T(top, ST.s3); await W(3200); await clear(top);
    // Cảnh 4: trái tim + nhịp tim
    setScene('s4'); E.set({}); await W(900); E.mood('love');
    await T(top, ST.s4); await W(3600); await clear(top);
    // Cảnh 5: hoa line-art, bướm, đường chân trời
    setScene('s5'); E.set({ wink: true }); await W(900); E.set({}); E.mood('star', 2200);
    await T(top, ST.s5); await W(3500); await clear(top);
    // Cảnh 6: đĩa than, hoa hồng, các dòng phụ nhỏ phía dưới
    setScene('s6'); E.set({ blush: true }); await W(900);
    await T(top, ST.s6);
    for (const line of ST.s6sub) { await T(bot, line, 'small'); await W(1900); await clear(bot); }
    await W(900);
    await showCard();
  } catch (e) { if (e !== CANCEL) throw e; }
}
function skipStory() { runId++; nudge && nudge(); cancelType(); showCard(); }

/* 6.3 Lời chúc */
async function showCard() {
  const id = ++runId, guard = () => { if (id !== runId) throw CANCEL; };
  try {
    go('card'); setScene('dawn'); E.set({ happy: true });
    $('#cardTo').textContent = `Gửi ${S.to} ♡`; $('#cardWish').textContent = '';
    $('#cardSign').classList.remove('show'); $('#surpriseBtn').classList.remove('show');
    await sleep(1300); guard();
    await typeInto($('#cardWish'), S.msg, Math.max(8, Math.min(38, 7000 / S.msg.length))); guard();
    $('#cardSign').textContent = signText(); $('#cardSign').classList.add('show');
    await sleep(500); guard(); $('#surpriseBtn').classList.add('show');
  } catch (e) { if (e !== CANCEL) throw e; }
}

/* 6.4 Bất ngờ: bó hoa nở + pháo giấy + tim bay (nhấn lại để xem tiếp) */
function bloomBouquet() {
  const bq = $('#bq'); if (!bq) return;
  bq.classList.remove('on', 'idle'); void bq.getBoundingClientRect(); bq.classList.add('on');
}
async function showSurprise() {
  const id = ++runId, guard = () => { if (id !== runId) throw CANCEL; };
  try {
    go('surprise'); setScene('dawn'); E.set({ happy: true });
    const title = $('#surTitle'), row = $('#surprise .row');
    title.classList.remove('show'); row.classList.remove('show'); title.textContent = `Một bó hoa dành riêng cho ${S.to} ✿`;
    buildBouquet(); await sleep(700); guard();
    title.classList.add('show'); bloomBouquet();
    await sleep(1700); guard();
    FX.setMode('surprise'); FX.confetti(); E.set({ happy: true, blush: true });
    await sleep(1600); guard(); row.classList.add('show'); $('#bq').classList.add('idle');
  } catch (e) { if (e !== CANCEL) throw e; }
}
function replaySurprise() {
  if (document.body.dataset.screen !== 'surprise') return;
  bloomBouquet(); FX.confetti(); FX.burst(innerWidth / 2, innerHeight * .55, 14, 8);
  setTimeout(() => { const bq = $('#bq'); bq && bq.classList.add('idle'); }, 2600);
}

/* 6.5 Kết thúc */
async function showEnd() {
  const id = ++runId, guard = () => { if (id !== runId) throw CANCEL; };
  try {
    go('end'); setScene('dawn'); E.set({ happy: true });
    $('#endWish').textContent = ''; $('#endSign').classList.remove('show'); $('#end .row').classList.remove('show');
    await sleep(1000); guard();
    await typeInto($('#endWish'), S.fin, Math.max(8, Math.min(40, 5000 / S.fin.length))); guard();
    $('#endSign').textContent = signText(); $('#endSign').classList.add('show');
    await sleep(400); guard(); $('#end .row').classList.add('show');
    FX.burst(innerWidth / 2, innerHeight * .9, 10, 6);
  } catch (e) { if (e !== CANCEL) throw e; }
}

/* 6.6 Phát lại về màn hình mở đầu */
function resetToIntro() {
  runId++; opening = false; nudge && nudge(); cancelType();
  const env = $('#envBtn'); env.classList.remove('open'); SCREENS.intro.classList.remove('leaving');
  $('#capTop').textContent = ''; $('#capBot').textContent = '';
  go('intro'); setScene('s0'); E.set({ sleep: true });
  setTimeout(() => { if (document.body.dataset.screen === 'intro') { E.set({}); E.blink(); } }, 700);
}

/* ---------- 7. Khởi động ---------- */
function init() {
  document.body.dataset.screen = 'intro'; document.body.dataset.scene = 's0';
  buildEyes(); buildBokeh(); buildDecor(); FX.init(); applyTheme(); Snd.start(); E.loop(); Rig.start(); Lyrics.start();
  setScene('s0'); go('intro');
  setTimeout(() => { if (['intro', 'showcase'].includes(document.body.dataset.screen)) { E.set({}); E.blink(); } }, 800);

  $('#envBtn').addEventListener('click', openGift);
  $('#openBtn').addEventListener('click', openGift);
  $('#skipBtn').addEventListener('click', e => { e.stopPropagation(); skipStory(); });
  SCREENS.story.addEventListener('click', () => { if (typing) cancelType(); else nudge && nudge(); });
  $('.card', SCREENS.card).addEventListener('click', () => { if (typing) cancelType(); });
  $('#surpriseBtn').addEventListener('click', showSurprise);
  $('#bouquet').addEventListener('click', replaySurprise);
  $('#againBtn').addEventListener('click', replaySurprise);
  $('#toEndBtn').addEventListener('click', showEnd);
  $('#replayBtn').addEventListener('click', resetToIntro);

  // Phản hồi khi chạm (đôi mắt 3D tự xử lý theo dõi con trỏ, kéo để xoay và nảy)
  document.addEventListener('pointerdown', e => { FX.tap(e.clientX, e.clientY); E.blink(140); }, { passive: true });

  // Biểu cảm theo ngữ cảnh
  Behavior.start();
  ['#openBtn', '#envBtn'].forEach(s => { const el = $(s); el.addEventListener('pointerenter', () => { if (document.body.dataset.screen === 'intro') E.mood('curious'); }); el.addEventListener('pointerleave', () => { if (document.body.dataset.screen === 'intro') E.mood('neutral'); }); });
  document.addEventListener('focusin', e => { const r = e.target.getBoundingClientRect(); Rig.lookAt(r.left + r.width / 2, r.top + r.height / 2, 1500); });
}
init();
