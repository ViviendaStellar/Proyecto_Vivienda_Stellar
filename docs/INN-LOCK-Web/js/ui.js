/* INN-LOCK · Utilidades de interfaz: íconos, formato, logo, ilustraciones, gráficas, modales */
(function () {
  'use strict';
  const D = window.INNLOCK;

  /* ---------- íconos (Lucide, locales) ---------- */
  const icon = (name, cls) => `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${(window.ICONS || {})[name] || ''}</svg>`;

  /* ---------- formato ---------- */
  const fmtN = (n, d) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d || 0 });
  const money = (n) => '$ ' + fmtN(n);
  const moneyM = (n) => n >= 1e9 ? '$ ' + fmtN(n / 1e6) + ' M' : n >= 1e6 ? '$ ' + fmtN(n / 1e6, n % 1e6 ? 1 : 0) + ' M' : money(n);
  const pct = (n, d) => fmtN(n, d == null ? 1 : d) + '%';
  const parseD = (s) => (s instanceof Date ? s : new Date(String(s).length <= 10 ? s + 'T12:00:00' : s));
  const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], ML = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fmtDate = (s, long) => { const d = parseD(s); return long ? d.getDate() + ' de ' + ML[d.getMonth()] + ' de ' + d.getFullYear() : d.getDate() + ' ' + MS[d.getMonth()] + ' ' + d.getFullYear(); };
  const fmtMY = (s) => { const d = parseD(s); return MS[d.getMonth()] + ' ' + d.getFullYear(); };
  const fmtDT = (s) => parseD(s).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(/\./g, '');
  const daysTo = (s) => Math.round((parseD(s) - D.DEMO_TODAY) / 864e5);
  const short = (h, a, b) => h.slice(0, a || 8) + '…' + h.slice(-(b || 8));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* ---------- logo (vectorial, fiel al logo de marca) ---------- */
  let gid = 0;
  function logoMark() {
    const i = ++gid;
    return `<svg viewBox="0 0 100 93" role="img" aria-label="INN-LOCK"><defs>
      <linearGradient id="lo${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17B2F7"/><stop offset="1" stop-color="#0B4FD6"/></linearGradient>
      <linearGradient id="li${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A57C9"/><stop offset="1" stop-color="#0A2A78"/></linearGradient>
      <linearGradient id="lr${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD84D"/><stop offset="1" stop-color="#FF9A00"/></linearGradient>
      <linearGradient id="lw${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E4EAF6"/></linearGradient></defs>
      <rect x="0" y="0" width="100" height="93" rx="26" fill="url(#lo${i})"/><rect x="4" y="4" width="92" height="85" rx="22" fill="url(#li${i})"/>
      <path d="M21 46 L50 25 L79 46 V51 L50 30 L21 51Z" fill="#0A2A78" opacity=".55" transform="translate(0,3)"/>
      <path d="M19 38.5 L50 15.5 L81 38.5" fill="none" stroke="url(#lr${i})" stroke-width="6.6" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="26" y="40" width="13" height="40" rx="1.6" fill="url(#lw${i})"/>
      <path d="M46 40 H58.4 a1.6 1.6 0 0 1 1.6 1.6 V67 H76 a1.6 1.6 0 0 1 1.6 1.6 V78.4 a1.6 1.6 0 0 1 -1.6 1.6 H47.6 a1.6 1.6 0 0 1 -1.6 -1.6Z" fill="url(#lw${i})"/></svg>`;
  }
  const brand = (cls) => `<div class="brand ${cls || ''}">${logoMark()}<div class="wm">INN<span style="opacity:.5">-</span><b>LOCK</b><small>Construimos confianza</small></div></div>`;

  /* ---------- avance real de un proyecto ---------- */
  function progressOf(p) {
    let last = 0;
    p.monthsData.forEach((m) => { if (m.actualCum != null && (m.status === 'desembolsado' || m.status === 'revision')) last = m.actualCum; });
    return last;
  }
  function plannedNow(p) { if (p.currentMonth <= 1) return 0; const m = p.monthsData[p.currentMonth - 2]; return m ? m.plannedCum : 0; }
  function releasedPct(p) { return p.monthsData.filter((m) => m.status === 'desembolsado').reduce((s, m) => s + m.tranchePct, 0); }

  /* ---------- ilustración arquitectónica procedural ---------- */
  function art(p, progress, opts) {
    opts = opts || {};
    if (p.photo) return `<svg class="art ${opts.cls || ''}" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Foto de ${esc(p.name)}"><rect width="800" height="500" fill="#0B2A6F"/><image href="${p.photo}" width="800" height="500" preserveAspectRatio="xMidYMid slice"/></svg>`;
    const r = rng(p.seed * 31 + 7), sc = p.scene, n = sc.towers;
    const prog = Math.max(0.06, Math.min(1, (progress == null ? progressOf(p) : progress) / 100));
    const skies = [['#1B3A8C', '#6D5BC9', '#FFB26B'], ['#4A9BF0', '#9BCBFA', '#EAF4FF'], ['#0F6E9E', '#3DB5C9', '#FFD58A']];
    const [s1, s2, s3] = skies[sc.sky], uid = 'a' + (++gid);
    let o = `<svg class="art ${opts.cls || ''}" viewBox="0 0 800 500" preserveAspectRatio="${opts.hero ? 'xMidYMax' : 'xMidYMid'} slice" role="img" aria-label="Render de ${esc(p.name)}"><defs>
      <linearGradient id="${uid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset=".6" stop-color="${s2}"/><stop offset="1" stop-color="${s3}"/></linearGradient>
      <linearGradient id="${uid}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F7F9FF"/><stop offset=".7" stop-color="#DCE5F7"/><stop offset="1" stop-color="#B9C8E6"/></linearGradient>
      <linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DB8F0"/><stop offset="1" stop-color="#2C5BA8"/></linearGradient>
      <linearGradient id="${uid}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B2A6F" stop-opacity=".0"/><stop offset="1" stop-color="#0B2A6F" stop-opacity=".45"/></linearGradient>
      <radialGradient id="${uid}u" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF3C4" stop-opacity=".95"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient></defs>
      <rect width="800" height="500" fill="url(#${uid}s)"/>
      <circle cx="${sc.sky === 1 ? 640 : 560}" cy="${sc.sky === 1 ? 110 : 250}" r="190" fill="url(#${uid}u)"/><circle cx="${sc.sky === 1 ? 640 : 560}" cy="${sc.sky === 1 ? 110 : 250}" r="34" fill="#FFF6D6" opacity=".9"/>`;
    // nubes
    for (let i = 0; i < 4; i++) { const x = r() * 760, y = 40 + r() * 130, w = 90 + r() * 120; o += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${10 + r() * 8}" fill="#fff" opacity="${0.12 + r() * 0.12}"/>`; }
    // skyline lejano
    let x = -10; const horizon = 430;
    while (x < 810) { const w = 26 + r() * 46, h = 60 + r() * 150; o += `<rect x="${x}" y="${horizon - h}" width="${w}" height="${h}" fill="#0B2A6F" opacity="${(0.16 + r() * 0.1).toFixed(2)}"/>`; x += w + 3 + r() * 6; }
    x = -10; while (x < 810) { const w = 34 + r() * 50, h = 40 + r() * 90; o += `<rect x="${x}" y="${horizon - h}" width="${w}" height="${h}" fill="#0B2A6F" opacity="0.28"/>`; x += w + 6 + r() * 12; }
    // suelo / mar
    if (sc.sky === 2) { o += `<rect y="${horizon}" width="800" height="70" fill="#0E6E96"/>`; for (let i = 0; i < 14; i++) o += `<rect x="${r() * 780}" y="${horizon + 6 + r() * 58}" width="${30 + r() * 70}" height="2" rx="1" fill="#fff" opacity=".3"/>`; }
    else o += `<rect y="${horizon}" width="800" height="70" fill="#1B2E5C"/><rect y="${horizon}" width="800" height="6" fill="#2A4585"/>`;
    // torres
    const w = n === 1 ? 230 : n === 2 ? 190 : 150, gap = n === 1 ? 0 : 38, totalW = n * w + (n - 1) * gap, x0 = (800 - totalW) / 2 + (n === 1 ? 40 : 0) + (opts.shift || 0);
    let craneAt = null;
    for (let k = 0; k < n; k++) {
      const F = Math.max(8, sc.floors - k * 2 + (k === 1 ? 2 : 0)), H = 300 - k * 18, fh = H / F, tx = x0 + k * (w + gap), built = Math.max(1, Math.round(F * prog));
      const topBuilt = horizon - built * fh, topAll = horizon - F * fh;
      // estructura sin construir (andamio)
      o += `<g opacity=".95" stroke="#fff" stroke-opacity=".8" fill="none" stroke-width="1.8"><rect x="${tx}" y="${topAll}" width="${w}" height="${topBuilt - topAll}" stroke-dasharray="6 5" stroke-opacity=".85"/>`;
      for (let c = 1; c < 4; c++) o += `<line x1="${tx + (w * c) / 4}" y1="${topAll}" x2="${tx + (w * c) / 4}" y2="${topBuilt}" stroke-opacity=".6"/>`;
      for (let i = built; i < F; i++) o += `<line x1="${tx}" y1="${horizon - i * fh}" x2="${tx + w}" y2="${horizon - i * fh}" stroke-opacity=".55"/>`;
      o += `</g>`;
      // cuerpo construido
      o += `<rect x="${tx}" y="${topBuilt}" width="${w}" height="${horizon - topBuilt}" fill="url(#${uid}b)"/>`;
      const cols = n === 3 ? 4 : 5, ww = (w - 28) / cols;
      for (let i = 0; i < built; i++) {
        const fy = horizon - (i + 1) * fh, fresh = i >= built - 2 && prog < 0.97;
        if (fresh) { o += `<rect x="${tx}" y="${fy}" width="${w}" height="${fh}" fill="#B3BFD8" opacity=".55"/>`; for (let c = 0; c <= cols; c++) o += `<rect x="${tx + 6 + c * ((w - 12) / cols) - 2}" y="${fy}" width="4" height="${fh}" fill="#7F8EB0" opacity=".8"/>`; }
        else for (let c = 0; c < cols; c++) { const lit = r() < 0.28; o += `<rect x="${(tx + 14 + c * ww + ww * 0.12).toFixed(1)}" y="${(fy + fh * 0.2).toFixed(1)}" width="${(ww * 0.76).toFixed(1)}" height="${(fh * 0.58).toFixed(1)}" rx="1.5" fill="${lit ? '#FFE7A0' : 'url(#' + uid + 'g)'}" ${lit ? '' : 'opacity=".92"'}/>`; }
        o += `<rect x="${tx - 3}" y="${fy + fh - 2}" width="${w + 6}" height="3" fill="#8DA0C8" opacity=".85"/>`;
      }
      o += `<rect x="${tx}" y="${topBuilt}" width="${w}" height="${horizon - topBuilt}" fill="url(#${uid}f)" opacity=".55"/><rect x="${tx + w - 7}" y="${topBuilt}" width="7" height="${horizon - topBuilt}" fill="#0B2A6F" opacity=".14"/>`;
      if (prog > 0.97) o += `<rect x="${tx - 4}" y="${topBuilt - 8}" width="${w + 8}" height="9" rx="2" fill="#0B2A6F"/><rect x="${tx + w / 2 - 10}" y="${topBuilt - 30}" width="20" height="22" fill="#0B2A6F"/>`;
      if (!craneAt || topBuilt < craneAt.y) craneAt = { x: tx + w * 0.55, y: topAll, top: topBuilt };
    }
    // grúa
    if (prog < 0.97 && craneAt) {
      const cx = craneAt.x, cy = Math.max(30, craneAt.y - 36);
      o += `<g stroke="#FFB300" stroke-width="3" fill="none" stroke-linecap="round"><line x1="${cx}" y1="${horizon}" x2="${cx}" y2="${cy}"/><line x1="${cx - 8}" y1="${horizon}" x2="${cx - 8}" y2="${cy + 6}" stroke-width="1.4"/><line x1="${cx + 8}" y1="${horizon}" x2="${cx + 8}" y2="${cy + 6}" stroke-width="1.4"/>`;
      for (let y = cy + 14; y < horizon; y += 22) o += `<path d="M${cx - 8} ${y} L${cx + 8} ${y + 11} M${cx + 8} ${y} L${cx - 8} ${y + 11}" stroke-width="1.1"/>`;
      o += `</g><g class="crane-g" style="transform-box:fill-box;transform-origin:${opts.static ? '50% 50%' : '50% 100%'}${opts.static ? '' : ';animation:crane 7s ease-in-out infinite'}"><g stroke="#FFB300" stroke-width="3.2" stroke-linecap="round"><line x1="${cx - 120}" y1="${cy}" x2="${cx + 54}" y2="${cy}"/><line x1="${cx}" y1="${cy - 22}" x2="${cx - 120}" y2="${cy}" stroke-width="1.3"/><line x1="${cx}" y1="${cy - 22}" x2="${cx + 54}" y2="${cy}" stroke-width="1.3"/></g><rect x="${cx + 28}" y="${cy}" width="24" height="14" fill="#3C4C70"/><line x1="${cx - 100}" y1="${cy}" x2="${cx - 100}" y2="${cy + 46}" stroke="#fff" stroke-width="1.3" opacity=".8"/><rect x="${cx - 112}" y="${cy + 46}" width="24" height="10" rx="2" fill="#FF9A00"/></g>`;
    }
    // árboles y detalles
    for (let i = 0; i < 9; i++) { const tx = 20 + r() * 760; o += `<rect x="${tx - 1.5}" y="${horizon - 14}" width="3" height="16" fill="#3C2A1A"/><circle cx="${tx}" cy="${horizon - 22}" r="${10 + r() * 7}" fill="${sc.sky === 2 ? '#1AA37A' : '#2C9A6B'}" opacity=".9"/>`; }
    o += `<rect y="${horizon + 8}" width="800" height="3" fill="#FFB300" opacity=".5"/></svg>`;
    return o;
  }

  /* ---------- mapa estilizado ---------- */
  function mapSvg(p) {
    const r = rng(p.seed * 13);
    let o = `<svg viewBox="0 0 800 340" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ubicación de ${esc(p.name)}"><rect width="800" height="340" fill="var(--surface-2)"/>`;
    for (let i = 0; i < 26; i++) { const x = r() * 760, y = r() * 300, w = 40 + r() * 90, h = 24 + r() * 60; o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--surface-3)"/>`; }
    o += `<ellipse cx="${120 + r() * 100}" cy="${220 + r() * 60}" rx="90" ry="46" fill="#2CB47A" opacity=".22"/><path d="M0 ${230 + r() * 40} C 200 ${180 + r() * 60}, 420 ${270 + r() * 40}, 800 ${200 + r() * 60}" stroke="#12A8F0" stroke-opacity=".35" stroke-width="26" fill="none"/>`;
    const roads = [[0, 120, 800, 150], [0, 250, 800, 220], [180, 0, 230, 340], [520, 0, 480, 340], [660, 0, 700, 340]];
    roads.forEach((rd) => { o += `<line x1="${rd[0]}" y1="${rd[1]}" x2="${rd[2]}" y2="${rd[3]}" stroke="var(--surface)" stroke-width="16" stroke-linecap="round"/><line x1="${rd[0]}" y1="${rd[1]}" x2="${rd[2]}" y2="${rd[3]}" stroke="var(--line-2)" stroke-width="1.5" stroke-dasharray="6 8"/>`; });
    o += `<g transform="translate(400,150)"><circle r="46" fill="#1450C8" opacity=".14"><animate attributeName="r" values="30;62;30" dur="3s" repeatCount="indefinite"/></circle><path d="M0 -34 c-18 0 -30 13 -30 29 c0 22 30 48 30 48 s30 -26 30 -48 c0 -16 -12 -29 -30 -29z" fill="#1450C8" stroke="#fff" stroke-width="4"/><circle cy="-6" r="11" fill="#FFC72C"/></g></svg>`;
    return o;
  }

  /* ---------- gráficas SVG ---------- */
  function sCurve(p) {
    const W = 760, H = 300, L = 44, R = 16, T = 16, B = 40, N = p.monthsData.length, iw = W - L - R, ih = H - T - B;
    const X = (i) => L + (iw * i) / N, Y = (v) => T + ih - (ih * v) / 100;
    const planned = [[0, 0]].concat(p.monthsData.map((m, i) => [i + 1, m.plannedCum]));
    const actual = [[0, 0]].concat(p.monthsData.filter((m) => m.actualCum != null).map((m) => [m.n, m.actualCum]));
    const line = (pts) => pts.map((q, i) => (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join(' ');
    let o = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva S de avance planificado frente al real"><defs><linearGradient id="sc-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12A8F0" stop-opacity=".42"/><stop offset="1" stop-color="#12A8F0" stop-opacity="0"/></linearGradient><linearGradient id="sc-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#12A8F0"/><stop offset="1" stop-color="#1450C8"/></linearGradient></defs>`;
    [0, 25, 50, 75, 100].forEach((v) => { o += `<line class="grid-l" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 10}" y="${Y(v) + 4}" text-anchor="end">${v}%</text>`; });
    const step = N > 24 ? 4 : N > 16 ? 3 : 2;
    for (let i = 0; i <= N; i += step) o += `<text x="${X(i)}" y="${H - 14}" text-anchor="middle">${i === 0 ? 'Inicio' : 'M' + i}</text>`;
    o += `<path d="${line(planned)}" fill="none" stroke="var(--muted)" stroke-width="2.4" stroke-dasharray="6 6" stroke-linecap="round" opacity=".8"/>`;
    const last = actual[actual.length - 1];
    o += `<path d="${line(actual)} L${X(last[0])} ${Y(0)} L${X(0)} ${Y(0)}Z" fill="url(#sc-a)"/><path d="${line(actual)}" fill="none" stroke="url(#sc-l)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1.6s var(--ease) .2s forwards"/>`;
    actual.slice(1).forEach((q) => { const m = p.monthsData[q[0] - 1]; o += `<circle class="pt" cx="${X(q[0])}" cy="${Y(q[1])}" r="4.5" fill="var(--surface)" stroke="#1450C8" stroke-width="2.6"><title>${m.label} · Real ${pct(q[1])} · Plan ${pct(m.plannedCum)}</title></circle>`; });
    const hx = X(p.currentMonth - 0.5);
    o += `<line x1="${hx}" x2="${hx}" y1="${T}" y2="${T + ih}" stroke="#FF9A00" stroke-width="2" stroke-dasharray="3 5"/><g transform="translate(${hx},${T})"><rect x="-26" y="-12" width="52" height="22" rx="11" fill="#FF9A00"/><text x="0" y="3" text-anchor="middle" style="fill:#3B2500;font-weight:800">HOY</text></g></svg>`;
    return o;
  }
  function donut(parts, size, th, center) {
    const R = size / 2 - th / 2, C = 2 * Math.PI * R, tot = parts.reduce((s, q) => s + q.v, 0) || 1; let off = 0;
    let o = `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${R}" fill="none" stroke="var(--surface-3)" stroke-width="${th}"/>`;
    parts.forEach((q) => { const len = (q.v / tot) * C; o += `<circle cx="${size / 2}" cy="${size / 2}" r="${R}" fill="none" stroke="${q.color}" stroke-width="${th}" stroke-dasharray="${Math.max(0, len - 3)} ${C}" stroke-dashoffset="${-off}" stroke-linecap="round"><title>${q.label}</title></circle>`; off += len; });
    return o + `</svg><div class="v">${center || ''}</div></div>`;
  }
  function ring(value, color, size) {
    const s = size || 118, th = 11, R = s / 2 - th / 2, C = 2 * Math.PI * R;
    return `<div class="ring" style="width:${s}px;height:${s}px"><svg viewBox="0 0 ${s} ${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${R}" fill="none" stroke="var(--surface-3)" stroke-width="${th}"/><circle cx="${s / 2}" cy="${s / 2}" r="${R}" fill="none" stroke="${color}" stroke-width="${th}" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - value / 100)}" style="transition:stroke-dashoffset 1.2s var(--ease)"/></svg><div class="v"><div>${Math.round(value)}%<small>cumple</small></div></div></div>`;
  }

  /* ---------- modal, toast, confeti ---------- */
  function modal(o) {
    const back = document.createElement('div'); back.className = 'modal-back'; back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true');
    back.innerHTML = `<div class="modal ${o.wide ? 'wide' : ''}"><div class="modal-h"><h3>${o.title}</h3><button class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button></div><div class="modal-b">${o.body}</div>${o.footer ? `<div class="modal-f">${o.footer}</div>` : ''}</div>`;
    const prev = document.activeElement;
    const close = () => { back.remove(); document.removeEventListener('keydown', esck); document.body.style.overflow = ''; prev && prev.focus && prev.focus(); };
    const esck = (e) => { if (e.key === 'Escape') close(); };
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    back.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    document.addEventListener('keydown', esck); document.body.appendChild(back); document.body.style.overflow = 'hidden';
    const f = back.querySelector('input,textarea,button.btn'); f && f.focus();
    o.onMount && o.onMount(back, close);
    return close;
  }
  function toast(text, type) {
    let box = document.querySelector('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.innerHTML = icon(type === 'err' ? 'alert-triangle' : 'check-circle-2') + '<span>' + text + '</span>';
    box.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3800);
  }
  function confetti() {
    const cols = ['#12A8F0', '#1450C8', '#FFC72C', '#FF9A00', '#34D399'];
    for (let i = 0; i < 46; i++) { const c = document.createElement('i'); c.className = 'confetti'; c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length]; c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's'; c.style.animationDelay = Math.random() * 0.4 + 's'; c.style.transform = 'rotate(' + Math.random() * 360 + 'deg)'; document.body.appendChild(c); setTimeout(() => c.remove(), 3800); }
  }

  const style = document.createElement('style'); style.textContent = '@keyframes draw{to{stroke-dashoffset:0}}'; document.head.appendChild(style);

  window.UI = { icon, fmtMY, fmtN, money, moneyM, pct, fmtDate, fmtDT, daysTo, short, esc, initials, logoMark, brand, art, mapSvg, sCurve, donut, ring, modal, toast, confetti, progressOf, plannedNow, releasedPct, parseD, rng };
})();
