/* INN-LOCK · Aplicación (estado, autenticación de demostración, enrutador y vistas) */
(function () {
  'use strict';
  const D = window.INNLOCK, U = window.UI, I = U.icon;
  const { PROJECTS, CONSTRUCTORAS, INTERVENTORES, USERS, ROLES, PHASES } = D;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ============ Persistencia (solo navegador) ============ */
  const LIVE = !!(window.Live && window.Live.on);
  const KEY = LIVE ? 'innlock.live.v1' : 'innlock.demo.v1';
  const store = {
    get(k, d) { try { const v = (localStorage.getItem(k) ?? sessionStorage.getItem(k)); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v, session) { try { (session ? sessionStorage : localStorage).setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { /* noop */ } }
  };
  const db = store.get(KEY, { months: {}, docs: {}, log: [], read: 0 });
  const state = { user: null, pid: null, theme: store.get('innlock.theme', null) };
  const persist = () => store.set(KEY, db);

  db.evidence = db.evidence || {}; db.changes = db.changes || {};
  if (LIVE) { PROJECTS.length = 0; CONSTRUCTORAS.length = 0; INTERVENTORES.length = 0; USERS.length = 0; D.DEMO_TODAY = new Date(); window.Live.attach({ db }); } else window.Wizard.hydrate(db, PROJECTS);
  // reaplica cambios guardados sobre los datos
  if (!LIVE) Object.entries(db.months).forEach(([k, v]) => { const [pid, n] = k.split(':'); const p = PROJECTS.find((x) => x.id === pid); if (p) Object.assign(p.monthsData[+n - 1], v); });
  if (!LIVE) Object.entries(db.docs).forEach(([k, v]) => { const [cid, key] = k.split(':'); const c = CONSTRUCTORAS.find((x) => x.id === cid); const d = c && c.docs.find((x) => x.key === key); if (d) { Object.assign(d, v); if (!('status' in v)) delete d.status; } });

  /* ============ Dominio ============ */
  const MST = { desembolsado: { l: 'Desembolsado', c: 'b-ok', i: 'check-circle-2' }, revision: { l: 'En revisión', c: 'b-warn', i: 'clock' }, en_curso: { l: 'En ejecución', c: 'b-info', i: 'hammer' }, pendiente: { l: 'Programado', c: 'b-mute', i: 'calendar' }, observado: { l: 'Con observaciones', c: 'b-bad', i: 'alert-triangle' } };
  const DST = { vigente: { l: 'Vigente', c: 'b-ok', i: 'badge-check' }, por_vencer: { l: 'Por vencer', c: 'b-warn', i: 'clock' }, vencido: { l: 'Vencido', c: 'b-bad', i: 'alert-triangle' }, revision: { l: 'En validación', c: 'b-info', i: 'loader' }, faltante: { l: 'Faltante', c: 'b-bad', i: 'file-warning' } };
  const DICON = { camara: 'landmark', rut: 'id-card', poliza: 'shield-check', planos: 'ruler', licencia: 'file-badge', fiducia: 'handshake', fin: 'bar-chart-3' };
  const fdate = (x, long) => (x ? U.fmtDate(x, long) : '—');
  async function openSigned(bucket, path) { try { window.open(await window.Live.signedUrl(bucket, path), '_blank', 'noopener'); } catch (e) { U.toast(e.message, 'err'); } }
  const badge = (m, k) => `<span class="badge ${m[k].c}">${I(m[k].i)}${m[k].l}</span>`;

  const docStatus = (d) => { if (d.status) return d.status; if (d.expires) { const x = U.daysTo(d.expires); if (x < 0) return 'vencido'; if (x <= 15) return 'por_vencer'; } return 'vigente'; };
  const company = (id) => CONSTRUCTORAS.find((c) => c.id === id);
  const interv = (id) => INTERVENTORES.find((c) => c.id === id);
  const projById = (id) => PROJECTS.find((p) => p.id === id);
  const isActive = (p) => !p.reg || p.reg.stage === 'activo';
  const myProjects = () => { const u = state.user; if (u.role === 'admin') return PROJECTS.slice(); if (u.role === 'constructora') return PROJECTS.filter((p) => p.constructora === u.company); if (u.role === 'interventor') return PROJECTS.filter((p) => p.interventor === u.interventor); return PROJECTS.filter((p) => u.projects.includes(p.id) && isActive(p)); };
  const ensurePid = () => { if (!myProjects().some((p) => p.id === state.pid)) { const mine = state.user.unit && myProjects().find((x) => x.id === state.user.unit.projectId), f = mine || myProjects()[0]; state.pid = f ? f.id : null; } };
  const proj = () => projById(state.pid) || myProjects()[0];
  const compliance = (c) => { const req = c.docs.filter((d) => d.req); const ok = req.filter((d) => ['vigente', 'por_vencer'].includes(docStatus(d))).length; return { ok, total: req.length, pct: (ok / req.length) * 100, blocked: req.filter((d) => ['vencido', 'faltante'].includes(docStatus(d))), issues: req.filter((d) => docStatus(d) !== 'vigente') }; };
  const funds = (p) => { const rel = U.releasedPct(p), review = p.monthsData.filter((m) => m.status === 'revision').reduce((s, m) => s + m.tranchePct, 0); return { released: (p.budget * rel) / 100, review: (p.budget * review) / 100, custody: (p.budget * (100 - rel)) / 100, relPct: rel, revPct: review, custPct: 100 - rel - review }; };
  const tranche = (p, m) => (p.budget * m.tranchePct) / 100;
  const pendingReviews = () => myProjects().filter(isActive).flatMap((p) => p.monthsData.filter((m) => m.status === 'revision').map((m) => ({ p, m })));
  const log = (text, icon, pid) => { if (LIVE) return; db.log.unshift({ d: new Date().toISOString(), who: state.user.name, role: state.user.role, pid: pid || state.pid, text, icon: icon || 'activity' }); persist(); };
  const allLog = () => (LIVE ? window.Live.log.slice() : db.log.concat(D.SEED_LOG).sort((a, b) => (a.d < b.d ? 1 : -1)));
  const roleLabel = (r) => (ROLES[r] ? ROLES[r].label : 'Sistema');
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };
  const saveMonth = (p, m) => { db.months[p.id + ':' + m.n] = { status: m.status, tx: m.tx, releasedOn: m.releasedOn, ledger: m.ledger, history: m.history, actualCum: m.actualCum, photos: m.photos, videos: m.videos, report: m.report, tranchePct: m.tranchePct, plannedCum: m.plannedCum, changed: m.changed }; return persist(); };
  /* ---------- evidencias del mes ---------- */
  const evKey = (p, m) => p.id + ':' + m.n;
  const evOf = (p, m) => db.evidence[evKey(p, m)] || [];
  const KB = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  function fileThumb(file, max, q) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => { const img = new Image(); img.onerror = rej; img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', q)); }; img.src = r.result; }; r.readAsDataURL(file); });
  }
  function evTiles(items, o) {
    o = o || {};
    return `<div class="ev-grid">${items.map((x, i) => x.kind === 'img'
      ? `<div class="ev-tile"><button type="button" ${o.view ? `data-act="ev-view" data-id="${o.view[0]}" data-n="${o.view[1]}" data-i="${i}"` : ''} aria-label="Ver ${U.esc(x.name)}"><img src="${x.thumb}" alt="${U.esc(x.name)}" loading="lazy"></button>${o.remove ? `<button type="button" class="ev-x" data-ev-rm="${i}" aria-label="Quitar">${I('x')}</button>` : ''}</div>`
      : `<div class="ev-tile file"><span class="di ic-blue" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center">${I(x.kind === 'video' ? 'camera' : 'file-text')}</span><b>${U.esc(x.name)}</b><small>${x.kind === 'video' ? 'Video' : 'Informe'} · ${U.esc(x.size)}</small>${o.remove ? `<button type="button" class="ev-x" data-ev-rm="${i}" aria-label="Quitar">${I('x')}</button>` : ''}</div>`).join('')}</div>`;
  }
  const evSection = (p, m) => { const it = evOf(p, m); return it.length ? `<div class="eyebrow" style="margin:14px 0 8px">Evidencias cargadas (${it.length})</div>${evTiles(it, { view: [p.id, m.n] })}` : ''; };
  function evViewer(p, m, i0) {
    const imgs = evOf(p, m).map((x, i) => Object.assign({ i }, x)).filter((x) => x.kind === 'img'); let k = Math.max(0, imgs.findIndex((x) => x.i === i0));
    U.modal({ title: 'Evidencia · <span style="text-transform:capitalize">' + m.label + '</span>', wide: true, body: '<div id="evv"></div>', footer: `<button class="btn btn-ghost" id="evp">${I('chevron-left')}Anterior</button><button class="btn btn-ghost" id="evn">Siguiente${I('chevron-right')}</button><button class="btn btn-primary" data-close>Cerrar</button>`,
      onMount: (mm) => { const show = () => { $('#evv', mm).innerHTML = `<img src="${imgs[k].thumb}" alt="${U.esc(imgs[k].name)}" style="width:100%;max-height:60vh;object-fit:contain;border-radius:14px;background:#0B2A6F"><div class="muted" style="margin-top:10px;font-size:13px">${U.esc(imgs[k].name)} · ${k + 1} de ${imgs.length}</div>`; }; $('#evp', mm).addEventListener('click', () => { k = (k + imgs.length - 1) % imgs.length; show(); }); $('#evn', mm).addEventListener('click', () => { k = (k + 1) % imgs.length; show(); }); show(); } });
  }

  const saveDoc = (c, d) => { db.docs[c.id + ':' + d.key] = { status: d.status === undefined ? undefined : d.status, pending: d.pending, issued: d.issued, expires: d.expires, number: d.number, size: d.size, file: d.file }; persist(); };

  /* ============ Navegación por rol ============ */
  function navFor(role) {
    const n = pendingReviews().length;
    const base = [{ t: 'General', items: [['panel', 'layout-dashboard', 'Panel general'], ['proyectos', 'building-2', 'Proyectos']] },
      { t: 'Proyecto seleccionado', items: [['info', 'home', 'Información'], ['legal', 'file-check-2', 'Constructora y legal'], ['obra', 'hard-hat', 'Avance de obra'], ['fondos', 'coins', 'Desembolsos']] }];
    const extra = { comprador: [['mi-inversion', 'key-round', 'Mi inversión']], interventor: [['revisiones', 'clipboard-check', 'Revisiones', n]], constructora: [['revisiones', 'clipboard-check', 'Mis hitos']], admin: [['revisiones', 'clipboard-check', 'Hitos en revisión', n], ['usuarios', 'users', 'Usuarios'], ['auditoria', 'history', 'Auditoría']] }[role];
    if (role === 'constructora') extra.push(['nuevo', 'plus', 'Registrar proyecto']);
    if (role === 'interventor' || role === 'admin') extra.unshift(['solicitudes', 'file-signature', 'Solicitudes', W.pendingCount()]);
    if (extra) base.push({ t: role === 'admin' ? 'Administración' : 'Mi espacio', items: extra });
    return base;
  }

  /* ============ Shell ============ */
  const root = $('#root');
  function applyTheme() {
    const t = state.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
    const m = $('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#050C20' : '#0B2A6F';
  }

  function renderLogin(selected) {
    if (LIVE) return renderLiveLogin(selected === 'up' ? 'up' : 'in');
    const role = selected || 'comprador', u = USERS.find((x) => x.role === role);
    root.innerHTML = `<div class="login">
      <aside class="login-art"><div class="login-stack">${U.brand()}</div>
        <div class="login-stack"><h1>Tu hogar, <em>protegido</em> desde el primer plano.</h1>
          <p class="lead">La plataforma que libera el dinero de tu proyecto solo cuando la obra avanza, auditada por un interventor independiente.</p>
          <ul class="feat">
            <li><span class="fi">${I('lock')}</span><div><b>Fondos en custodia</b><span>Tu inversión permanece protegida hasta que cada hito se cumple.</span></div></li>
            <li><span class="fi">${I('clipboard-check')}</span><div><b>Interventoría independiente</b><span>Cada desembolso requiere la firma del interventor.</span></div></li>
            <li><span class="fi">${I('link-2')}</span><div><b>Trazabilidad en blockchain</b><span>Registros inmutables sobre Stellar y contratos Soroban.</span></div></li>
          </ul></div>
        <div class="login-foot login-stack">${I('shield-check')} Conexión cifrada · Datos protegidos · © 2026 INN-LOCK</div></aside>
      <main class="login-form-wrap"><div class="login-box">
        ${U.brand('brand-m')}
        <h2>Bienvenido de nuevo</h2><p>Selecciona tu perfil e ingresa a tu panel.</p>
        <div class="role-grid" role="radiogroup" aria-label="Tipo de usuario">${Object.entries(ROLES).map(([k, r]) => `<button type="button" class="role" role="radio" aria-checked="${k === role}" data-role="${k}"><span class="ri">${I(r.icon)}</span><span><b>${r.label}</b><span>${r.desc}</span></span></button>`).join('')}</div>
        <form id="login-form" novalidate>
          <div id="login-err"></div>
          <div class="field"><label for="email">Correo electrónico</label><div class="input-wrap">${I('mail')}<input class="input" id="email" type="email" autocomplete="username" value="${u.email}" required></div></div>
          <div class="field"><label for="pass">Contraseña</label><div class="input-wrap">${I('lock')}<input class="input" id="pass" type="password" autocomplete="current-password" value="${u.password}" required><button type="button" class="toggle" data-act="toggle-pass" aria-label="Mostrar contraseña">${I('eye')}</button></div></div>
          <div class="row between" style="margin-bottom:20px"><label class="check"><input type="checkbox" id="remember" checked> Mantener sesión</label><a href="#" class="link" data-act="forgot">¿Olvidaste tu contraseña?</a></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Ingresar ${I('arrow-right')}</button>
        </form>
        <div class="sep">o</div>
        <button class="btn btn-ghost btn-block stellar-btn" data-act="stellar" type="button">${I('fingerprint')} Ingresar con billetera Stellar <span class="badge b-mute" style="margin-left:4px">Próximamente</span></button>
        <div class="demo-note">${I('info')}<div><b>Versión de demostración.</b> Las credenciales de cada perfil se completan automáticamente. Los datos son ficticios y se guardan solo en este navegador.</div></div>
        ${window.Live && window.Live.available ? '<p style="text-align:center;margin-top:14px;font-size:13px"><a href="#" class="link" data-act="go-live">Ingresar con mi cuenta real →</a></p>' : ''}
      </div></main></div>`;
    $$('.role', root).forEach((b) => b.addEventListener('click', () => renderLogin(b.dataset.role)));
    $('#login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const em = $('#email').value.trim().toLowerCase(), pw = $('#pass').value;
      const user = USERS.find((x) => x.email === em && x.password === pw && x.role === role);
      if (!user) { $('#login-err').innerHTML = `<div class="form-error">${I('alert-triangle')} Correo o contraseña incorrectos para el perfil ${ROLES[role].label}.</div>`; return; }
      const btn = $('button[type=submit]'); btn.disabled = true; btn.innerHTML = `${I('loader', 'spin')} Verificando…`;
      setTimeout(() => { state.user = user; store.set('innlock.session', user.id, !$('#remember').checked); ensurePid(); store.set('innlock.pid', state.pid); location.hash = '#/panel'; route(); }, 650);
    });
  }


  function renderLiveLogin(view) {
    const up = view === 'up';
    root.innerHTML = `<div class="login">
      <aside class="login-art"><div class="login-stack">${U.brand()}</div>
        <div class="login-stack"><h1>Tu hogar, <em>protegido</em> desde el primer plano.</h1>
          <p class="lead">La plataforma que libera el dinero de tu proyecto solo cuando la obra avanza, auditada por un interventor independiente.</p>
          <ul class="feat">
            <li><span class="fi">${I('lock')}</span><div><b>Fondos en custodia</b><span>Tu inversión permanece protegida hasta que cada hito se cumple.</span></div></li>
            <li><span class="fi">${I('clipboard-check')}</span><div><b>Interventoría independiente</b><span>Cada desembolso requiere la firma del interventor.</span></div></li>
            <li><span class="fi">${I('link-2')}</span><div><b>Trazabilidad en blockchain</b><span>Registros inmutables sobre Stellar y contratos Soroban.</span></div></li>
          </ul></div>
        <div class="login-foot login-stack">${I('shield-check')} Conexión cifrada · Datos protegidos · © 2026 INN-LOCK</div></aside>
      <main class="login-form-wrap"><div class="login-box">
        ${U.brand('brand-m')}
        <h2>${up ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h2><p>${up ? 'Regístrate para seguir tu inversión en vivienda sobre planos.' : 'Ingresa con tu correo y contraseña.'}</p>
        <form id="live-form" novalidate>
          <div id="login-err"></div>
          ${up ? `<div class="field"><label for="lname">Nombre completo</label><div class="input-wrap">${I('user')}<input class="input" id="lname" autocomplete="name" required></div></div>` : ''}
          <div class="field"><label for="email">Correo electrónico</label><div class="input-wrap">${I('mail')}<input class="input" id="email" type="email" autocomplete="username" required></div></div>
          <div class="field"><label for="pass">Contraseña${up ? ' <span class="muted" style="font-weight:500">(mínimo 8 caracteres)</span>' : ''}</label><div class="input-wrap">${I('lock')}<input class="input" id="pass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" required><button type="button" class="toggle" data-act="toggle-pass" aria-label="Mostrar contraseña">${I('eye')}</button></div></div>
          ${up ? '' : `<div class="row between" style="margin-bottom:18px"><span></span><a href="#" class="link" data-act="forgot">¿Olvidaste tu contraseña?</a></div>`}
          <button class="btn btn-primary btn-lg btn-block" type="submit" style="${up ? 'margin-top:6px' : ''}">${up ? 'Crear cuenta' : 'Ingresar'} ${I('arrow-right')}</button>
        </form>
        <p style="text-align:center;margin-top:16px;font-size:13.5px">${up ? '¿Ya tienes cuenta? <a href="#" class="link" data-act="login-view" data-v="in">Ingresa</a>' : '¿Aún no tienes cuenta? <a href="#" class="link" data-act="login-view" data-v="up">Regístrate</a>'}</p>
        ${up ? `<div class="demo-note">${I('info')}<div>Las cuentas nuevas son de <b>comprador</b>. Si eres constructora o interventor, el administrador te asignará tu rol después de registrarte.</div></div>` : ''}
        <div class="sep">o</div>
        <button class="btn btn-ghost btn-block stellar-btn" data-act="stellar" type="button">${I('fingerprint')} Ingresar con billetera Stellar <span class="badge b-mute" style="margin-left:4px">Próximamente</span></button>
        <p style="text-align:center;margin-top:14px;font-size:13px"><a href="#" class="link" data-act="go-demo">Ver la demostración con datos de ejemplo</a></p>
      </div></main></div>`;
    const err = (m, ok) => { $('#login-err').innerHTML = `<div class="${ok ? 'alert a-ok' : 'form-error'}" style="${ok ? 'margin-bottom:14px;padding:11px 14px' : ''}">${I(ok ? 'check-circle-2' : 'alert-triangle')} ${m}</div>`; };
    $('#live-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const em = $('#email').value.trim().toLowerCase(), pw = $('#pass').value, name = up ? $('#lname').value.trim() : '';
      if (!/^\S+@\S+\.\S+$/.test(em)) { err('Escribe un correo válido.'); return; }
      if (up && name.length < 3) { err('Escribe tu nombre completo.'); return; }
      if (pw.length < (up ? 8 : 1)) { err(up ? 'La contraseña debe tener al menos 8 caracteres.' : 'Escribe tu contraseña.'); return; }
      const btn = $('#live-form button[type=submit]'), label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `${I('loader', 'spin')} ${up ? 'Creando cuenta…' : 'Verificando…'}`;
      try {
        if (up) {
          const r = await window.Live.signUp(name, em, pw);
          if (r.needsConfirm) { renderLiveLogin('in'); $('#email').value = em; err('Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa aquí.', true); return; }
        } else await window.Live.signIn(em, pw);
        const u = await window.Live.load(); if (!u) throw new Error('No se pudo iniciar la sesión.');
        state.user = u; state.pid = null; ensurePid(); store.set('innlock.pid', state.pid); location.hash = '#/panel'; route();
      } catch (x) { err(x.message); btn.disabled = false; btn.innerHTML = label; }
    });
  }
  function liveForgot() {
    U.modal({ title: 'Recuperar contraseña', body: `<p class="muted" style="margin-bottom:14px">Te enviaremos un enlace para crear una contraseña nueva.</p><div class="field" style="margin:0"><label for="fe">Correo electrónico</label><input class="input" id="fe" type="email" autocomplete="username"></div>`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ok">${I('send')}Enviar enlace</button>`,
      onMount: (m, close) => $('#ok', m).addEventListener('click', async () => { const em = $('#fe', m).value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { U.toast('Escribe un correo válido', 'err'); return; } try { await window.Live.resetPassword(em); close(); U.toast('Si el correo existe, recibirás un enlace en unos minutos.'); } catch (x) { U.toast(x.message, 'err'); } }) });
  }
  function recoveryModal() {
    U.modal({ title: 'Crea tu nueva contraseña', body: `<div class="field" style="margin:0"><label for="np">Nueva contraseña (mínimo 8 caracteres)</label><input class="input" id="np" type="password" autocomplete="new-password"></div>`,
      footer: `<button class="btn btn-primary" id="ok">${I('check')}Guardar contraseña</button>`,
      onMount: (m, close) => $('#ok', m).addEventListener('click', async () => { const pw = $('#np', m).value; if (pw.length < 8) { U.toast('Mínimo 8 caracteres', 'err'); return; } try { await window.Live.updatePassword(pw); close(); U.toast('Contraseña actualizada'); } catch (x) { U.toast(x.message, 'err'); } }) });
  }

  function renderShell() {
    const u = state.user;
    root.innerHTML = `<div class="app">
      <aside class="sidebar" id="sidebar" aria-label="Navegación principal">${U.brand()}
        <nav class="nav" id="nav">${navHtml()}</nav>
        <div class="side-card"><b>${I('link-2')} Red Stellar</b>Contratos Soroban en preparación. Los registros mostrados son simulados.</div></aside>
      <div class="scrim" id="scrim"></div>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn menu-btn" data-act="open-menu" aria-label="Abrir menú">${I('menu')}</button>
          <div class="proj-switch" id="proj-switch"></div>
          <div class="top-actions">
            ${LIVE ? '' : '<span class="demo-tag">' + I('info', '') + '<span>Modo demostración</span></span>'}
            <button class="icon-btn" data-act="theme" aria-label="Cambiar tema" id="theme-btn"></button>
            <div style="position:relative"><button class="icon-btn" data-act="notif" aria-label="Notificaciones" id="bell">${I('bell')}</button><div id="notif-box"></div></div>
            <div style="position:relative"><button class="user-btn" data-act="usermenu" aria-label="Menú de usuario"><span class="avatar">${U.initials(u.name)}</span><span class="t"><b>${u.name}</b><small>${ROLES[u.role].label}</small></span>${I('chevron-down')}</button><div id="user-box"></div></div>
          </div></header>
        <main class="content" id="view" tabindex="-1"></main>
      </div></div>`;
    renderProjSwitch(); renderThemeBtn(); updateBell();
  }
  function renderThemeBtn() { const b = $('#theme-btn'); if (b) b.innerHTML = I(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'); }
  function renderProjSwitch(open) {
    const el = $('#proj-switch'); if (!el) return; const p = proj(), list = myProjects();
    if (!p) { el.innerHTML = '<button class="proj-btn" disabled style="opacity:.7"><span class="t"><b>Sin proyectos</b><small>Aún no hay proyectos</small></span></button>'; return; }
    el.innerHTML = `<button class="proj-btn" data-act="projmenu" aria-haspopup="true"><span class="thumb">${U.art(p, null, { static: true })}</span><span class="t"><b>${p.name}</b><small>${p.city} · ${p.zone}</small></span>${list.length > 1 ? I('chevron-down') : ''}</button>
      ${open && list.length > 1 ? `<div class="menu"><div class="menu-head">Cambiar de proyecto</div>${list.map((q) => `<button class="menu-item ${q.id === p.id ? 'sel' : ''}" data-act="pick-project" data-id="${q.id}"><span class="thumb">${U.art(q, null, { static: true })}</span><span class="grow"><b>${q.name}</b><small>${q.city} · ${U.pct(U.progressOf(q), 0)} de avance</small></span>${q.id === p.id ? I('check') : ''}</button>`).join('')}</div>` : ''}`;
  }
  function notifications() {
    const u = state.user, out = [];
    pendingReviews().forEach(({ p, m }) => { if (u.role === 'interventor' || u.role === 'admin') out.push({ i: 'clipboard-check', c: 'ic-gold', t: `<b>${p.name}</b> · el hito de <span style="text-transform:capitalize">${m.label}</span> espera revisión del interventor.`, s: 'Pendiente', r: 'revisiones' }); });
    myProjects().forEach((p) => { const c = company(p.constructora); c.docs.filter((d) => d.req).forEach((d) => { const s = docStatus(d); if (s === 'vencido') out.push({ i: 'alert-triangle', c: 'ic-bad', t: `<b>${c.short}</b> · ${d.title} está vencido. Los desembolsos quedan bloqueados.`, s: 'Crítico', r: 'legal', pid: p.id }); else if (s === 'por_vencer') out.push({ i: 'clock', c: 'ic-gold', t: `<b>${c.short}</b> · ${d.title} vence en ${U.daysTo(d.expires)} días.`, s: 'Atención', r: 'legal', pid: p.id }); }); });
    if (u.role === 'comprador') out.push({ i: 'calendar-check', c: 'ic-blue', t: `Tu próxima cuota de <b>${U.money(u.unit.nextAmount)}</b> vence el ${U.fmtDate(u.unit.next)}.`, s: 'Recordatorio', r: 'mi-inversion' });
    return out.concat(W.notifications(), LIVE ? window.Live.notifs.slice(0, 12) : []);
  }
  function updateBell() { const b = $('#bell'); if (!b) return; $('.ping', b)?.remove(); if ((LIVE && window.Live.notifs.some((n) => n.unread)) || notifications().length > (db.read || 0)) b.insertAdjacentHTML('beforeend', '<span class="ping"></span>'); }

  /* ============ Componentes de vista ============ */
  const pageHead = (title, sub, actions, crumb) => `<div class="page-head"><div>${crumb ? `<div class="crumbs">${crumb}</div>` : ''}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="row row-wrap">${actions}</div>` : ''}</div>`;
  const kpi = (icon, cls, label, value, foot) => `<div class="card kpi reveal"><div class="ico-wrap ${cls}">${I(icon)}</div><div class="label">${label}</div><div class="value num">${value}</div><div class="foot">${foot}</div></div>`;
  const projCrumb = (p, here) => `${I('building-2')}<a href="#/proyectos" class="link" style="font-weight:600">Proyectos</a> ${I('chevron-right')} <span>${p.name}</span> ${I('chevron-right')} <b style="color:var(--text)">${here}</b>`;

  function projectCard(p) {
    const f = funds(p), prog = U.progressOf(p), c = company(p.constructora);
    return `<article class="card pcard reveal" data-act="open-project" data-id="${p.id}" tabindex="0" role="link" aria-label="Abrir ${p.name}">
      <div class="img">${U.art(p)}<span class="badge">${I('hard-hat')}${p.status}</span><span class="pct">${U.pct(prog, 0)}</span></div>
      <div class="body"><div><h3>${p.name}</h3><div class="where">${I('map-pin')}${p.zone}, ${p.city}</div></div>
        <div><div class="row between" style="font-size:13px;margin-bottom:8px"><span class="muted">Avance de obra</span><b class="num">${U.pct(prog)}</b></div><div class="bar"><i data-w="${prog}"></i></div></div>
        <div class="row" style="font-size:13px;color:var(--text-2)">${I('building')} <span class="grow" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.short}</span>${compliance(c).blocked.length ? `<span class="badge b-bad">${I('alert-triangle')}Legal pendiente</span>` : `<span class="badge b-ok">${I('badge-check')}Legal al día</span>`}</div>
        <div class="mini-stats"><div>Presupuesto<b class="num">${U.moneyM(p.budget)}</b></div><div>En custodia<b class="num">${U.moneyM(f.custody)}</b></div><div>Entrega<b>${U.fmtMY(p.end)}</b></div></div></div></article>`;
  }

  function docCard(c, d, canEdit) {
    const s = docStatus(d), cls = s === 'vencido' || s === 'faltante' ? 'is-bad' : s === 'por_vencer' ? 'is-warn' : '';
    const col = { vigente: 'ic-ok', por_vencer: 'ic-gold', vencido: 'ic-bad', revision: 'ic-blue', faltante: 'ic-bad' }[s], u = state.user;
    const exp = d.expires ? `<span>${I('calendar')}Vence ${U.fmtDate(d.expires)}${s === 'por_vencer' ? ` (${U.daysTo(d.expires)} d)` : ''}</span>` : `<span>${I('calendar')}Sin vencimiento</span>`;
    return `<div class="doc ${cls} reveal"><div class="di ${col}">${I(DICON[d.key] || 'file-text')}</div>
      <div class="grow"><div class="row row-wrap" style="gap:8px"><h4>${d.title}</h4>${badge(DST, s)}${d.req ? '' : '<span class="badge b-mute">Complementario</span>'}</div>
        <div class="meta"><span>${I('file-text')}${d.number}</span><span>${I('landmark')}${d.issuer}</span><span>${I('calendar-check')}${d.issued ? 'Expedido ' + U.fmtDate(d.issued) : 'Documento no cargado'}</span>${exp}</div>
        ${d.pending ? `<div class="meta" style="color:var(--info);margin-top:6px"><span>${I('loader')}Nueva versión cargada (${U.esc(d.pending.file)}) · pendiente de validación del administrador</span></div>` : ''}</div>
      <div class="acts"><button class="btn btn-ghost btn-sm" data-act="view-doc" data-c="${c.id}" data-k="${d.key}">${I('eye')}Ver</button>
        ${canEdit && (u.role === 'constructora' || u.role === 'admin') ? `<button class="btn ${s === 'vencido' || s === 'faltante' ? 'btn-primary' : 'btn-soft'} btn-sm" data-act="upload-doc" data-c="${c.id}" data-k="${d.key}">${I('upload')}${s === 'vencido' ? 'Renovar' : 'Actualizar'}</button>` : ''}
        ${u.role === 'admin' && d.pending ? `<button class="btn btn-ok btn-sm" data-act="validate-doc" data-c="${c.id}" data-k="${d.key}">${I('check')}Validar</button>` : ''}</div></div>`;
  }

  /* ---------- Panel ---------- */
  function vPanel() {
    const u = state.user, p = proj(), c = company(p.constructora), f = funds(p), prog = U.progressOf(p), plan = U.plannedNow(p), dev = prog - plan, comp = compliance(c);
    const next = p.monthsData.find((m) => ['revision', 'en_curso', 'observado'].includes(m.status)) || p.monthsData.find((m) => m.status === 'pendiente');
    const alerts = notifications().filter((n) => n.r === 'legal' && n.pid === p.id);
    let h = pageHead(`${greeting()}, ${u.name.split(' ')[0]} 👋`, `Resumen de <b>${p.name}</b> · ${p.city}. ${{ admin: 'Visión global de la plataforma.', comprador: 'Así avanza la obra de tu futuro hogar.', constructora: 'Gestiona tu cumplimiento y tus desembolsos.', interventor: 'Audita el avance y autoriza los desembolsos.' }[u.role]}`, `<a class="btn btn-ghost" href="#/info">${I('home')}Ver proyecto</a><a class="btn btn-primary" href="#/obra">${I('hard-hat')}Avance de obra</a>`);
    h += W.banner(p) + `<div class="grid g-4" style="margin-bottom:22px">
      ${kpi('trending-up', 'ic-blue', 'Avance real de obra', U.pct(prog), `<span class="${dev >= 0 ? 'up' : 'down'}">${dev >= 0 ? '▲' : '▼'} ${U.fmtN(Math.abs(dev), 1)} pts</span> vs. plan (${U.pct(plan)})`)}
      ${kpi('lock', 'ic-sky', 'Fondos en custodia', U.moneyM(f.custody), `${U.pct(f.custPct + f.revPct, 0)} del presupuesto protegido`)}
      ${kpi('banknote', 'ic-ok', 'Desembolsado a la fecha', U.moneyM(f.released), `${p.monthsData.filter((m) => m.status === 'desembolsado').length} hitos aprobados`)}
      ${kpi('shield-check', comp.blocked.length ? 'ic-bad' : comp.issues.length ? 'ic-gold' : 'ic-ok', 'Cumplimiento legal', `${comp.ok}/${comp.total}`, comp.blocked.length ? '<span class="down">Documentos vencidos</span>' : comp.issues.length ? '<span style="color:var(--warn);font-weight:700">Hay documentos por actualizar</span>' : '<span class="up">Todo al día</span>')}
    </div>`;
    h += `<div class="grid g-main" style="margin-bottom:22px"><div class="card card-pad reveal"><div class="card-head"><div><h3>Curva de avance</h3><div class="sub">Acumulado planificado frente al real · ${p.months} meses de obra</div></div><div class="legend"><span><i style="background:var(--muted);opacity:.7"></i>Planificado</span><span><i style="background:linear-gradient(90deg,#12A8F0,#1450C8)"></i>Real</span></div></div>${U.sCurve(p)}</div>
      <div class="stack">
        <div class="card card-pad reveal"><div class="card-head" style="margin-bottom:12px"><h3>Próximo hito</h3>${next ? badge(MST, next.status) : ''}</div>${next ? `<div class="row" style="gap:14px;margin-bottom:14px"><span class="di ic-blue" style="width:52px;height:52px;display:grid;place-items:center;border-radius:15px;flex:none">${I(next.icon)}</span><div><b style="text-transform:capitalize;font-size:16px">${next.label}</b><div class="muted" style="font-size:13.5px">${next.phaseName}</div></div></div><div class="row between" style="font-size:13.5px"><span class="muted">Desembolso asociado</span><b class="num">${U.moneyM(tranche(p, next))}</b></div><div class="row between" style="font-size:13.5px;margin-top:6px"><span class="muted">% del presupuesto</span><b class="num">${U.pct(next.tranchePct, 2)}</b></div><a href="#/obra" class="btn btn-soft btn-block" style="margin-top:16px">Ver detalle ${I('arrow-right')}</a>` : '<div class="empty">Sin hitos pendientes</div>'}</div>
        <div class="card card-pad reveal"><div class="card-head" style="margin-bottom:12px"><h3>Alertas</h3>${alerts.length ? `<span class="badge b-warn">${alerts.length}</span>` : ''}</div>${alerts.length ? alerts.slice(0, 3).map((a) => `<div class="alert ${a.c === 'ic-bad' ? 'a-bad' : 'a-warn'}" style="margin-bottom:10px;padding:12px 14px">${I(a.i)}<p>${a.t}</p></div>`).join('') : `<div class="alert a-ok">${I('check-circle-2')}<div><b>Sin alertas</b><p>La documentación legal está al día.</p></div></div>`}</div>
      </div></div>`;
    h += roleBlock(u, p, c, f);
    h += `<div class="card card-pad reveal" style="margin-top:22px"><div class="card-head"><div><h3>Actividad reciente</h3><div class="sub">Trazabilidad de acciones sobre el proyecto</div></div></div>${activityList(allLog().filter((l) => l.pid === p.id).slice(0, 6))}</div>`;
    return h;
  }
  function activityList(items) {
    if (!items.length) return '<div class="empty">Sin actividad aún</div>';
    return `<div class="stack" style="gap:0">${items.map((l) => `<div class="row" style="padding:12px 0;border-bottom:1px solid var(--line);align-items:flex-start"><span class="di ic-blue" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex:none">${I(l.icon)}</span><div class="grow"><div style="font-size:14px;font-weight:600">${U.esc(l.text)}</div><div class="muted" style="font-size:12.5px">${U.esc(l.who)} · ${roleLabel(l.role)}</div></div><span class="muted num" style="font-size:12.5px;white-space:nowrap">${U.fmtDT(l.d)}</span></div>`).join('')}</div>`;
  }
  function roleBlock(u, p, c, f) {
    if (u.role === 'comprador') {
      const un = u.unit, paidPct = (un.paid / un.price) * 100;
      return `<div class="vault reveal"><div class="row between row-wrap"><span class="net"><span class="dot"></span>Inversión protegida</span><small>${un.code}</small></div>
        <div class="big num">${U.money(un.paid)}</div><small>aportados de ${U.money(un.price)} · ${U.pct(paidPct, 0)} del valor de tu inmueble</small>
        <div class="bar gold" style="margin-top:18px;background:rgba(255,255,255,.18)"><i data-w="${paidPct}"></i></div>
        <div class="row-3"><div><small>Área privada</small><b>${un.area} m²</b></div><div><small>Plan de pago</small><b style="font-size:14px">${un.plan}</b></div><div><small>Próxima cuota</small><b>${U.fmtDate(un.next)}</b></div></div></div>`;
    }
    if (u.role === 'interventor' || u.role === 'admin') {
      const list = pendingReviews();
      const tbl = u.role === 'admin' ? `<div class="card card-pad reveal"><div class="card-head"><div><h3>Portafolio de proyectos</h3><div class="sub">Visión consolidada de la plataforma</div></div></div><div class="table-wrap"><table><thead><tr><th>Proyecto</th><th>Avance</th><th>Custodia</th><th>Legal</th><th></th></tr></thead><tbody>${PROJECTS.map((q) => { const cq = company(q.constructora), cm = compliance(cq); return `<tr><td><b>${q.name}</b><div class="muted" style="font-size:12.5px">${q.city} · ${cq.short}</div></td><td style="min-width:140px"><div class="row" style="gap:10px"><div class="bar thin grow"><i data-w="${U.progressOf(q)}"></i></div><b class="num">${U.pct(U.progressOf(q), 0)}</b></div></td><td class="num">${U.moneyM(funds(q).custody)}</td><td>${cm.blocked.length ? '<span class="badge b-bad">' + I('alert-triangle') + 'Bloqueado</span>' : cm.issues.length ? '<span class="badge b-warn">' + I('clock') + 'Atención</span>' : '<span class="badge b-ok">' + I('badge-check') + 'Al día</span>'}</td><td><button class="btn btn-ghost btn-sm" data-act="open-project" data-id="${q.id}">Abrir</button></td></tr>`; }).join('')}</tbody></table></div></div>` : '';
      return `${tbl}<div class="card card-pad reveal" style="${tbl ? 'margin-top:22px' : ''}"><div class="card-head"><div><h3>Pendientes de revisión</h3><div class="sub">Hitos enviados por las constructoras</div></div>${list.length ? `<span class="badge b-warn">${list.length}</span>` : ''}</div>${list.length ? list.map(({ p: q, m }) => `<div class="row row-wrap" style="padding:14px 0;border-bottom:1px solid var(--line)"><span class="di ic-gold" style="width:44px;height:44px;border-radius:13px;display:grid;place-items:center;flex:none">${I('clock')}</span><div class="grow"><b>${q.name}</b> · <span style="text-transform:capitalize">${m.label}</span><div class="muted" style="font-size:13px">${m.phaseName} · ${U.moneyM(tranche(q, m))}</div></div><button class="btn btn-primary btn-sm" data-act="goto-review" data-id="${q.id}">Revisar</button></div>`).join('') : `<div class="empty">${I('check-circle-2')}No tienes hitos pendientes. ¡Buen trabajo!</div>`}</div>`;
    }
    // constructora
    const cm = compliance(c), cur = p.monthsData.find((m) => ['en_curso', 'observado'].includes(m.status));
    const steps = [[cm.blocked.length === 0, 'Documentación legal vigente', cm.blocked.length ? `${cm.blocked.length} documento(s) vencido(s)` : 'Cámara, RUT, póliza y planos al día', 'legal'], [false, `Cargar evidencias de ${cur ? cur.label : 'este mes'}`, 'Fotos, informe técnico y actas de obra', 'obra'], [false, 'Enviar a interventoría', 'El interventor revisa y firma el hito', 'obra'], [false, 'Recibir el desembolso', 'Se libera automáticamente al aprobar', 'fondos']];
    return `<div class="card card-pad reveal"><div class="card-head"><div><h3>Tu camino al próximo desembolso</h3><div class="sub">Sigue estos pasos para liberar los fondos del hito</div></div></div><div class="grid g-4 keep2">${steps.map((s, i) => `<a href="#/${s[3]}" class="doc" style="flex-direction:column;align-items:flex-start;gap:12px"><span class="di ${s[0] ? 'ic-ok' : 'ic-blue'}" style="width:42px;height:42px">${I(s[0] ? 'check-circle-2' : 'circle-dashed')}</span><div><h4 style="font-size:15px">${i + 1}. ${s[1]}</h4><div class="muted" style="font-size:13px;margin-top:4px">${s[2]}</div></div></a>`).join('')}</div></div>`;
  }

  /* ---------- Proyectos ---------- */
  function vEmpty() {
    const cta = { admin: ['building-2', 'Aún no hay proyectos', 'Empieza registrando constructoras e interventores y asignando roles a los usuarios que se registren.', '<a class="btn btn-primary" href="#/usuarios">Usuarios y organizaciones</a>'],
      constructora: ['hard-hat', 'Registra tu primer proyecto', 'Completa tus documentos legales y envía tu proyecto a interventoría.', '<a class="btn btn-primary" href="#/nuevo">Registrar proyecto</a><a class="btn btn-ghost" href="#/legal">Mis documentos legales</a>'],
      interventor: ['clipboard-check', 'Aún no tienes proyectos asignados', 'Cuando una constructora te asigne a un proyecto aparecerá aquí.', ''],
      comprador: ['key-round', 'Aún no hay proyectos disponibles', 'Cuando se activen proyectos podrás conocerlos y seguir su avance aquí.', ''] }[state.user.role];
    return `<div class="card empty reveal" style="margin-top:30px;padding:56px 20px">${I(cta[0])}<h2 style="font-size:20px;color:var(--text);margin:6px 0">${cta[1]}</h2><p style="max-width:46ch;margin:0 auto">${cta[2]}</p><div class="row row-wrap" style="justify-content:center;margin-top:18px">${cta[3]}</div></div>`;
  }
  function vProyectos() {
    const list = myProjects();
    if (!list.length) return vEmpty();
    return pageHead('Proyectos', `${list.length} proyecto${list.length === 1 ? '' : 's'} bajo custodia y auditoría.`, state.user.role === 'constructora' ? `<a class="btn btn-primary" href="#/nuevo">${I('plus')}Registrar proyecto</a>` : '', '') +
      `<div class="grid g-3">${list.map(projectCard).join('')}</div>`;
  }

  /* ---------- Información del proyecto ---------- */
  function vInfo() {
    const p = proj(), c = company(p.constructora), it = interv(p.interventor), prog = U.progressOf(p), sold = (p.sold / p.units) * 100;
    const fact = (ic, l, v) => `<div class="fact"><small>${I(ic)}${l}</small><b>${v}</b></div>`;
    return `<div class="crumbs">${projCrumb(p, 'Información')}</div>${W.banner(p)}
      <section class="hero reveal">${U.art(p, null, { hero: true, shift: 170, cls: 'art-wide' })}${U.art(p, null, { hero: true, cls: 'art-narrow' })}<div class="hero-in"><div class="row row-wrap" style="gap:8px"><span class="badge">${I('hard-hat')}${p.status}</span><span class="badge">${I('badge-check')}Fondos en custodia</span></div>
        <div><h1>${p.name}</h1><div class="loc">${I('map-pin')}${p.address} · ${p.zone}, ${p.city}</div><p style="color:rgba(255,255,255,.82);margin-top:8px;max-width:60ch">${p.tagline}</p></div>
        <div class="stats"><div class="stat"><small>Avance de obra</small><b class="num">${U.pct(prog, 0)}</b></div><div class="stat"><small>Desde</small><b class="num">${U.moneyM(p.priceFrom)}</b></div><div class="stat"><small>Unidades</small><b class="num">${p.units}</b></div><div class="stat"><small>Entrega estimada</small><b>${U.fmtMY(p.end)}</b></div></div></div></section>
      <div class="grid g-main" style="margin-bottom:22px">
        <div class="stack">
          <div class="card card-pad reveal"><div class="card-head"><h3>Descripción</h3></div><p style="color:var(--text-2);font-size:15.5px">${p.description}</p><hr class="divider"><div class="row row-wrap" style="gap:8px">${p.amenities.map((a) => `<span class="chip">${I('check')}${a}</span>`).join('')}</div></div>
          <div class="card card-pad reveal"><div class="card-head"><div><h3>Ficha del proyecto</h3><div class="sub">Datos clave verificados por la plataforma</div></div></div><div class="facts">
            ${fact('map-pin', 'Ubicación', p.zone + ', ' + p.city)}${fact('building-2', 'Torres', p.towers + (p.towers > 1 ? ' torres' : ' torre'))}${fact('layers', 'Pisos', p.floors + ' por torre')}${fact('home', 'Unidades', p.units + ' apartamentos')}${fact('maximize', 'Áreas', p.area)}${fact('car', 'Parqueaderos', p.parking)}${fact('star', 'Estrato', p.strata)}${fact('calendar', 'Inicio de obra', U.fmtDate(p.start))}${fact('flag', 'Entrega', U.fmtDate(p.end))}${fact('coins', 'Presupuesto de obra', U.moneyM(p.budget))}${fact('file-badge', 'Licencia', p.lic ? p.lic.number : c.docs.find((d) => d.key === 'licencia').number)}${fact('handshake', 'Fiducia', p.fidu ? p.fidu.issuer : c.docs.find((d) => d.key === 'fiducia').issuer)}
          </div></div>
          <div class="card card-pad reveal"><div class="card-head"><div><h3>Tipologías disponibles</h3><div class="sub">${p.units - p.sold} unidades disponibles</div></div></div><div class="grid g-3">${p.typologies.map((t) => `<div class="typo"><h4>${t.name}</h4><div class="specs"><span>${I('maximize')}${t.area} m²</span><span>${I('bed-double')}${t.beds}</span><span>${I('bath')}${t.baths}</span><span>${I('car')}${t.parking}</span></div><div class="price">Desde<b class="num">${U.money(t.price)}</b></div></div>`).join('')}</div></div>
        </div>
        <div class="stack">
          <div class="card card-pad reveal"><div class="card-head"><h3>Equipo del proyecto</h3></div>
            <div class="row" style="gap:14px"><div class="co-logo" style="width:54px;height:54px;font-size:19px;border-radius:16px;background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${U.initials(c.short)}</div><div class="grow"><div class="eyebrow">Constructora</div><b>${c.name}</b><div class="muted" style="font-size:13px">NIT ${c.nit}</div></div></div>
            <a href="#/legal" class="btn btn-soft btn-block" style="margin:14px 0">${I('file-check-2')}Ver cumplimiento legal</a><hr class="divider" style="margin:6px 0 16px">
            <div class="row" style="gap:14px"><span class="avatar" style="width:54px;height:54px;border-radius:16px;font-size:17px;box-shadow:none;background:linear-gradient(135deg,#FFD54A,#FF9A00);color:#3B2500">${U.initials(it.name.replace('Ing. ', ''))}</span><div class="grow"><div class="eyebrow">Interventor</div><b>${it.name}</b><div class="muted" style="font-size:13px">${it.firm}</div><div class="muted" style="font-size:12px">${it.license}</div></div></div></div>
          <div class="card card-pad reveal"><div class="card-head"><h3>Ventas</h3><span class="badge b-info">${U.pct(sold, 0)} vendido</span></div><div class="bar gold"><i data-w="${sold}"></i></div><div class="row between muted" style="font-size:13px;margin-top:10px"><span>${p.sold} vendidas</span><span>${p.units - p.sold} disponibles</span></div></div>
          <div class="card reveal" style="overflow:hidden"><div class="map">${U.mapSvg(p)}<div class="overlay"><b>${p.name}</b>${p.address}</div></div><div style="padding:14px 18px" class="row between"><span class="muted" style="font-size:13px">${p.zone}, ${p.city}</span><a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${p.lat ? p.lat + ',' + p.lng : encodeURIComponent(p.address + ', ' + p.city)}">Abrir mapa ${I('external-link')}</a></div></div>
        </div></div>`;
  }

  /* ---------- Constructora y legal ---------- */
  function vLegal() {
    const c0 = company(state.user.company), p = proj() || { id: '', name: c0 ? c0.short : '', planos: [], constructora: state.user.company, noProject: true }, c = company(p.constructora), cm = compliance(c), canEdit = true;
    const col = cm.blocked.length ? '#D93A45' : cm.issues.length ? '#FF9A00' : '#0E9F6E';
    let h = `<div class="crumbs">${projCrumb(p, 'Constructora y legal')}</div>` + pageHead('Constructora y cumplimiento legal', 'Documentación que respalda al constructor. Un documento vencido bloquea automáticamente los desembolsos.', '');
    h += `<div class="card reveal" style="margin-bottom:22px"><div class="co-head"><div class="co-logo" style="background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${U.initials(c.short)}</div><div class="grow" style="min-width:220px"><div class="row row-wrap" style="gap:8px"><h2 style="font-size:23px">${c.name}</h2><span class="badge b-gold">${I('star')}${c.rating}</span></div><div class="muted" style="margin-top:4px">NIT ${c.nit} · ${c.rep}, ${c.repRole}</div><div class="row row-wrap muted" style="gap:6px 18px;font-size:13.5px;margin-top:8px"><span class="row" style="gap:6px">${I('map-pin')}${c.city}</span><span class="row" style="gap:6px">${I('mail')}${c.email}</span><span class="row" style="gap:6px">${I('phone')}${c.phone}</span></div></div></div>
      <p style="padding:0 26px 22px;color:var(--text-2)">${c.about}</p>
      <div class="co-stats"><div><small>Fundada</small><b class="num">${c.founded}</b></div><div><small>Proyectos entregados</small><b class="num">${c.delivered}</b></div><div><small>Unidades construidas</small><b class="num">${U.fmtN(c.units)}</b></div><div><small>m² construidos</small><b class="num">${c.sqm}</b></div></div></div>`;
    h += `<div class="grid g-main" style="margin-bottom:22px;align-items:start"><div class="card score reveal">${U.ring(cm.pct, col)}<div class="grow" style="min-width:220px"><h3 style="font-size:19px">Índice de cumplimiento</h3><p class="muted" style="margin-top:4px">${cm.ok} de ${cm.total} documentos obligatorios vigentes.</p><div class="row row-wrap" style="gap:8px;margin-top:12px"><span class="badge b-ok">${I('badge-check')}${c.docs.filter((d) => docStatus(d) === 'vigente').length} vigentes</span>${c.docs.some((d) => docStatus(d) === 'por_vencer') ? `<span class="badge b-warn">${I('clock')}${c.docs.filter((d) => docStatus(d) === 'por_vencer').length} por vencer</span>` : ''}${c.docs.some((d) => ['vencido', 'faltante'].includes(docStatus(d))) ? `<span class="badge b-bad">${I('alert-triangle')}${c.docs.filter((d) => ['vencido', 'faltante'].includes(docStatus(d))).length} vencidos</span>` : ''}</div></div></div>
      ${cm.blocked.length ? `<div class="alert a-bad reveal">${I('shield-alert')}<div><b>Desembolsos bloqueados</b><p>${cm.blocked.map((d) => d.title).join(', ')} ${cm.blocked.length > 1 ? 'están vencidos' : 'está vencido'}. El interventor no podrá aprobar hitos hasta que se renueve.</p></div></div>` : `<div class="alert a-ok reveal">${I('shield-check')}<div><b>Constructora habilitada</b><p>Cumple los requisitos para recibir desembolsos${cm.issues.length ? '. Hay documentos próximos a vencer.' : '.'}</p></div></div>`}</div>`;
    h += `<div class="card-head" style="margin-top:8px"><div><h3 style="font-size:19px">Documentos obligatorios</h3><div class="sub">Cámara de Comercio, RUT, póliza, planos y licencia</div></div></div><div class="stack" style="margin-bottom:26px">${c.docs.filter((d) => d.req).map((d) => docCard(c, d, canEdit)).join('')}</div>`;
    if (!p.noProject) h += `<div class="card-head"><div><h3 style="font-size:19px">Planos del proyecto</h3><div class="sub">Versión vigente cargada ante curaduría y auditada por el interventor</div></div></div><div class="card card-pad reveal" style="margin-bottom:26px"><div class="table-wrap"><table><thead><tr><th>Conjunto de planos</th><th>Láminas</th><th>Versión</th><th>Cargado</th><th>Tamaño</th><th></th></tr></thead><tbody>${p.planos.map((x) => `<tr><td><div class="row" style="gap:12px"><span class="di ic-blue" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center">${I('ruler')}</span><b>${x.name}</b></div></td><td class="num">${x.n}</td><td><span class="badge b-info">v${x.v}</span></td><td>${U.fmtDate(x.date)}</td><td class="num">${x.size}</td><td style="text-align:right"><button class="btn btn-ghost btn-sm" data-act="download" data-n="${x.name}" data-path="${x.path || ''}">${I('download')}Descargar</button></td></tr>`).join('')}</tbody></table></div></div>`;
    h += `<div class="card-head"><div><h3 style="font-size:19px">Documentos complementarios</h3></div></div><div class="stack">${c.docs.filter((d) => !d.req).map((d) => docCard(c, d, canEdit)).join('')}</div>`;
    return h;
  }

  /* ---------- Avance de obra ---------- */
  function monthCard(p, m, open) {
    const u = state.user, c = company(p.constructora), cm = compliance(c);
    const cls = { desembolsado: 'done', revision: 'review', en_curso: 'current', pendiente: 'pending', observado: 'obs' }[m.status];
    const icon = { desembolsado: 'check', revision: 'clock', en_curso: m.icon, pendiente: m.icon, observado: 'alert-triangle' }[m.status];
    let acts = '';
    if (u.role === 'constructora' && ['en_curso', 'observado'].includes(m.status)) acts = `<button class="btn btn-primary btn-sm" data-act="submit-month" data-id="${p.id}" data-n="${m.n}">${I('send')}${m.status === 'observado' ? 'Subsanar y reenviar' : 'Cerrar mes y enviar a interventoría'}</button>`;
    if ((u.role === 'interventor' || u.role === 'admin') && m.status === 'revision') acts = `<button class="btn btn-ok btn-sm" data-act="approve-month" data-id="${p.id}" data-n="${m.n}">${I('check-circle-2')}Revisar y aprobar</button><button class="btn btn-bad btn-sm" data-act="observe-month" data-id="${p.id}" data-n="${m.n}">${I('alert-triangle')}Observar</button>`;
    const hist = m.history && m.history.length ? `<div class="hist">${m.history.map((x) => `<div><b style="color:${x.t === 'observado' ? 'var(--bad)' : x.t === 'aprobado' ? 'var(--ok)' : 'var(--info)'}">${x.t}</b> · <span class="muted">${x.by}</span><div style="color:var(--text-2)">${U.esc(x.text)}</div></div>`).join('')}</div>` : '';
    return `<div class="tl-item ${cls} reveal"><div class="tl-dot">${I(icon)}</div><div class="card tl-card ${open ? 'open' : ''}" data-act="toggle-month"><div class="top"><div><h4>${m.label}<small>Mes ${m.n} de ${p.months}</small></h4><div class="phase">${m.phaseName}</div></div><div class="row row-wrap" style="gap:8px">${m.changed ? '<span class="badge b-info">Ajustado</span>' : ''}${badge(MST, m.status)}${I('chevron-down')}</div></div>
      <div class="row between" style="margin-top:14px;gap:16px;font-size:13px"><div class="grow"><div class="row between" style="margin-bottom:6px"><span class="muted">Avance acumulado</span><b class="num">${m.actualCum != null ? U.pct(m.actualCum) : '—'} <span class="muted" style="font-weight:600">/ plan ${U.pct(m.plannedCum)}</span></b></div><div class="bar thin ${m.actualCum != null && m.actualCum + 0.3 < m.plannedCum ? 'gold' : ''}"><i data-w="${m.actualCum != null ? m.actualCum : 0}"></i><span class="plan" style="left:${m.plannedCum}%"></span></div></div></div>
      <div class="tl-body"><div class="tl-meta"><div><small>Desembolso del hito</small><b class="num">${U.moneyM(tranche(p, m))}</b></div><div><small>% del presupuesto</small><b class="num">${U.pct(m.tranchePct, 2)}</b></div><div><small>Evidencias</small><b>${m.photos} fotos · ${m.videos} videos${m.report ? ' · informe' : ''}</b></div><div><small>Interventor</small><b style="font-size:13.5px">${interv(p.interventor).name}</b></div></div>
        ${evSection(p, m)}<ul class="acts-list">${m.activities.map((a) => `<li>${I(m.status === 'desembolsado' ? 'check-circle-2' : 'circle-dashed')}${a}</li>`).join('')}</ul>${hist}
        ${m.tx ? `<div class="tx" style="margin-top:16px">${I('link-2')}<span class="h mono">${U.short(m.tx, 14, 12)}</span><button class="btn btn-ghost btn-sm" data-act="tx" data-id="${p.id}" data-n="${m.n}" style="margin-left:auto">Ver registro</button></div>` : ''}
        ${m.status === 'revision' && cm.blocked.length ? `<div class="alert a-bad" style="margin-top:14px">${I('shield-alert')}<p>Desembolso bloqueado: la constructora tiene documentación vencida.</p></div>` : ''}
        ${acts ? `<div class="row row-wrap" style="margin-top:16px">${acts}</div>` : ''}</div></div></div>`;
  }
  function vObra() {
    const p = proj(), prog = U.progressOf(p), plan = U.plannedNow(p), dev = prog - plan, cur = p.monthsData.find((m) => ['en_curso', 'observado', 'revision'].includes(m.status)) || p.monthsData[0];
    let h = `<div class="crumbs">${projCrumb(p, 'Avance de obra')}</div>` + pageHead('Avance de obra', 'Seguimiento mes a mes, consolidado y auditado por el interventor.', W.changeButton(p));
    h += `<div class="grid g-4" style="margin-bottom:22px">${kpi('trending-up', 'ic-blue', 'Avance real', U.pct(prog), `Plan a la fecha: ${U.pct(plan)}`)}${kpi('activity', dev >= 0 ? 'ic-ok' : 'ic-gold', 'Desviación', (dev >= 0 ? '+' : '') + U.fmtN(dev, 1) + ' pts', dev >= 0 ? '<span class="up">Adelantado respecto al plan</span>' : '<span style="color:var(--warn);font-weight:700">Ligero retraso, dentro de tolerancia</span>')}${kpi('calendar', 'ic-sky', 'Mes en curso', `${p.currentMonth} / ${p.months}`, `<span style="text-transform:capitalize">${cur.label}</span>`)}${kpi('flag', 'ic-gold', 'Entrega estimada', U.fmtMY(p.end), `${U.daysTo(p.end) > 0 ? 'Faltan ' + U.fmtN(Math.round(U.daysTo(p.end) / 30)) + ' meses' : 'Entregado'}`)}</div>`;
    h += `<div class="card card-pad reveal" style="margin-bottom:8px"><div class="card-head"><div><h3>Curva S del proyecto</h3><div class="sub">Pasa el cursor sobre cada punto para ver el detalle del mes</div></div><div class="legend"><span><i style="background:var(--muted);opacity:.7"></i>Planificado</span><span><i style="background:linear-gradient(90deg,#12A8F0,#1450C8)"></i>Real</span></div></div>${U.sCurve(p)}</div>`;
    h += W.changesCard(p);
    let yr = null; const grouped = [];
    p.monthsData.forEach((m) => { if (m.year !== yr) { yr = m.year; grouped.push(`<div class="year-lbl">${yr}</div>`); } grouped.push(monthCard(p, m, ['revision', 'observado'].includes(m.status) || m === cur && m.status === 'en_curso')); });
    return h + `<div class="tl">${grouped.join('')}</div>`;
  }

  /* ---------- Desembolsos ---------- */
  function vFondos() {
    const p = proj(), f = funds(p), rows = p.monthsData;
    let h = `<div class="crumbs">${projCrumb(p, 'Desembolsos')}</div>` + pageHead('Fondos y desembolsos', 'El dinero permanece en custodia y se libera por hitos, solo con la aprobación del interventor.', '');
    h += `<div class="vault reveal" style="margin-bottom:22px"><div class="row between row-wrap"><span class="net"><span class="dot"></span>Patrimonio autónomo · Red Stellar (simulado)</span><small>${p.name}</small></div>
      <div class="row row-wrap" style="gap:30px;align-items:flex-end"><div><small>En custodia</small><div class="big num">${U.money(f.custody)}</div></div><div><small>Presupuesto total</small><div class="num" style="font-size:22px;font-weight:800">${U.money(p.budget)}</div></div></div>
      <div class="funds-bar" style="margin-top:22px;background:rgba(255,255,255,.14)"><i data-w="${f.relPct}" style="background:linear-gradient(90deg,#34D399,#0E9F6E)"></i><i data-w="${f.revPct}" style="background:linear-gradient(90deg,#FFD54A,#FF9A00)"></i><i data-w="${f.custPct}" style="background:linear-gradient(90deg,#12A8F0,#4F8BFF)"></i></div>
      <div class="row-3"><div><small>Desembolsado</small><b class="num">${U.moneyM(f.released)}</b></div><div><small>En revisión</small><b class="num">${U.moneyM(f.review)}</b></div><div><small>Protegido</small><b class="num">${U.moneyM(f.custody - f.review)}</b></div></div></div>`;
    h += `<div class="card card-pad reveal"><div class="card-head"><div><h3>Calendario de desembolsos</h3><div class="sub">${rows.filter((m) => m.status === 'desembolsado').length} de ${rows.length} hitos liberados</div></div></div><div class="table-wrap"><table><thead><tr><th>Mes</th><th>Fase</th><th>% presup.</th><th>Monto</th><th>Estado</th><th>Liberado</th><th></th></tr></thead><tbody>${rows.map((m) => `<tr><td style="text-transform:capitalize;white-space:nowrap"><b>${m.label}</b></td><td>${m.phaseName}</td><td class="num">${U.pct(m.tranchePct, 2)}</td><td class="num"><b>${U.moneyM(tranche(p, m))}</b></td><td>${badge(MST, m.status)}</td><td class="muted">${m.releasedOn ? U.fmtDate(m.releasedOn) : '—'}</td><td style="text-align:right">${m.tx ? `<button class="btn btn-ghost btn-sm" data-act="tx" data-id="${p.id}" data-n="${m.n}">${I('link-2')}Registro</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>`;
    return h;
  }

  /* ---------- Revisiones ---------- */
  function vRevisiones() {
    const u = state.user, ps = myProjects();
    const items = ps.flatMap((p) => p.monthsData.filter((m) => ['revision', 'observado'].includes(m.status) || (u.role === 'constructora' && m.status === 'en_curso')).map((m) => ({ p, m })));
    const title = u.role === 'constructora' ? 'Mis hitos' : u.role === 'admin' ? 'Hitos en revisión' : 'Revisiones de interventoría';
    let h = pageHead(title, u.role === 'constructora' ? 'Cierra cada mes y envía tus evidencias a interventoría.' : 'Verifica la evidencia y aprueba para liberar el desembolso del hito.', '');
    if (!items.length) return h + `<div class="card empty">${I('check-circle-2')}<b>Todo al día</b><p>No hay hitos pendientes.</p></div>`;
    return h + `<div class="stack">${items.map(({ p, m }) => `<div><div class="row" style="margin-bottom:10px;gap:10px"><span class="chip">${I('building-2')}${p.name}</span></div><div class="tl" style="padding:0">${monthCard(p, m, true)}</div></div>`).join('')}</div>`;
  }

  /* ---------- Mi inversión (comprador) ---------- */
  function vMiInversion() {
    const u = state.user, un = u.unit;
    if (!un) return pageHead('Mi inversión', 'Tu inmueble, tus pagos y cómo está protegido tu dinero.', '') + `<div class="card empty reveal" style="padding:56px 20px">${I('key-round')}<h2 style="font-size:20px;color:var(--text);margin:6px 0">Aún no tienes una unidad asignada</h2><p style="max-width:46ch;margin:0 auto">Cuando la plataforma registre tu compra, aquí verás tu inmueble, tus cuotas y la protección de tu dinero.</p></div>`;
    const p = projById(un.projectId) || proj(), f = funds(p), paidPct = (un.paid / un.price) * 100;
    const inst = un.payments ? un.payments.filter((x) => x.n > 0).map((x) => ({ n: x.n, d: x.due, paid: x.paid, amount: x.amount })) : Array.from({ length: un.installments[0] }, (_, i) => { const d = new Date('2025-12-05'); d.setMonth(d.getMonth() + i); return { n: i + 1, d, paid: i < un.installments[1] }; });
    let h = pageHead('Mi inversión', 'Tu inmueble, tus pagos y cómo está protegido tu dinero.', `<button class="btn btn-gold" data-act="cert">${I('badge-check')}Certificado de protección</button>`);
    h += `<div class="grid g-main" style="margin-bottom:22px"><div class="card reveal" style="overflow:hidden"><div style="height:240px;position:relative">${U.art(p)}<div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(6,22,71,.85))"></div><div style="position:absolute;left:24px;bottom:20px;color:#fff"><div class="eyebrow" style="color:rgba(255,255,255,.7)">Tu inmueble</div><h2 style="font-size:26px">${un.code}</h2><div style="opacity:.85">${p.name} · ${p.zone}, ${p.city}</div></div></div>
        <div class="card-pad"><div class="facts">${[['maximize', 'Área privada', un.area + ' m²'], ['bed-double', 'Alcobas', un.beds], ['bath', 'Baños', un.baths], ['car', 'Parqueaderos', un.parking], ['coins', 'Valor', U.moneyM(un.price)], ['flag', 'Entrega', U.fmtMY(p.end)]].map((x) => `<div class="fact"><small>${I(x[0])}${x[1]}</small><b>${x[2]}</b></div>`).join('')}</div></div></div>
      <div class="stack"><div class="card card-pad reveal"><div class="card-head" style="margin-bottom:10px"><h3>Plan de pagos</h3></div><div class="row" style="gap:18px">${U.ring(paidPct, '#1450C8', 104).replace('cumple', 'pagado')}<div><div class="num" style="font-size:24px;font-weight:800">${U.money(un.paid)}</div><div class="muted" style="font-size:13px">de ${U.money(un.price)}</div><div class="muted" style="font-size:13px;margin-top:6px">${un.plan}</div></div></div><hr class="divider"><div class="row between"><span class="muted">Próxima cuota</span><b class="num">${U.money(un.nextAmount)}</b></div><div class="row between" style="margin-top:6px"><span class="muted">Fecha</span><b>${U.fmtDate(un.next)}</b></div></div>
        <div class="alert a-ok reveal">${I('shield-check')}<div><b>Tu dinero está protegido</b><p>Se mantiene en el patrimonio autónomo. La constructora solo recibe fondos cuando el interventor aprueba cada hito.</p></div></div></div></div>`;
    h += `<div class="card card-pad reveal" style="margin-bottom:22px"><div class="card-head"><div><h3>Así protegemos tu inversión</h3></div></div><div class="grid g-4 keep2">${[['lock', 'Pagas', 'Tus cuotas ingresan al patrimonio autónomo.'], ['hard-hat', 'La obra avanza', 'La constructora ejecuta y documenta cada mes.'], ['clipboard-check', 'Se audita', 'El interventor verifica en sitio y firma.'], ['coins', 'Se desembolsa', 'Solo entonces se libera el valor del hito.']].map((s, i) => `<div class="doc" style="flex-direction:column;align-items:flex-start;gap:12px"><span class="di ic-blue" style="width:44px;height:44px">${I(s[0])}</span><div><h4 style="font-size:15px">${i + 1}. ${s[1]}</h4><div class="muted" style="font-size:13px;margin-top:4px">${s[2]}</div></div></div>`).join('')}</div></div>`;
    h += `<div class="card card-pad reveal"><div class="card-head"><div><h3>Calendario de cuotas</h3><div class="sub">${un.installments[1]} de ${un.installments[0]} cuotas pagadas</div></div></div><div class="table-wrap" style="max-height:380px;overflow:auto"><table><thead><tr><th>#</th><th>Fecha</th><th>Valor</th><th>Estado</th></tr></thead><tbody>${inst.map((x) => `<tr><td class="num">${x.n}</td><td>${U.fmtDate(x.d)}</td><td class="num">${U.money(x.amount || un.nextAmount)}</td><td>${x.paid ? `<span class="badge b-ok">${I('check')}Pagada</span>` : `<span class="badge b-mute">${I('calendar')}Programada</span>`}</td></tr>`).join('')}</tbody></table></div></div>`;
    return h;
  }

  /* ---------- Usuarios y auditoría (admin) ---------- */
  function vUsuarios() {
    return pageHead('Usuarios', 'Perfiles con acceso a la plataforma.', `<button class="btn btn-primary" data-act="invite">${I('plus')}Invitar usuario</button>`) +
      `<div class="card card-pad reveal"><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Perfil</th><th>Proyectos</th><th>Estado</th></tr></thead><tbody>${USERS.map((x) => `<tr><td><div class="cell-user"><span class="avatar">${U.initials(x.name)}</span><div><b>${x.name}</b><div class="muted" style="font-size:12.5px">${x.email}</div></div></div></td><td><span class="badge b-info">${I(ROLES[x.role].icon)}${ROLES[x.role].label}</span></td><td>${x.projects.map((id) => `<span class="chip" style="margin:2px">${projById(id).name}</span>`).join('')}</td><td><span class="badge b-ok"><span class="dot"></span>Activo</span></td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function vAuditoria() {
    return pageHead('Auditoría', 'Registro cronológico de acciones sobre proyectos, documentos y desembolsos.', '') + `<div class="card card-pad reveal">${activityList(allLog().slice(0, 40))}</div>`;
  }

  const ROUTES = { panel: vPanel, proyectos: vProyectos, info: vInfo, legal: vLegal, obra: vObra, fondos: vFondos, revisiones: vRevisiones, 'mi-inversion': vMiInversion, usuarios: vUsuarios, auditoria: vAuditoria };
  const ALLOWED = { comprador: ['mi-inversion'], interventor: ['solicitudes'], constructora: ['nuevo'], admin: ['usuarios', 'auditoria', 'solicitudes'] };

  /* ============ Enrutador ============ */
  let routeToken = 0;
  async function route() {
    const token = ++routeToken;
    applyTheme();
    const name = (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
    if (!state.user) { if (name !== 'login' && location.hash !== '#/login') location.hash = '#/login'; renderLogin(); return; }
    if (name === 'login' || !name) { location.hash = '#/panel'; return; }
    if (!$('#view')) renderShell();
    const restricted = ['mi-inversion', 'usuarios', 'auditoria', 'nuevo', 'solicitudes']; if (name === 'revisiones' && state.user.role === 'comprador') { location.hash = '#/panel'; return; }
    const key = ROUTES[name] && (!restricted.includes(name) || ALLOWED[state.user.role].includes(name)) ? name : 'panel';
    if (key !== name) { location.hash = '#/' + key; return; }
    state.route = key; ensurePid();
    if (LIVE && (key === 'obra' || key === 'revisiones')) {
      try { await window.Live.ensureEvidence((key === 'obra' ? [state.pid] : myProjects().map((x) => x.id)).filter(Boolean)); } catch (e) { /* las fotos se mostrarán sin vista previa */ }
      if (token !== routeToken) return;
    }
    const view = $('#view'); view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
    const needsProj = ['panel', 'info', 'legal', 'obra', 'fondos'].includes(key) && !(key === 'legal' && state.user.role === 'constructora');
    try { view.innerHTML = needsProj && !proj() ? vEmpty() : ROUTES[key](); }
    catch (e) { console.error(e); view.innerHTML = `<div class="card empty" style="margin-top:30px">${I('alert-triangle')}<b>No se pudo mostrar esta pantalla</b><p>${U.esc(e.message)}</p></div>`; return; }
    if (W.mount[key]) W.mount[key](view);
    $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === key));
    closeMenus(); closeSidebar(); window.scrollTo({ top: 0 });
    document.title = ({ panel: 'Panel', proyectos: 'Proyectos', info: 'Información', legal: 'Constructora y legal', obra: 'Avance de obra', fondos: 'Desembolsos', revisiones: 'Revisiones', 'mi-inversion': 'Mi inversión', usuarios: 'Usuarios', auditoria: 'Auditoría', nuevo: 'Registrar proyecto', solicitudes: 'Solicitudes' })[key] + ' · INN-LOCK';
    animateBars(); view.focus({ preventScroll: true });
  }
  function animateBars() { requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-w]').forEach((el) => { el.style.width = Math.max(0, Math.min(100, +el.dataset.w)) + '%'; }))); }
  function navHtml() { return navFor(state.user.role).map((g) => `<div class="nav-title">${g.t}</div>${g.items.map((it) => `<a href="#/${it[0]}" data-route="${it[0]}">${I(it[1])}<span>${it[2]}</span>${it[3] ? `<span class="pill">${it[3]}</span>` : ''}</a>`).join('')}`).join(''); }
  function refresh() { const nv = $('#nav'); if (nv) nv.innerHTML = navHtml(); renderProjSwitch(); updateBell(); route(); }

  /* ============ Menús ============ */
  function closeMenus() { const n = $('#notif-box'), um = $('#user-box'); if (n) n.innerHTML = ''; if (um) um.innerHTML = ''; renderProjSwitch(false); }
  const closeSidebar = () => { $('#sidebar')?.classList.remove('open'); $('#scrim')?.classList.remove('on'); };
  function setProject(id) { state.pid = id; store.set('innlock.pid', id); renderProjSwitch(); }

  /* ============ Modales de acción ============ */
  function docViewer(c, d) {
    const s = docStatus(d), hash = D.txHash(d.number.length * 977 + c.id.charCodeAt(1));
    U.modal({ title: d.title, wide: true, body: `<div class="docview"><div class="wm">VISTA PREVIA</div><div class="row between row-wrap"><div><h4>${d.title}</h4><div style="color:#66779a">${d.sub}</div></div>${badge(DST, s)}</div><hr>
      <div class="grid g-2" style="gap:10px 24px"><div><small style="color:#66779a">Entidad emisora</small><br><b>${d.issuer}</b></div><div><small style="color:#66779a">Titular</small><br><b>${c.name}</b></div><div><small style="color:#66779a">Número / referencia</small><br><b>${d.number}</b></div><div><small style="color:#66779a">NIT</small><br><b>${c.nit}</b></div><div><small style="color:#66779a">Fecha de expedición</small><br><b>${fdate(d.issued, true)}</b></div><div><small style="color:#66779a">Vigencia</small><br><b>${d.expires ? U.fmtDate(d.expires, true) : 'Sin vencimiento'}</b></div>${d.insured ? `<div><small style="color:#66779a">Valor asegurado</small><br><b>${U.money(d.insured)}</b></div>` : ''}<div><small style="color:#66779a">Páginas · Tamaño</small><br><b>${d.pages} págs. · ${d.size}</b></div></div><hr>
      <div class="ln" style="width:92%"></div><div class="ln" style="width:100%"></div><div class="ln" style="width:84%"></div><div class="ln" style="width:96%"></div><div class="ln" style="width:60%"></div><div class="seal">INN-LOCK<br>VERIFICADO</div></div>
      <div class="tx" style="margin-top:16px">${I('fingerprint')}<span class="h mono">SHA-256 · ${hash}</span></div><p class="muted" style="font-size:12.5px;margin-top:8px">La huella digital se anclará en la red Stellar cuando se active la integración (vista simulada).</p>`,
      footer: `<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" id="dl">${I('download')}Descargar</button>`, onMount: (m) => $('#dl', m).addEventListener('click', () => (LIVE ? openSigned('company-documents', d.filePath) : U.toast('Descarga simulada de «' + d.title + '»'))) });
  }
  function uploadDoc(c, d) {
    const needsDate = d.expires !== null || ['camara', 'poliza', 'fin'].includes(d.key);
    U.modal({ title: (docStatus(d) === 'vencido' ? 'Renovar' : 'Actualizar') + ' · ' + d.title, body: `<label class="drop" id="drop" for="file">${I('upload')}<b id="fname">Arrastra el archivo o haz clic para seleccionarlo</b><div style="font-size:12.5px;margin-top:4px">PDF, JPG o PNG · máx. 20 MB</div><input type="file" id="file" accept=".pdf,.jpg,.jpeg,.png" hidden></label>
      <div class="grid g-2" style="margin-top:16px;gap:14px"><div class="field" style="margin:0"><label for="num">Número / referencia</label><input class="input" id="num" value="${U.esc(d.number)}"></div>${needsDate ? `<div class="field" style="margin:0"><label for="exp">Nueva fecha de vencimiento</label><input class="input" id="exp" type="date" value="${new Date((LIVE ? Date.now() : D.DEMO_TODAY.getTime()) + (d.key === 'camara' ? 30 : 365) * 864e5).toISOString().slice(0, 10)}"></div>` : ''}</div>
      <div class="alert a-info" style="margin-top:16px">${I('info')}<p>El administrador validará el documento antes de que se actualice el estado de cumplimiento.</p></div>`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ok" disabled>${I('upload')}Cargar documento</button>`,
      onMount: (m, close) => {
        const fi = $('#file', m), ok = $('#ok', m); let name = '', size = '';
        fi.addEventListener('change', () => { const f = fi.files[0]; if (!f) return; name = f.name; size = (f.size / 1048576 >= 1 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB'); $('#fname', m).textContent = name + ' · ' + size; ok.disabled = false; });
        ['dragover', 'dragenter'].forEach((ev) => $('#drop', m).addEventListener(ev, (e) => { e.preventDefault(); $('#drop', m).classList.add('over'); }));
        ['dragleave', 'drop'].forEach((ev) => $('#drop', m).addEventListener(ev, () => $('#drop', m).classList.remove('over')));
        ok.addEventListener('click', () => {
          const exp = $('#exp', m);
          if (LIVE) { const f = fi.files[0]; if (!f) return; close(); act(() => window.Live.submitDocument(c, d, f, { number: $('#num', m).value.trim(), issuer: d.issuer, issued: new Date().toISOString().slice(0, 10), expires: exp ? exp.value : null }), state.user.role === 'admin' ? 'Documento actualizado y validado' : 'Documento cargado. Pendiente de validación.'); return; }
          d.pending = { file: name, size, number: $('#num', m).value || d.number, issued: new Date().toISOString().slice(0, 10), expires: exp ? exp.value : d.expires };
          if (state.user.role === 'admin') { applyPending(c, d); U.toast('Documento actualizado y validado'); } else { d.status = 'revision'; saveDoc(c, d); U.toast('Documento cargado. Pendiente de validación.'); }
          log('Cargó nueva versión de «' + d.title + '»', 'upload', state.pid); close(); refresh();
        });
      } });
  }
  function applyPending(c, d) { const x = d.pending; if (!x) return; d.number = x.number; d.issued = x.issued; d.expires = x.expires; d.file = x.file; d.size = x.size; delete d.pending; delete d.status; saveDoc(c, d); }
  function txModal(p, m) {
    const it = interv(p.interventor), c = company(p.constructora);
    U.modal({ title: 'Registro del desembolso', wide: true, body: `<div class="row row-wrap" style="gap:10px;margin-bottom:16px"><span class="net" style="background:var(--info-bg);color:var(--info);border-color:transparent">${I('link-2')}Stellar · Soroban</span><span class="badge b-warn">${I('info')}Simulado</span></div>
      <div class="grid g-2" style="gap:12px;margin-bottom:16px"><div class="fact"><small>${I('calendar')}Hito</small><b style="text-transform:capitalize">${m.label}</b></div><div class="fact"><small>${I('coins')}Monto liberado</small><b class="num">${U.money(tranche(p, m))}</b></div><div class="fact"><small>${I('calendar-check')}Fecha</small><b>${U.fmtDate(m.releasedOn)}</b></div><div class="fact"><small>${I('layers')}Ledger</small><b class="num">#${U.fmtN(m.ledger)}</b></div></div>
      <div class="eyebrow" style="margin-bottom:6px">Hash de transacción</div><div class="tx" style="margin-bottom:16px"><span class="h mono" style="white-space:normal;word-break:break-all">${m.tx}</span><button class="btn btn-ghost btn-sm" data-act="copy" data-v="${m.tx}" style="margin-left:auto">${I('copy')}</button></div>
      <div class="eyebrow" style="margin-bottom:10px">Firmas requeridas (multifirma 2 de 3)</div><div class="stack" style="gap:8px">${[[it.name, 'Interventor', 'clipboard-check'], ['Fiduciaria · ' + company(p.constructora).docs.find((d) => d.key === 'fiducia').issuer, 'Custodio', 'landmark'], ['Contrato inteligente INN-LOCK', 'Plataforma', 'blocks']].map((s) => `<div class="row" style="padding:10px 14px;border:1px solid var(--line);border-radius:14px"><span class="di ic-ok" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center">${I(s[2])}</span><div class="grow"><b style="font-size:14px">${s[0]}</b><div class="muted" style="font-size:12.5px">${s[1]}</div></div><span class="badge b-ok">${I('check')}Firmado</span></div>`).join('')}</div>
      <p class="muted" style="font-size:12.5px;margin-top:14px">Beneficiario: ${c.name}. Los registros reales se emitirán al integrar los contratos Soroban.</p>`, footer: `<button class="btn btn-ghost" data-close>Cerrar</button>` });
  }
  function approveModal(p, m) {
    const cm = compliance(company(p.constructora)), tr = tranche(p, m);
    const checks = ['Visité la obra y verifiqué las actividades del mes', 'La evidencia fotográfica corresponde al avance reportado', 'Los ensayos y controles de calidad están completos', 'El avance reportado coincide con el medido en sitio'];
    U.modal({ title: 'Aprobar hito · <span style="text-transform:capitalize">' + m.label + '</span>', body: cm.blocked.length ? `<div class="alert a-bad">${I('shield-alert')}<div><b>No se puede aprobar</b><p>${cm.blocked.map((d) => d.title).join(', ')} ${cm.blocked.length > 1 ? 'están vencidos' : 'está vencido'}. La constructora debe renovarlo antes de recibir el desembolso.</p></div></div>` :
      `${evOf(p, m).length ? `<div class="eyebrow" style="margin-bottom:8px">Evidencias enviadas (${evOf(p, m).length})</div>${evTiles(evOf(p, m), { view: [p.id, m.n] })}<div style="height:16px"></div>` : `<div class="alert a-warn" style="margin-bottom:16px">${I('info')}<p>El mes tiene ${m.photos} fotos y ${m.videos} videos archivados.</p></div>`}<div class="alert a-info" style="margin-bottom:16px">${I('coins')}<div><b>Se liberarán ${U.money(tr)}</b><p>${U.pct(m.tranchePct, 2)} del presupuesto de ${p.name}, a favor de ${company(p.constructora).short}.</p></div></div><div class="stack" style="gap:10px">${checks.map((t, i) => `<label class="check" style="padding:12px 14px;border:1px solid var(--line);border-radius:12px"><input type="checkbox" class="ck" data-i="${i}"> ${t}</label>`).join('')}</div><div class="field" style="margin:16px 0 0"><label for="note">Comentario del interventor (opcional)</label><textarea class="input" id="note" placeholder="Observaciones generales de la visita…"></textarea></div>`,
      footer: cm.blocked.length ? '<button class="btn btn-ghost" data-close>Entendido</button>' : `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-ok" id="go" disabled>${I('fingerprint')}Firmar y liberar desembolso</button>`,
      onMount: (mm, close) => {
        if (cm.blocked.length) return; const go = $('#go', mm), cks = $$('.ck', mm); cks.forEach((k) => k.addEventListener('change', () => { go.disabled = !cks.every((x) => x.checked); }));
        go.addEventListener('click', () => {
          go.innerHTML = I('loader', 'spin') + 'Firmando en la red…'; go.disabled = true;
          if (LIVE) { const note = $('#note', mm).value; close(); act(async () => { await window.Live.reviewMilestone(m, true, note, [true, true, true, true]); U.confetti(); }, 'Desembolso de ' + U.moneyM(tr) + ' liberado'); return; }
          setTimeout(() => {
            m.status = 'desembolsado'; m.tx = D.txHash(Date.now() % 100000); m.releasedOn = new Date().toISOString().slice(0, 10); m.ledger = 52000000 + (Date.now() % 90000);
            m.history = (m.history || []).concat([{ t: 'aprobado', by: 'interventor', text: $('#note', mm).value || 'Hito verificado en sitio. Desembolso autorizado.' }]); saveMonth(p, m);
            log('Aprobó el hito de ' + m.label + ' y liberó ' + U.moneyM(tr), 'check-circle-2', p.id); close(); U.confetti(); U.toast('Desembolso de ' + U.moneyM(tr) + ' liberado'); refresh();
          }, 1400);
        });
      } });
  }
  function observeModal(p, m) {
    U.modal({ title: 'Observar hito · <span style="text-transform:capitalize">' + m.label + '</span>', body: `<p class="muted" style="margin-bottom:14px">Describe lo que la constructora debe corregir. El hito volverá a su estado de ejecución.</p><div class="field" style="margin:0"><label for="obs">Observaciones</label><textarea class="input" id="obs" placeholder="Ej.: Falta el informe de ensayos de concreto del piso 12…"></textarea></div>`, footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-bad" id="go">${I('alert-triangle')}Enviar observaciones</button>`,
      onMount: (mm, close) => $('#go', mm).addEventListener('click', () => { const t = $('#obs', mm).value.trim(); if (t.length < 8) { U.toast('Describe brevemente las observaciones', 'err'); return; } if (LIVE) { close(); act(() => window.Live.reviewMilestone(m, false, t), 'Observaciones enviadas a la constructora'); return; } m.status = 'observado'; m.history = (m.history || []).concat([{ t: 'observado', by: 'interventor', text: t }]); saveMonth(p, m); log('Observó el hito de ' + m.label, 'alert-triangle', p.id); close(); U.toast('Observaciones enviadas a la constructora'); refresh(); }) });
  }
  function submitModal(p, m) {
    let items = evOf(p, m).slice(); const nImg = () => items.filter((x) => x.kind === 'img').length;
    U.modal({ title: 'Enviar a interventoría', wide: true, body: `<p class="muted" style="margin-bottom:14px">Adjunta las evidencias del mes de <b style="text-transform:capitalize">${m.label}</b>. El interventor las revisará antes de autorizar el desembolso.</p>
      <label class="drop" id="drop" for="ev">${I('camera')}<b>Arrastra o selecciona fotos, videos e informe técnico</b><div style="font-size:12.5px;margin-top:4px">Mínimo 3 fotos · hasta 8 fotos · videos y PDF opcionales</div><input type="file" id="ev" multiple accept="image/*,video/*,.pdf" hidden></label>
      <div id="ev-list" style="margin-top:16px"></div>
      <div class="field" style="margin:16px 0 0"><label for="rep">Resumen del mes</label><textarea class="input" id="rep" placeholder="Actividades ejecutadas, novedades y pendientes…"></textarea></div>`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="go" disabled>${I('send')}Enviar hito</button>`,
      onMount: (mm, close) => {
        const list = $('#ev-list', mm), go = $('#go', mm);
        function paint() { const n = nImg(); list.innerHTML = `<div class="row row-wrap" style="gap:8px;margin-bottom:10px"><span class="badge ${n >= 3 ? 'b-ok' : 'b-warn'}">${I('image')}${n} foto${n === 1 ? '' : 's'} (mín. 3)</span><span class="badge b-mute">${items.filter((x) => x.kind === 'video').length} video(s)</span><span class="badge b-mute">${items.filter((x) => x.kind === 'pdf').length} informe(s)</span></div>${items.length ? evTiles(items, { remove: true }) : ''}`; go.disabled = n < 3; }
        async function add(files) {
          for (const f of Array.from(files)) {
            try {
              if (/^image\//.test(f.type)) { if (nImg() >= 8) { U.toast('Máximo 8 fotos por hito', 'err'); continue; } items.push({ kind: 'img', name: f.name, size: KB(f.size), thumb: await fileThumb(f, 720, 0.6), file: f }); }
              else if (/^video\//.test(f.type) || /\.pdf$/i.test(f.name)) { if (items.filter((x) => x.kind !== 'img').length >= 5) { U.toast('Máximo 5 videos/informes', 'err'); continue; } items.push({ kind: /^video\//.test(f.type) ? 'video' : 'pdf', name: f.name, size: KB(f.size), file: f }); }
              else U.toast('«' + f.name + '» no es una imagen, video ni PDF', 'err');
            } catch (e) { U.toast('No se pudo leer «' + f.name + '»', 'err'); }
          }
          paint();
        }
        $('#ev', mm).addEventListener('change', (e) => { add(e.target.files); e.target.value = ''; });
        const dz = $('#drop', mm); ['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); })); ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('over'))); dz.addEventListener('drop', (e) => { e.preventDefault(); add(e.dataTransfer.files); });
        list.addEventListener('click', (e) => { const b = e.target.closest('[data-ev-rm]'); if (b) { items.splice(+b.dataset.evRm, 1); paint(); } });
        paint();
        go.addEventListener('click', () => {
          if (LIVE) { const summary = $('#rep', mm).value.trim(), list0 = items.slice(); close(); act(() => window.Live.submitMilestone(p, m, list0, summary, state.user.id), 'Hito enviado a interventoría'); return; }
          const prev = m.status; m.status = 'revision'; if (m.actualCum == null) m.actualCum = Math.max(0, m.plannedCum - p.drift);
          db.evidence[evKey(p, m)] = items; m.photos = nImg(); m.videos = items.filter((x) => x.kind === 'video').length; m.report = items.some((x) => x.kind === 'pdf');
          const t = $('#rep', mm).value.trim(); m.history = (m.history || []).concat([{ t: prev === 'observado' ? 'subsanado' : 'enviado', by: 'constructora', text: t || 'Evidencias del mes cargadas para revisión.' }]);
          const ok = saveMonth(p, m); log('Envió el hito de ' + m.label + ' a interventoría', 'send', p.id); close();
          U.toast(ok ? 'Hito enviado a interventoría' : 'Hito enviado, pero el navegador no tiene espacio para guardar todas las fotos', ok ? '' : 'err'); refresh();
        });
      } });
  }

  function certModal() {
    const u = state.user, p = proj();
    U.modal({ title: 'Certificado de protección', wide: true, body: `<div class="docview"><div class="wm">INN-LOCK</div><div style="text-align:center"><div style="width:62px;margin:0 auto 10px">${U.logoMark()}</div><h4 style="font-size:20px">CERTIFICADO DE PROTECCIÓN DE INVERSIÓN</h4></div><hr><p style="line-height:1.8">INN-LOCK certifica que <b>${u.name}</b> es titular de una inversión sobre el inmueble <b>${u.unit.code}</b> del proyecto <b>${p.name}</b> (${p.city}), con aportes de <b>${U.money(u.unit.paid)}</b>, los cuales permanecen en custodia y serán liberados a la constructora únicamente contra hitos de obra aprobados por interventoría independiente.</p><p style="margin-top:12px;color:#66779a">Expedido el ${U.fmtDate(D.DEMO_TODAY, true)} · Documento ilustrativo de la versión de demostración.</p><div class="seal">INN-LOCK<br>CERTIFICADO</div><div style="height:50px"></div></div>`, footer: `<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" onclick="window.print()">${I('download')}Imprimir</button>` });
  }

  /* ============ Eventos globales ============ */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]'); const a = t && t.dataset.act;
    if (!t) { if (!e.target.closest('.menu,.proj-btn,#bell,.user-btn')) closeMenus(); return; }
    const mo = (pid, n) => { const p = projById(pid); return [p, p.monthsData[+n - 1]]; };
    switch (a) {
      case 'toggle-pass': { const i = $('#pass'); i.type = i.type === 'password' ? 'text' : 'password'; t.innerHTML = I(i.type === 'password' ? 'eye' : 'eye-off'); break; }
      case 'forgot': e.preventDefault(); if (LIVE) liveForgot(); else U.toast('En la versión de demostración la contraseña es demo1234'); break;
      case 'go-demo': e.preventDefault(); try { localStorage.setItem('innlock.mode', 'demo'); } catch (x) { /* sin almacenamiento */ } location.href = location.pathname + '?demo=1'; break;
      case 'go-live': e.preventDefault(); try { localStorage.removeItem('innlock.mode'); } catch (x) { /* sin almacenamiento */ } location.href = location.pathname; break;
      case 'login-view': e.preventDefault(); renderLiveLogin(t.dataset.v); break;
      case 'stellar': U.toast('La conexión con billeteras Stellar llegará con la fase blockchain'); break;
      case 'open-menu': $('#sidebar').classList.add('open'); $('#scrim').classList.add('on'); break;
      case 'theme': state.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; store.set('innlock.theme', state.theme); applyTheme(); renderThemeBtn(); break;
      case 'projmenu': { const open = !$('.menu', $('#proj-switch')); closeMenus(); if (open) renderProjSwitch(true); break; }
      case 'pick-project': setProject(t.dataset.id); refresh(); break;
      case 'open-project': case 'goto-review': setProject(t.dataset.id); location.hash = a === 'goto-review' ? '#/obra' : '#/info'; break;
      case 'notif': {
        const box = $('#notif-box'), was = box.innerHTML; closeMenus(); if (was) break; const list = notifications(); db.read = list.length; persist(); updateBell();
        if (LIVE && window.Live.notifs.some((n) => n.unread)) window.Live.markNotificationsRead().then(() => { window.Live.notifs.forEach((n) => { n.unread = false; }); updateBell(); });
        box.innerHTML = `<div class="menu right notif"><div class="menu-head" style="padding:14px 16px 8px">Notificaciones</div>${list.length ? list.map((n) => `<a class="it" href="#/${n.r}" ${n.pid ? `data-act="goto-n" data-id="${n.pid}"` : ''}><span class="ico-wrap ${n.c}">${I(n.i)}</span><div><p>${n.t}</p><small>${n.s}</small></div></a>`).join('') : '<div class="empty">Sin notificaciones</div>'}</div>`; break;
      }
      case 'goto-n': setProject(t.dataset.id); break;
      case 'usermenu': { const box = $('#user-box'), was = box.innerHTML; closeMenus(); if (was) break; const u = state.user; box.innerHTML = `<div class="menu right" style="min-width:260px"><div style="padding:12px"><b>${u.name}</b><div class="muted" style="font-size:12.5px">${u.title}</div><div class="muted" style="font-size:12.5px">${u.email}</div></div><hr class="divider" style="margin:4px 0">${LIVE ? '' : '<button class="menu-item" data-act="reset-demo">' + I('refresh-cw') + 'Restablecer datos de demo</button>'}<button class="menu-item" data-act="logout">${I('log-out')}Cerrar sesión</button></div>`; break; }
      case 'logout': if (LIVE) { window.Live.signOut().finally(() => { state.user = null; location.hash = '#/login'; route(); }); } else { store.del('innlock.session'); state.user = null; location.hash = '#/login'; route(); } break;
      case 'reset-demo': store.del(KEY); U.toast('Datos restablecidos'); setTimeout(() => location.reload(), 600); break;
      case 'toggle-month': if (!e.target.closest('button,a')) t.classList.toggle('open'); break;
      case 'view-doc': { const c = company(t.dataset.c); docViewer(c, c.docs.find((d) => d.key === t.dataset.k)); break; }
      case 'upload-doc': { const c = company(t.dataset.c); uploadDoc(c, c.docs.find((d) => d.key === t.dataset.k)); break; }
      case 'validate-doc': { const c = company(t.dataset.c), d = c.docs.find((x) => x.key === t.dataset.k); if (LIVE) { act(() => window.Live.reviewDocument(d.submissionId, true), 'Documento validado'); break; } applyPending(c, d); log('Validó «' + d.title + '»', 'shield-check', state.pid); U.toast('Documento validado'); refresh(); break; }
      case 'download': if (LIVE && t.dataset.path) openSigned('project-plans', t.dataset.path); else U.toast('Descarga simulada de «' + t.dataset.n + '»'); break;
      case 'tx': txModal(...mo(t.dataset.id, t.dataset.n)); break;
      case 'approve-month': approveModal(...mo(t.dataset.id, t.dataset.n)); break;
      case 'observe-month': observeModal(...mo(t.dataset.id, t.dataset.n)); break;
      case 'submit-month': submitModal(...mo(t.dataset.id, t.dataset.n)); break;
      case 'cert': certModal(); break;
      case 'ev-view': evViewer(...mo(t.dataset.id, t.dataset.n), +t.dataset.i); break;
      case 'copy': navigator.clipboard && navigator.clipboard.writeText(t.dataset.v).then(() => U.toast('Hash copiado')).catch(() => {}); break;
      case 'invite': U.toast('Invitaciones disponibles al conectar el backend'); break;
    }
  });
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.pcard')) { e.preventDefault(); e.target.click(); } if (e.key === 'Escape') { closeMenus(); closeSidebar(); } });
  $('#scrim') || document.body.addEventListener('click', (e) => { if (e.target.id === 'scrim') closeSidebar(); });
  window.addEventListener('hashchange', route);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!state.theme) { applyTheme(); renderThemeBtn(); } });

  /* ============ Arranque ============ */
  const busy = (on) => { let b = $('#busy'); if (!b) { b = document.createElement('div'); b.id = 'busy'; b.className = 'busy-bar'; document.body.appendChild(b); } b.classList.toggle('on', on); };
  async function reload() { const u = await window.Live.load(); if (u) state.user = u; if (state.user) { ensurePid(); store.set('innlock.pid', state.pid); } refresh(); }
  async function act(fn, okMsg) {
    busy(true);
    try { await fn(); if (okMsg) U.toast(okMsg); await reload(); return true; }
    catch (e) { U.toast(e.message || 'No se pudo completar la acción', 'err'); try { await reload(); } catch (x) { /* sin conexión */ } return false; }
    finally { busy(false); }
  }
  state.pid = store.get('innlock.pid', null);
  const W = window.Wizard.init({ state, db, persist, company, interv, compliance, docStatus, badge, DST, DICON, INTERVENTORES, PROJECTS, projById, log, setProject, refresh, saveMonth, LIVE, live: LIVE ? window.Live : null, reload, act });
  Object.assign(ROUTES, W.views);
  if (LIVE) { const A = window.Admin.init({ state, act, reload }); ROUTES.usuarios = A.view; }

  (async function boot() {
    if (LIVE) {
      root.innerHTML = `<div class="boot">${U.logoMark()}<p>Cargando…</p></div>`;
      window.Live.onAuth((evt) => {
        if (evt === 'PASSWORD_RECOVERY') setTimeout(recoveryModal, 300);
        if (evt === 'SIGNED_OUT' && state.user) { state.user = null; location.hash = '#/login'; route(); }
        if (evt === 'SIGNED_IN' && !state.user) window.Live.load().then((u) => { if (u) { state.user = u; ensurePid(); location.hash = '#/panel'; route(); } }).catch(() => {});
      });
      try { const u = await window.Live.load(); if (u) state.user = u; } catch (e) { console.error(e); setTimeout(() => U.toast(e.message || 'No se pudo cargar tu información', 'err'), 300); }
    } else {
      const sid = store.get('innlock.session', null);
      if (sid) state.user = USERS.find((x) => x.id === sid) || null;
    }
    if (state.user) { ensurePid(); store.set('innlock.pid', state.pid); }
    applyTheme(); route();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  })();
})();
