/* INN-LOCK · Registro de proyectos por la constructora (asistente), importación de cronograma
   y flujo de aprobación (interventor → administrador). Datos simulados en el navegador. */
(function () {
  'use strict';
  const D = window.INNLOCK, U = window.UI, I = U.icon, S = window.SCHED, PHASES = D.PHASES;
  const esc = U.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const STAGES = {
    interventor: { l: 'En revisión de interventoría', c: 'b-warn', i: 'clipboard-check' },
    admin: { l: 'En validación de la plataforma', c: 'b-info', i: 'shield-check' },
    observado: { l: 'Con observaciones', c: 'b-bad', i: 'alert-triangle' },
    activo: { l: 'En construcción', c: 'b-ok', i: 'check-circle-2' }
  };
  const PH_COLORS = ['#12A8F0', '#1450C8', '#0B2A6F', '#7C6BE0', '#FF9A00', '#FFC72C', '#0E9F6E'];
  const AMEN = ['Piscina', 'Gimnasio', 'Salón social', 'Coworking', 'Zona BBQ', 'Parque infantil', 'Pet park', 'Bicicletero', 'Seguridad 24/7', 'Terraza panorámica', 'Cancha múltiple', 'Spa y sauna', 'Lobby con concierge', 'Parqueadero de visitantes'];
  const STEPS = [['Datos del proyecto', 'home'], ['Documentación', 'file-check-2'], ['Presupuesto y cronograma', 'calendar'], ['Resumen y envío', 'send']];
  const TPL_X = 'assets/plantilla/INN-LOCK_Plantilla_Cronograma.xlsx', TPL_C = 'assets/plantilla/INN-LOCK_Plantilla_Cronograma.csv';
  let ctx = null, F = null, saveT = null, FILES = {};

  /* ============ construcción de proyecto ============ */
  const hashId = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 997 + 3; };
  const num = (v) => (v === '' || v == null || isNaN(+v) ? 0 : +v);
  function buildMonths(p, rows) {
    const rand = U.rng(p.seed); let cum = 0;
    return rows.map((r, i) => {
      const ph = PHASES.find((x) => x.key === r.phase) || PHASES[0], date = D.addMonths(new Date(p.start + 'T12:00:00'), i);
      cum += +r.pct;
      return { n: i + 1, phase: ph.key, phaseName: ph.name, icon: ph.icon, label: D.MONTH_NAMES[date.getMonth()] + ' ' + date.getFullYear(), year: date.getFullYear(), month: date.getMonth(), tranchePct: +r.pct,
        activities: String(r.acts || '').split(/[;|\n]/).map((x) => x.trim()).filter(Boolean), deviation: (rand() - 0.5) * 2, photos: 0, videos: 0,
        plannedCum: Math.min(100, S.round2(cum)), status: i === 0 ? 'en_curso' : 'pendiente', reviewer: p.interventor };
    });
  }
  function build(form, id, reg) {
    const seed = hashId(id), types = (form.typologies || []).filter((t) => t.name && num(t.area) > 0 && num(t.price) > 0), areas = types.map((t) => num(t.area)), n = form.rows.length;
    const p = { id, seed, isNew: true, name: form.name.trim(), tagline: form.tagline.trim() || `${num(form.towers)} ${num(form.towers) > 1 ? 'torres' : 'torre'} en ${form.zone.trim()}, ${form.city.trim()}`,
      city: form.city.trim(), zone: form.zone.trim(), address: form.address.trim(), lat: null, lng: null, constructora: form.company, interventor: form.interventor, status: STAGES[reg.stage].l,
      description: form.description.trim(), towers: num(form.towers), floors: num(form.floors), units: num(form.units), sold: 0, parking: num(form.parking),
      area: areas.length ? (Math.min(...areas) === Math.max(...areas) ? Math.min(...areas) + ' m²' : Math.min(...areas) + ' – ' + Math.max(...areas) + ' m²') : '—', priceFrom: types.length ? Math.min(...types.map((t) => num(t.price))) : 0, strata: num(form.strata) || 5,
      budget: num(form.budget), start: form.start, months: n, currentMonth: 1, pendingReview: false, drift: 0.5, amenities: form.amenities.slice(), typologies: types.map((t) => ({ name: t.name, area: num(t.area), beds: num(t.beds), baths: num(t.baths), parking: num(t.parking), price: num(t.price) })),
      planos: form.planos.filter((x) => x.file).map((x) => ({ name: x.name, n: num(x.n), v: x.v || '1.0', date: (reg.submittedOn || new Date().toISOString()).slice(0, 10), size: x.size || '—' })),
      scene: { sky: seed % 3, floors: Math.max(8, Math.min(18, num(form.floors) || 12)), towers: Math.max(1, Math.min(3, num(form.towers) || 1)) }, photo: form.photo || null, lic: form.lic, fidu: form.fidu, reg, form };
    p.end = D.addMonths(new Date(p.start + 'T12:00:00'), n).toISOString().slice(0, 10);
    p.monthsData = buildMonths(p, form.rows);
    return p;
  }
  function hydrate(db, PROJECTS) {
    db.projects = db.projects || {}; db.drafts = db.drafts || {};
    Object.entries(db.projects).forEach(([id, rec]) => { if (!PROJECTS.some((x) => x.id === id)) { try { PROJECTS.push(build(rec.form, id, rec.reg)); } catch (e) { /* registro dañado */ } } });
  }

  /* ============ formulario ============ */
  const blank = (u) => ({ company: u.company, name: '', tagline: '', city: '', zone: '', address: '', description: '', towers: 1, floors: '', units: '', parking: '', strata: 5, amenities: [],
    typologies: [{ name: '', area: '', beds: 2, baths: 2, parking: 1, price: '' }], photo: null, interventor: ctx && ctx.INTERVENTORES.length ? ctx.INTERVENTORES[0].id : 'i1', lic: { number: '', issuer: '', expires: '' }, fidu: { issuer: '', number: '' },
    planos: [{ key: 'arq', name: 'Planos arquitectónicos', n: '', v: '1.0', file: '', size: '' }, { key: 'est', name: 'Planos estructurales', n: '', v: '1.0', file: '', size: '' }, { key: 'hid', name: 'Planos hidrosanitarios', n: '', v: '1.0', file: '', size: '' }, { key: 'ele', name: 'Planos eléctricos y de datos', n: '', v: '1.0', file: '', size: '' }],
    start: '', budget: '', rows: [], step: 1, confirm: false, editId: null });
  const sample = (u) => Object.assign(blank(u), { name: 'Parque Sur Residencial', tagline: 'Vivienda de diseño junto al parque de Envigado', city: 'Medellín', zone: 'Envigado', address: 'Cl. 37 Sur # 27 - 85',
    description: 'Dos torres de 20 pisos con apartamentos de 56 a 98 m², balcones amplios y zonas sociales de 3.000 m². A cinco minutos del centro comercial y de la estación del metro.', towers: 2, floors: 20, units: 160, parking: 190, strata: 5,
    amenities: ['Piscina', 'Gimnasio', 'Salón social', 'Coworking', 'Zona BBQ', 'Seguridad 24/7'],
    typologies: [{ name: 'Tipo A · 2 alcobas', area: 56, beds: 2, baths: 2, parking: 1, price: 410000000 }, { name: 'Tipo B · 3 alcobas', area: 78, beds: 3, baths: 2, parking: 2, price: 560000000 }, { name: 'Tipo C · 3 alcobas + estudio', area: 98, beds: 3, baths: 3, parking: 2, price: 720000000 }],
    lic: { number: 'LC-2026-1190', issuer: 'Curaduría Urbana 2 Medellín', expires: '2028-09-30' }, fidu: { issuer: 'Fiduciaria Andina', number: 'FA-PA-2026-204' },
    planos: [{ key: 'arq', name: 'Planos arquitectónicos', n: 22, v: '1.0', file: 'arquitectonicos_v1.pdf', size: '19.2 MB' }, { key: 'est', name: 'Planos estructurales', n: 12, v: '1.0', file: 'estructurales_v1.pdf', size: '11.4 MB' }, { key: 'hid', name: 'Planos hidrosanitarios', n: 7, v: '1.0', file: 'hidrosanitarios_v1.pdf', size: '5.9 MB' }, { key: 'ele', name: 'Planos eléctricos y de datos', n: 8, v: '1.0', file: 'electricos_v1.pdf', size: '7.2 MB' }],
    start: '2026-12-01', budget: 29500000000, rows: S.suggest(22), step: 1 });
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), F);
  function set(path, v) { const k = path.split('.'), last = k.pop(), o = k.reduce((x, y) => x[y], F); o[last] = v; }
  const saveDraft = () => { clearTimeout(saveT); saveT = setTimeout(() => { if (!F || F.editId) return; ctx.db.drafts[ctx.state.user.id] = F; ctx.persist(); }, 350); };
  function load() {
    const u = ctx.state.user; ctx.db.drafts = ctx.db.drafts || {};
    if (!F || F.company !== u.company) F = ctx.db.drafts[u.id] ? JSON.parse(JSON.stringify(ctx.db.drafts[u.id])) : blank(u);
    if (F.rows == null) F.rows = [];
  }
  const fmtM = (n) => (n ? '$ ' + U.fmtN(n) : '');

  /* ============ validación por paso ============ */
  function checkStep(n) {
    const e = [], c = ctx.company(F.company);
    if (n === 1) {
      if (F.name.trim().length < 3) e.push('Escribe el nombre del proyecto.');
      if (!F.city.trim()) e.push('Indica la ciudad.'); if (!F.zone.trim()) e.push('Indica el barrio o zona.'); if (!F.address.trim()) e.push('Indica la dirección.');
      if (F.description.trim().length < 40) e.push('La descripción debe tener al menos 40 caracteres.');
      if (!(num(F.towers) >= 1)) e.push('Indica el número de torres.'); if (!(num(F.floors) >= 1)) e.push('Indica los pisos por torre.'); if (!(num(F.units) >= 1)) e.push('Indica el total de unidades.');
      if (!F.typologies.some((t) => t.name && num(t.area) > 0 && num(t.price) > 0)) e.push('Agrega al menos una tipología con nombre, área y precio.');
      if (!F.interventor) e.push('Selecciona el interventor.');
    }
    if (n === 2) {
      if (ctx.compliance(c).blocked.length) e.push('La documentación legal de la constructora tiene documentos vencidos. Renuévalos antes de continuar.');
      if (!F.lic.number.trim() || !F.lic.issuer.trim()) e.push('Completa el número y la entidad de la licencia de construcción.');
      else if (!F.lic.expires || U.daysTo(F.lic.expires) < 0) e.push('La licencia de construcción debe tener una fecha de vencimiento vigente.');
      if (!F.fidu.issuer.trim() || !F.fidu.number.trim()) e.push('Completa los datos del encargo fiduciario.');
      F.planos.slice(0, 2).forEach((x) => { if (!x.file || !(num(x.n) > 0)) e.push(`Carga el archivo y las láminas de «${x.name}».`); });
    }
    if (n === 3) { const v = S.validate({ rows: F.rows, start: F.start, budget: num(F.budget) }); v.errors.forEach((x) => e.push(x.msg)); }
    if (n === 4 && !F.confirm) e.push('Debes aceptar la declaración para enviar el proyecto.');
    return e;
  }

  /* ============ vistas ============ */
  const field = (label, path, o) => { o = o || {}; const v = get(path); return `<div class="field" style="${o.style || ''}"><label for="f-${path}">${label}${o.req ? ' <span style="color:var(--bad)">*</span>' : ''}</label>${o.area ? `<textarea class="input" id="f-${path}" data-f="${path}" rows="4" placeholder="${o.ph || ''}">${esc(v)}</textarea>` : `<input class="input" id="f-${path}" data-f="${path}" ${o.t ? `data-t="${o.t}"` : ''} type="${o.type || 'text'}" ${o.min != null ? `min="${o.min}"` : ''} ${o.step ? `step="${o.step}"` : ''} ${o.type === 'text' || !o.type ? '' : ''} value="${esc(o.t === 'money' && v ? U.fmtN(v) : v)}" placeholder="${o.ph || ''}" ${o.t === 'money' ? 'inputmode="numeric"' : ''}>`}${o.hint ? `<div class="muted" style="font-size:12.5px;margin-top:5px" ${o.hintId ? `id="${o.hintId}"` : ''}>${o.hint}</div>` : ''}</div>`; };
  const stepper = () => `<ol class="stepper">${STEPS.map((s, i) => { const n = i + 1, st = n < F.step ? 'done' : n === F.step ? 'on' : ''; return `<li class="${st}"><button type="button" data-w="goto" data-n="${n}" ${n > F.step ? 'tabindex="-1"' : ''}><span class="sn">${n < F.step ? I('check') : n}</span><span class="sl">${s[0]}</span></button></li>`; }).join('')}</ol>`;

  function step1() {
    const itv = ctx.INTERVENTORES.find((x) => x.id === F.interventor);
    return `<div class="grid g-2" style="align-items:start">
      <div class="stack">
        <div class="card card-pad"><div class="card-head"><div><h3>Información general</h3><div class="sub">Lo primero que verán los compradores</div></div></div>
          ${field('Nombre del proyecto', 'name', { req: 1, ph: 'Ej.: Torres del Parque' })}${field('Eslogan (opcional)', 'tagline', { ph: 'Una frase corta que describa el proyecto' })}
          <div class="grid g-2" style="gap:0 14px">${field('Ciudad', 'city', { req: 1, ph: 'Medellín' })}${field('Barrio o zona', 'zone', { req: 1, ph: 'El Poblado' })}</div>
          ${field('Dirección', 'address', { req: 1, ph: 'Cra. 43A # 12 Sur - 50' })}
          ${field('Descripción', 'description', { req: 1, area: 1, ph: 'Cuenta qué hace especial al proyecto: ubicación, tipo de vivienda, zonas sociales…', hint: `<span id="desc-count">${F.description.trim().length}</span> caracteres (mínimo 40)` })}</div>
        <div class="card card-pad"><div class="card-head"><div><h3>Características</h3></div></div>
          <div class="grid g-2" style="gap:0 14px">${field('Torres', 'towers', { t: 'int', type: 'number', min: 1, req: 1 })}${field('Pisos por torre', 'floors', { t: 'int', type: 'number', min: 1, req: 1 })}${field('Unidades totales', 'units', { t: 'int', type: 'number', min: 1, req: 1 })}${field('Parqueaderos', 'parking', { t: 'int', type: 'number', min: 0 })}</div>
          <div class="field" style="max-width:200px"><label for="f-strata">Estrato</label><select class="input" id="f-strata" data-f="strata" data-t="int">${[1, 2, 3, 4, 5, 6].map((s) => `<option ${+F.strata === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
      </div>
      <div class="stack">
        <div class="card card-pad"><div class="card-head"><div><h3>Foto del proyecto</h3><div class="sub">Render o fotografía de la fachada</div></div></div>
          <div class="photo-box" id="photo-box">${F.photo ? `<img src="${F.photo}" alt="Foto del proyecto">` : `<div class="empty" style="padding:30px 10px">${I('image')}Sin foto. Se mostrará una ilustración automática.</div>`}</div>
          <div class="row row-wrap" style="margin-top:14px"><label class="btn btn-soft btn-sm" for="f-photo">${I('upload')}${F.photo ? 'Cambiar foto' : 'Subir foto'}</label><input type="file" id="f-photo" data-file="photo" accept="image/*" hidden>${F.photo ? `<button type="button" class="btn btn-ghost btn-sm" data-w="photo-clear">${I('x')}Quitar</button>` : ''}</div></div>
        <div class="card card-pad"><div class="card-head"><div><h3>Interventor</h3><div class="sub">Profesional independiente que audita la obra</div></div></div>
          <div class="field"><label for="f-interventor">Interventor certificado</label><select class="input" id="f-interventor" data-f="interventor">${ctx.INTERVENTORES.map((x) => `<option value="${x.id}" ${F.interventor === x.id ? 'selected' : ''}>${x.name} · ${x.firm}</option>`).join('')}</select></div>
          <div class="alert a-info">${I('info')}<p>${itv.license}. INN-LOCK confirma la independencia del interventor respecto a la constructora antes de activar el proyecto.</p></div></div>
      </div>
      <div class="card card-pad" style="grid-column:1/-1"><div class="card-head"><div><h3>Tipologías</h3><div class="sub">Tipos de apartamento y precio de venta desde</div></div><button type="button" class="btn btn-soft btn-sm" data-w="typ-add" ${F.typologies.length >= 6 ? 'disabled' : ''}>${I('plus')}Agregar tipología</button></div>
        <div class="typ-head"><span>Nombre</span><span>Área m²</span><span>Alcobas</span><span>Baños</span><span>Parq.</span><span>Precio desde (COP)</span><span></span></div>
        ${F.typologies.map((t, i) => `<div class="typ-row"><input class="input sm" aria-label="Nombre" data-f="typologies.${i}.name" placeholder="Tipo A · 2 alcobas" value="${esc(t.name)}"><input class="input sm" aria-label="Área" type="number" min="0" data-t="num" data-f="typologies.${i}.area" value="${esc(t.area)}"><input class="input sm" aria-label="Alcobas" type="number" min="0" data-t="int" data-f="typologies.${i}.beds" value="${esc(t.beds)}"><input class="input sm" aria-label="Baños" type="number" min="0" data-t="int" data-f="typologies.${i}.baths" value="${esc(t.baths)}"><input class="input sm" aria-label="Parqueaderos" type="number" min="0" data-t="int" data-f="typologies.${i}.parking" value="${esc(t.parking)}"><input class="input sm" aria-label="Precio" inputmode="numeric" data-t="money" data-f="typologies.${i}.price" placeholder="485.000.000" value="${t.price ? U.fmtN(t.price) : ''}"><button type="button" class="icon-btn" data-w="typ-del" data-i="${i}" aria-label="Quitar" ${F.typologies.length <= 1 ? 'disabled style="opacity:.3"' : ''}>${I('x')}</button></div>`).join('')}</div>
      <div class="card card-pad" style="grid-column:1/-1"><div class="card-head"><div><h3>Zonas comunes y amenidades</h3><div class="sub">Elige las que aplican o agrega otras</div></div></div>
        <div class="row row-wrap" style="gap:8px" id="amen">${amenChips()}</div>
        <div class="row" style="margin-top:14px;max-width:420px"><input class="input sm" id="amen-new" placeholder="Otra amenidad…" maxlength="40"><button type="button" class="btn btn-soft btn-sm" data-w="amen-add">${I('plus')}Agregar</button></div></div>
    </div>`;
  }
  const amenChips = () => AMEN.concat(F.amenities.filter((a) => !AMEN.includes(a))).map((a) => `<button type="button" class="chip pick ${F.amenities.includes(a) ? 'on' : ''}" data-w="amen-toggle" data-v="${esc(a)}" aria-pressed="${F.amenities.includes(a)}">${I(F.amenities.includes(a) ? 'check' : 'plus')}${esc(a)}</button>`).join('');

  function step2() {
    const c = ctx.company(F.company), cm = ctx.compliance(c);
    return `<div class="grid g-2" style="align-items:start">
      <div class="card card-pad"><div class="card-head"><div><h3>Documentación de la constructora</h3><div class="sub">Se toma de tu perfil legal · ${cm.ok} de ${cm.total} obligatorios vigentes</div></div><a class="btn btn-ghost btn-sm" href="#/legal">${I('file-check-2')}Gestionar</a></div>
        ${cm.blocked.length ? `<div class="alert a-bad" style="margin-bottom:14px">${I('shield-alert')}<p>Hay documentos vencidos. Renuévalos en «Constructora y legal» antes de enviar el proyecto.</p></div>` : ''}
        <div class="stack" style="gap:10px">${c.docs.filter((d) => d.req && d.key !== 'planos' && d.key !== 'licencia').map((d) => { const s = ctx.docStatus(d); return `<div class="row" style="padding:12px 14px;border:1px solid var(--line);border-radius:14px"><span class="di ${s === 'vigente' ? 'ic-ok' : s === 'por_vencer' ? 'ic-gold' : 'ic-bad'}" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex:none">${I(ctx.DICON[d.key] || 'file-text')}</span><div class="grow"><b style="font-size:14px">${d.title}</b><div class="muted" style="font-size:12.5px">${d.expires ? 'Vence ' + U.fmtDate(d.expires) : 'Sin vencimiento'}</div></div>${ctx.badge(ctx.DST, s)}</div>`; }).join('')}</div></div>
      <div class="stack">
        <div class="card card-pad"><div class="card-head"><div><h3>Licencia de construcción</h3><div class="sub">Específica de este proyecto</div></div></div>
          ${field('Número de licencia', 'lic.number', { req: 1, ph: 'LC-2026-0000' })}${field('Entidad que la expidió', 'lic.issuer', { req: 1, ph: 'Curaduría Urbana 2 Medellín' })}${field('Vence el', 'lic.expires', { req: 1, type: 'date' })}</div>
        <div class="card card-pad"><div class="card-head"><div><h3>Encargo fiduciario</h3><div class="sub">Patrimonio autónomo que custodia los fondos</div></div></div>
          ${field('Fiduciaria', 'fidu.issuer', { req: 1, ph: 'Fiduciaria Andina' })}${field('N° de contrato', 'fidu.number', { req: 1, ph: 'FA-PA-2026-000' })}</div>
      </div>
      <div class="card card-pad" style="grid-column:1/-1"><div class="card-head"><div><h3>Planos del proyecto</h3><div class="sub">Arquitectónicos y estructurales son obligatorios · PDF o DWG · máx. 50 MB</div></div></div>
        <div class="table-wrap"><table class="plano-table"><thead><tr><th>Conjunto de planos</th><th style="width:110px">Láminas</th><th style="width:110px">Versión</th><th>Archivo</th></tr></thead><tbody>${F.planos.map((x, i) => `<tr><td><b>${x.name}</b> ${i < 2 ? '<span class="badge b-warn" style="margin-left:6px">Obligatorio</span>' : '<span class="badge b-mute" style="margin-left:6px">Recomendado</span>'}</td><td><input class="input sm" type="number" min="0" data-t="int" data-f="planos.${i}.n" value="${esc(x.n)}" aria-label="Láminas"></td><td><input class="input sm" data-f="planos.${i}.v" value="${esc(x.v)}" aria-label="Versión"></td><td><div class="row"><label class="btn ${x.file ? 'btn-ghost' : 'btn-soft'} btn-sm" for="pl-${i}">${I(x.file ? 'check-circle-2' : 'upload')}${x.file ? 'Cambiar' : 'Subir'}</label><input type="file" id="pl-${i}" data-file="plano" data-i="${i}" accept=".pdf,.dwg,.zip" hidden><span class="muted" style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px">${x.file ? esc(x.file) + ' · ' + esc(x.size) : 'Sin archivo'}</span></div></td></tr>`).join('')}</tbody></table></div></div>
    </div>`;
  }

  function schedRow(r, i) {
    return `<tr data-i="${i}"><td class="num" style="text-align:center"><b>${i + 1}</b></td><td id="ml-${i}" style="white-space:nowrap;text-transform:capitalize">${mlabel(i)}</td>
      <td><select class="input sm" data-f="rows.${i}.phase" aria-label="Fase mes ${i + 1}">${PHASES.map((p) => `<option value="${p.key}" ${r.phase === p.key ? 'selected' : ''}>${p.name}</option>`).join('')}</select></td>
      <td><input class="input sm num" type="number" step="0.01" min="0" max="100" data-t="num" data-f="rows.${i}.pct" value="${esc(r.pct)}" aria-label="Porcentaje mes ${i + 1}"></td>
      <td class="num" id="rm-${i}" style="white-space:nowrap"></td><td class="num" id="ra-${i}" style="white-space:nowrap"></td>
      <td><input class="input sm" data-f="rows.${i}.acts" value="${esc(r.acts)}" placeholder="Actividades del mes (separa con ;)" aria-label="Actividades mes ${i + 1}"></td>
      <td><button type="button" class="icon-btn" data-w="row-del" data-i="${i}" aria-label="Quitar mes ${i + 1}">${I('x')}</button></td></tr>`;
  }
  function mlabel(i) { if (!F.start) return '—'; const d = D.addMonths(new Date(F.start + 'T12:00:00'), i); return D.MONTH_NAMES[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); }
  function step3() {
    return `<div class="card card-pad" style="margin-bottom:20px"><div class="card-head"><div><h3>Cómo quieres armar el cronograma</h3><div class="sub">Define cada mes de obra y el porcentaje del presupuesto que se desembolsa al aprobarse</div></div></div>
      <div class="grid g-3 opt3">
        <div class="opt">${I('pen-line')}<b>1 · En pantalla</b><span>Edita la tabla de abajo mes a mes, o parte de una sugerencia automática.</span></div>
        <div class="opt">${I('download')}<b>2 · Con nuestra plantilla</b><span>Descarga el Excel, diligéncialo y súbelo. Incluye guía, ejemplo y validaciones.</span><div class="row row-wrap" style="margin-top:12px"><a class="btn btn-primary btn-sm" href="${TPL_X}" download>${I('download')}Plantilla Excel</a><a class="btn btn-ghost btn-sm" href="${TPL_C}" download>CSV</a></div></div>
        <div class="opt">${I('upload')}<b>3 · Importar archivo</b><span>Sube tu Excel o CSV ya diligenciado; lo revisamos antes de cargarlo.</span><div style="margin-top:12px"><label class="btn btn-gold btn-sm" for="f-import">${I('upload')}Importar archivo</label><input type="file" id="f-import" data-file="import" accept=".xlsx,.csv,.txt" hidden></div></div>
      </div></div>
    <div class="card card-pad" style="margin-bottom:20px"><div class="grid g-3" style="gap:0 14px">${field('Fecha de inicio de obra', 'start', { type: 'date', req: 1 })}${field('Presupuesto total de obra (COP)', 'budget', { t: 'money', req: 1, ph: '38.400.000.000', hint: F.budget ? '= ' + U.moneyM(num(F.budget)) : 'Valor total que se custodia y se desembolsa por hitos', hintId: 'budget-hint' })}
      <div class="field"><label for="sched-n">Generar sugerencia automática</label><div class="row"><input class="input" id="sched-n" type="number" min="6" max="60" value="${F.rows.length || 24}" style="max-width:110px" aria-label="Meses"><button type="button" class="btn btn-soft" data-w="sched-suggest">${I('sparkles')}Generar</button></div><div class="muted" style="font-size:12.5px;margin-top:5px">Meses de duración (6 a 60). Reemplaza la tabla actual.</div></div></div></div>
    <div class="sched-grid"><div class="card card-pad" style="min-width:0"><div class="card-head"><div><h3>Hitos mensuales</h3><div class="sub" id="sched-sub"></div></div><div class="row row-wrap"><button type="button" class="btn btn-ghost btn-sm" data-w="row-equal">Repartir en partes iguales</button><button type="button" class="btn btn-ghost btn-sm" data-w="row-fix">Ajustar al 100 %</button><button type="button" class="btn btn-soft btn-sm" data-w="row-add" ${F.rows.length >= 60 ? 'disabled' : ''}>${I('plus')}Agregar mes</button></div></div>
        ${F.rows.length ? `<div class="table-wrap"><table class="sched-table"><thead><tr><th>#</th><th>Mes</th><th style="min-width:200px">Fase de obra</th><th style="width:110px">% presup.</th><th>Desembolso</th><th>Acumulado</th><th style="min-width:260px">Actividades</th><th></th></tr></thead><tbody id="sched-body">${F.rows.map(schedRow).join('')}</tbody></table></div>` : `<div class="empty">${I('calendar')}<b>Aún no hay hitos</b><p>Genera una sugerencia, agrega meses o importa tu archivo.</p></div>`}</div>
      <aside class="sched-side"><div class="card card-pad" id="sched-side"></div></aside></div>`;
  }
  function planChart(rows) {
    const W = 360, H = 170, L = 30, R = 8, T = 10, B = 34, n = rows.length; if (!n) return '';
    const X = (i) => L + ((W - L - R) * i) / n, Y = (v) => T + (H - T - B) * (1 - v / 100); let cum = 0; const pts = [[0, 0]];
    rows.forEach((r, i) => { cum += +r.pct || 0; pts.push([i + 1, Math.min(cum, 130)]); });
    const line = pts.map((q, i) => (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(Math.min(q[1], 100)).toFixed(1)).join(' ');
    let o = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Avance planificado acumulado">`;
    [0, 50, 100].forEach((v) => { o += `<line class="grid-l" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}%</text>`; });
    o += `<path d="${line} L${X(n)} ${Y(0)} L${X(0)} ${Y(0)}Z" fill="#12A8F0" opacity=".18"/><path d="${line}" fill="none" stroke="#1450C8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    rows.forEach((r, i) => { const k = PHASES.findIndex((p) => p.key === r.phase); o += `<rect x="${X(i) + 0.5}" y="${H - B + 12}" width="${Math.max(1, (W - L - R) / n - 1)}" height="9" rx="2" fill="${PH_COLORS[k < 0 ? 0 : k]}"><title>Mes ${i + 1} · ${(PHASES[k] || {}).name || ''} · ${r.pct}%</title></rect>`; });
    return o + `<text x="${L}" y="${H - 2}">Inicio</text><text x="${W - R}" y="${H - 2}" text-anchor="end">Mes ${n}</text></svg>`;
  }
  function updateSched() {
    const side = $('#sched-side'); if (!side) return;
    const budget = num(F.budget), v = S.validate({ rows: F.rows, start: F.start, budget }), rowErr = new Set(v.errors.filter((e) => e.row != null).map((e) => e.row));
    let cum = 0;
    F.rows.forEach((r, i) => { cum += +r.pct || 0; const m = $('#ml-' + i), a = $('#rm-' + i), b = $('#ra-' + i), tr = $(`tr[data-i="${i}"]`); if (m) m.textContent = mlabel(i); if (a) a.textContent = budget ? U.moneyM(budget * (+r.pct || 0) / 100) : '—'; if (b) b.textContent = S.round2(cum).toLocaleString('es-CO') + ' %'; if (tr) tr.classList.toggle('bad', rowErr.has(i)); });
    const sub = $('#sched-sub'); if (sub) sub.textContent = `${F.rows.length} meses · tope por hito ${v.cap} %`;
    const ok = Math.abs(v.total - 100) <= 0.01, over = v.total > 100.01;
    const byPh = PHASES.map((p, k) => ({ p, k, rows: F.rows.filter((r) => r.phase === p.key) })).filter((x) => x.rows.length);
    side.innerHTML = `<div class="eyebrow">Control del presupuesto</div><div class="row between" style="margin:6px 0 10px;align-items:flex-end"><div class="num" style="font-size:34px;font-weight:800;letter-spacing:-.03em;color:var(--${ok ? 'ok' : 'bad'})">${v.total.toLocaleString('es-CO')} %</div><span class="badge ${ok ? 'b-ok' : 'b-bad'}">${I(ok ? 'check-circle-2' : 'alert-triangle')}${ok ? 'Suma 100 %' : over ? 'Sobran ' + S.round2(v.total - 100).toLocaleString('es-CO') : 'Faltan ' + S.round2(100 - v.total).toLocaleString('es-CO')}</span></div>
      <div class="bar ${ok ? 'ok' : 'bad'}"><i style="width:${Math.min(100, v.total)}%"></i></div>
      <div style="margin-top:18px">${planChart(F.rows)}</div>
      <div class="legend" style="margin:6px 0 14px;font-size:12px">${byPh.map((x) => `<span><i style="background:${PH_COLORS[x.k]}"></i>${x.p.name.split(' ')[0]} · ${x.rows.length}m · ${S.round2(x.rows.reduce((s, r) => s + (+r.pct || 0), 0))}%</span>`).join('')}</div>
      ${v.errors.length ? `<div class="alert a-bad" style="padding:12px 14px"><div><b>${v.errors.length} punto${v.errors.length > 1 ? 's' : ''} por corregir</b><ul class="err-list">${v.errors.slice(0, 6).map((e) => `<li>${esc(e.msg)}</li>`).join('')}${v.errors.length > 6 ? `<li>…y ${v.errors.length - 6} más</li>` : ''}</ul></div></div>` : `<div class="alert a-ok" style="padding:12px 14px">${I('shield-check')}<div><b>Cronograma válido</b><p>Cumple todas las reglas de la plataforma.</p></div></div>`}
      ${v.warnings.map((w) => `<div class="alert a-warn" style="padding:10px 14px;margin-top:10px">${I('info')}<p>${esc(w)}</p></div>`).join('')}`;
  }

  function step4() {
    const c = ctx.company(F.company), cm = ctx.compliance(c), v = S.validate({ rows: F.rows, start: F.start, budget: num(F.budget) }), budget = num(F.budget), end = F.start ? D.addMonths(new Date(F.start + 'T12:00:00'), F.rows.length) : null;
    const itv = ctx.INTERVENTORES.find((x) => x.id === F.interventor);
    const byPh = PHASES.map((p) => ({ p, rows: F.rows.filter((r) => r.phase === p.key) })).filter((x) => x.rows.length);
    const checks = [[checkStep(1).length === 0, 'Datos del proyecto completos'], [!cm.blocked.length, 'Documentación legal de la constructora vigente'], [checkStep(2).length === 0, 'Licencia, fiducia y planos cargados'], [v.ok, 'Cronograma válido y suma 100 %']];
    const tmp = { photo: F.photo, seed: hashId(F.name || 'x'), name: F.name, scene: { sky: hashId(F.name || 'x') % 3, floors: Math.max(8, Math.min(18, num(F.floors) || 12)), towers: Math.max(1, Math.min(3, num(F.towers) || 1)) }, monthsData: [] };
    return `<div class="grid g-main" style="align-items:start"><div class="stack">
      <div class="card" style="overflow:hidden"><div style="height:220px;position:relative">${U.art(tmp, 6)}<div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(6,22,71,.88))"></div><div style="position:absolute;left:24px;right:24px;bottom:18px;color:#fff"><h2 style="font-size:26px">${esc(F.name)}</h2><div style="opacity:.88">${esc(F.address)} · ${esc(F.zone)}, ${esc(F.city)}</div></div></div>
        <div class="card-pad"><div class="facts">${[['coins', 'Presupuesto', U.moneyM(budget)], ['calendar', 'Inicio', F.start ? U.fmtDate(F.start) : '—'], ['flag', 'Entrega', end ? U.fmtMY(end) : '—'], ['layers', 'Hitos', F.rows.length + ' meses'], ['building-2', 'Torres · Pisos', num(F.towers) + ' · ' + num(F.floors)], ['home', 'Unidades', num(F.units)], ['file-badge', 'Licencia', esc(F.lic.number)], ['clipboard-check', 'Interventor', itv.name]].map((x) => `<div class="fact"><small>${I(x[0])}${x[1]}</small><b>${x[2]}</b></div>`).join('')}</div></div></div>
      <div class="card card-pad"><div class="card-head"><div><h3>Plan de desembolsos por fase</h3><div class="sub">${F.rows.length} hitos mensuales</div></div></div><div class="table-wrap"><table><thead><tr><th>Fase</th><th>Meses</th><th>% presup.</th><th>Desembolso</th></tr></thead><tbody>${byPh.map((x) => { const pc = S.round2(x.rows.reduce((s, r) => s + (+r.pct || 0), 0)); return `<tr><td><b>${x.p.name}</b></td><td class="num">${x.rows.length}</td><td class="num">${pc.toLocaleString('es-CO')} %</td><td class="num">${U.moneyM(budget * pc / 100)}</td></tr>`; }).join('')}<tr><td><b>Total</b></td><td class="num"><b>${F.rows.length}</b></td><td class="num"><b>${v.total.toLocaleString('es-CO')} %</b></td><td class="num"><b>${U.moneyM(budget)}</b></td></tr></tbody></table></div></div>
    </div><div class="stack">
      <div class="card card-pad"><div class="card-head"><h3>Lista de verificación</h3></div><div class="stack" style="gap:10px">${checks.map((x) => `<div class="row"><span class="di ${x[0] ? 'ic-ok' : 'ic-bad'}" style="width:30px;height:30px;border-radius:9px;display:grid;place-items:center;flex:none">${I(x[0] ? 'check' : 'x')}</span><span style="font-size:14px;font-weight:600">${x[1]}</span></div>`).join('')}</div></div>
      <div class="card card-pad"><div class="card-head"><h3>¿Qué pasa después?</h3></div><ol class="flow"><li><b>Interventoría</b> revisa el presupuesto y el cronograma.</li><li><b>INN-LOCK</b> valida la documentación y activa el proyecto.</li><li>El cronograma <b>queda bloqueado</b> y se publica a los compradores.</li></ol></div>
      <div class="card card-pad"><label class="check" style="align-items:flex-start"><input type="checkbox" data-f="confirm" data-t="bool" ${F.confirm ? 'checked' : ''} style="margin-top:3px"> <span>Declaro que la información y los documentos son veraces y acepto que los fondos se custodien y desembolsen según este cronograma, previa aprobación del interventor.</span></label>
        <button type="button" class="btn btn-primary btn-lg btn-block" style="margin-top:16px" data-w="submit">${I('send')}${F.editId ? 'Reenviar a interventoría' : 'Enviar a interventoría'}</button></div>
    </div></div>`;
  }

  function wizHtml(errors) {
    const body = [step1, step2, step3, step4][F.step - 1]();
    return `<div class="crumbs">${I('building-2')}<a href="#/proyectos" class="link" style="font-weight:600">Proyectos</a> ${I('chevron-right')} <b style="color:var(--text)">${F.editId ? 'Editar proyecto' : 'Registrar proyecto'}</b></div>
      <div class="page-head"><div><h1>${F.editId ? 'Editar y reenviar proyecto' : 'Registrar nuevo proyecto'}</h1><p>Completa los 4 pasos. Tu avance se guarda automáticamente como borrador.</p></div><div class="row row-wrap">${F.editId ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-w="sample">${I('sparkles')}Rellenar con datos de ejemplo</button><button type="button" class="btn btn-ghost btn-sm" data-w="reset">${I('refresh-cw')}Empezar de nuevo</button>`}</div></div>
      ${stepper()}<div id="wiz-errors">${errorsHtml(errors)}</div><div id="wiz-body">${body}</div>
      <div class="wiz-foot"><button type="button" class="btn btn-ghost" data-w="back" ${F.step === 1 ? 'disabled' : ''}>${I('chevron-left')}Atrás</button><span class="muted" style="font-size:13px">Paso ${F.step} de 4 · ${STEPS[F.step - 1][0]}</span>${F.step < 4 ? `<button type="button" class="btn btn-primary" data-w="next">Siguiente${I('arrow-right')}</button>` : '<span></span>'}</div>`;
  }
  const errorsHtml = (errs) => (errs && errs.length ? `<div class="alert a-bad" style="margin-bottom:20px">${I('alert-triangle')}<div><b>Revisa estos puntos</b><ul class="err-list">${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div></div>` : '');
  function render(errors) { const w = $('#wiz'); if (!w) return; w.innerHTML = wizHtml(errors); if (F.step === 3) updateSched(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  /* ============ vistas públicas ============ */
  function viewNuevo() { load(); return `<div id="wiz">${wizHtml()}</div>`; }
  const bannerHtml = (p) => {
    if (!p.reg || p.reg.stage === 'activo') return '';
    const u = ctx.state.user, s = STAGES[p.reg.stage], last = p.reg.history[p.reg.history.length - 1];
    const msg = { interventor: 'El interventor está revisando el presupuesto y el cronograma de obra.', admin: 'El interventor aprobó el cronograma. Falta la validación final de INN-LOCK para activar el proyecto.', observado: 'El proyecto fue devuelto con observaciones. Corrígelo y reenvíalo.' }[p.reg.stage];
    return `<div class="alert ${p.reg.stage === 'observado' ? 'a-bad' : 'a-info'} reveal" style="margin-bottom:22px">${I(s.i)}<div class="grow"><b>${s.l}</b><p>${msg}</p>${p.reg.stage === 'observado' && last ? `<p style="margin-top:6px"><b>Observación:</b> ${esc(last.text)}</p>` : ''}</div>${p.reg.stage === 'observado' && u.role === 'constructora' ? `<button class="btn btn-primary btn-sm" data-w="edit" data-id="${p.id}">${I('pen-line')}Editar y reenviar</button>` : ''}</div>`;
  };

  /* ---------- solicitudes (interventor y administrador) ---------- */
  const reqProjects = () => { const u = ctx.state.user; return ctx.PROJECTS.filter((p) => p.reg && (u.role === 'admin' ? ['interventor', 'admin', 'observado'].includes(p.reg.stage) : p.interventor === u.interventor && ['interventor', 'admin', 'observado'].includes(p.reg.stage))); };
  const pendingCount = () => { const u = ctx.state.user; return reqProjects().filter((p) => p.reg.stage === (u.role === 'admin' ? 'admin' : 'interventor')).length + (u.role === 'interventor' ? pendingChanges().length : 0); };
  function reqCard(p) {
    const u = ctx.state.user, c = ctx.company(p.constructora), cm = ctx.compliance(c), v = S.validate({ rows: p.form.rows, start: p.start, budget: p.budget }), itv = ctx.interv(p.interventor);
    const mine = p.reg.stage === (u.role === 'admin' ? 'admin' : 'interventor');
    const checks = [[v.ok, 'Cronograma válido (suma 100 %, fases en orden)'], [!cm.blocked.length, 'Documentación legal de la constructora vigente'], [!!p.lic.expires && U.daysTo(p.lic.expires) >= 0, 'Licencia de construcción vigente'], [p.planos.length >= 2, 'Planos arquitectónicos y estructurales cargados']];
    const acts = !mine ? `<span class="badge b-mute">${I('clock')}${p.reg.stage === 'observado' ? 'Esperando a la constructora' : u.role === 'admin' ? 'Esperando al interventor' : 'Esperando validación de INN-LOCK'}</span>` : u.role === 'interventor'
      ? `<button class="btn btn-ok" data-w="sol-approve" data-id="${p.id}">${I('check-circle-2')}Aprobar cronograma</button><button class="btn btn-bad" data-w="sol-observe" data-id="${p.id}">${I('alert-triangle')}Devolver con observaciones</button>`
      : `<button class="btn btn-ok" data-w="sol-activate" data-id="${p.id}">${I('shield-check')}Validar y activar proyecto</button><button class="btn btn-bad" data-w="sol-observe" data-id="${p.id}">${I('alert-triangle')}Devolver</button>`;
    let cum = 0;
    return `<article class="card req reveal"><div class="req-head"><div class="req-thumb">${U.art(p, 8, { static: true })}</div><div class="grow"><div class="row row-wrap" style="gap:8px"><h3 style="font-size:20px">${esc(p.name)}</h3><span class="badge ${STAGES[p.reg.stage].c}">${I(STAGES[p.reg.stage].i)}${STAGES[p.reg.stage].l}</span></div><div class="muted" style="margin-top:4px">${esc(p.zone)}, ${esc(p.city)} · ${esc(c.name)}</div><div class="muted" style="font-size:12.5px">Enviado el ${U.fmtDate(p.reg.submittedOn)} · Interventor: ${itv.name}</div></div></div>
      <div class="facts" style="margin:18px 0">${[['coins', 'Presupuesto', U.moneyM(p.budget)], ['calendar', 'Duración', p.months + ' meses'], ['flag', 'Inicio → entrega', U.fmtMY(p.start) + ' → ' + U.fmtMY(p.end)], ['home', 'Unidades', p.units]].map((x) => `<div class="fact"><small>${I(x[0])}${x[1]}</small><b>${x[2]}</b></div>`).join('')}</div>
      <div class="grid g-2" style="gap:18px;align-items:start"><div class="stack" style="gap:10px">${checks.map((x) => `<div class="row"><span class="di ${x[0] ? 'ic-ok' : 'ic-bad'}" style="width:28px;height:28px;border-radius:9px;display:grid;place-items:center;flex:none">${I(x[0] ? 'check' : 'x')}</span><span style="font-size:14px;font-weight:600">${x[1]}</span></div>`).join('')}</div><div>${planChart(p.form.rows)}</div></div>
      <details class="det"><summary>Ver cronograma y desembolsos (${p.months} hitos)</summary><div class="table-wrap" style="max-height:340px;overflow:auto"><table><thead><tr><th>Mes</th><th>Fase</th><th>%</th><th>Desembolso</th><th>Acumulado</th><th>Actividades</th></tr></thead><tbody>${p.monthsData.map((m) => { cum += m.tranchePct; return `<tr><td style="text-transform:capitalize;white-space:nowrap"><b>${m.label}</b></td><td>${m.phaseName}</td><td class="num">${U.pct(m.tranchePct, 2)}</td><td class="num">${U.moneyM(p.budget * m.tranchePct / 100)}</td><td class="num">${U.pct(cum, 1)}</td><td style="font-size:13px;color:var(--text-2)">${esc(m.activities.join(' · '))}</td></tr>`; }).join('')}</tbody></table></div></details>
      ${p.reg.history.length ? `<div class="hist" style="margin-top:18px">${p.reg.history.map((h) => `<div><b style="color:${h.t === 'observado' ? 'var(--bad)' : h.t.includes('aprob') || h.t === 'activado' ? 'var(--ok)' : 'var(--info)'}">${h.t}</b> · <span class="muted">${esc(h.by)} · ${U.fmtDT(h.d)}</span>${h.text ? `<div style="color:var(--text-2)">${esc(h.text)}</div>` : ''}</div>`).join('')}</div>` : ''}
      <div class="row row-wrap" style="margin-top:20px">${acts}</div></article>`;
  }
  function viewSolicitudes() {
    const u = ctx.state.user, list = reqProjects(), chg = pendingChanges();
    return `<div class="page-head"><div><h1>Solicitudes</h1><p>${u.role === 'admin' ? 'Valida la documentación y activa los proyectos aprobados por interventoría.' : 'Revisa el presupuesto y el cronograma antes de que el proyecto se active.'}</p></div></div>` +
      (list.length ? `<div class="stack" style="gap:22px">${list.map(reqCard).join('')}</div>` : '') +
      (chg.length ? `<div class="card-head" style="margin:${list.length ? 30 : 0}px 0 16px"><div><h3 style="font-size:19px">Cambios de cronograma</h3><div class="sub">Proyectos activos con el cronograma bloqueado</div></div></div><div class="stack" style="gap:22px">${chg.map(changeCard).join('')}</div>` : '') +
      (!list.length && !chg.length ? `<div class="card empty">${I('check-circle-2')}<b>No hay solicitudes pendientes</b><p>Aquí aparecerán los proyectos nuevos y los cambios de cronograma.</p></div>` : '');
  }
  function notifications() {
    const u = ctx.state.user, out = [];
    if (u.role === 'interventor' || u.role === 'admin') reqProjects().filter((p) => p.reg.stage === (u.role === 'admin' ? 'admin' : 'interventor')).forEach((p) => out.push({ i: 'file-signature', c: 'ic-gold', t: `<b>${esc(p.name)}</b> espera tu ${u.role === 'admin' ? 'validación' : 'revisión'} de cronograma.`, s: 'Solicitud', r: 'solicitudes' }));
    if (u.role === 'interventor') pendingChanges().forEach(({ p }) => out.push({ i: 'pen-line', c: 'ic-gold', t: `<b>${esc(p.name)}</b> tiene una solicitud de cambio de cronograma.`, s: 'Solicitud', r: 'solicitudes' }));
    if (u.role === 'constructora') ctx.PROJECTS.filter((p) => p.reg && p.constructora === u.company && p.reg.stage === 'observado').forEach((p) => out.push({ i: 'alert-triangle', c: 'ic-bad', t: `<b>${esc(p.name)}</b> fue devuelto con observaciones.`, s: 'Acción requerida', r: 'proyectos', pid: p.id }));
    return out;
  }

  /* ============ acciones ============ */
  const setStage = (p, stage, t, text) => { p.reg.stage = stage; p.status = STAGES[stage].l; p.reg.history.push({ t, by: ctx.state.user.name, role: ctx.state.user.role, d: new Date().toISOString(), text: text || '' }); ctx.persist(); };
  function resizeImage(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => { const img = new Image(); img.onerror = rej; img.onload = () => { const k = Math.min(1, 1100 / img.width), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.74)); }; img.src = r.result; }; r.readAsDataURL(file); });
  }
  const sz = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  function fixTotal() { const rows = F.rows; if (!rows.length) return; const t = rows.reduce((s, r) => s + (+r.pct || 0), 0); if (t <= 0) return; rows.forEach((r) => { r.pct = S.round2(((+r.pct || 0) * 100) / t); }); const d = S.round2(100 - rows.reduce((s, r) => s + r.pct, 0)); rows[rows.length - 1].pct = S.round2(rows[rows.length - 1].pct + d); }

  function importModal(res, fileName) {
    const v = S.validate({ rows: res.rows, start: res.meta.start || F.start, budget: res.meta.budget || num(F.budget) }), errs = res.errors.map((e) => e.msg).concat(v.errors.filter((e) => !(res.meta.start == null && /fecha de inicio/.test(e.msg))).map((e) => e.msg)), uniq = [...new Set(errs)];
    const structural = res.errors.some((e) => !e.line) || !res.rows.length;
    U.modal({ title: 'Importar cronograma', wide: true, body: `<div class="row" style="gap:12px;margin-bottom:16px"><span class="di ic-blue" style="width:44px;height:44px;border-radius:13px;display:grid;place-items:center">${I('file-text')}</span><div><b>${esc(fileName)}</b><div class="muted" style="font-size:13px">${res.rows.length} filas · ${U.pct(v.total, 2)} del presupuesto${res.meta.start ? ' · inicio ' + U.fmtDate(res.meta.start) : ''}${res.meta.budget ? ' · ' + U.moneyM(res.meta.budget) : ''}</div></div></div>
      ${uniq.length ? `<div class="alert a-bad" style="margin-bottom:16px">${I('alert-triangle')}<div><b>${uniq.length} punto${uniq.length > 1 ? 's' : ''} por corregir</b><ul class="err-list">${uniq.slice(0, 8).map((e) => `<li>${esc(e)}</li>`).join('')}${uniq.length > 8 ? `<li>…y ${uniq.length - 8} más</li>` : ''}</ul></div></div>` : `<div class="alert a-ok" style="margin-bottom:16px">${I('shield-check')}<div><b>Archivo válido</b><p>Cumple las reglas de la plataforma. Revisa la vista previa y cárgalo.</p></div></div>`}
      ${res.warnings.map((w) => `<div class="alert a-warn" style="padding:10px 14px;margin-bottom:10px">${I('info')}<p>${esc(w)}</p></div>`).join('')}
      ${res.rows.length ? `<div class="table-wrap" style="max-height:260px;overflow:auto"><table><thead><tr><th>#</th><th>Fase</th><th>%</th><th>Actividades</th></tr></thead><tbody>${res.rows.slice(0, 40).map((r, i) => `<tr style="${r.bad ? 'background:var(--bad-bg)' : ''}"><td class="num">${i + 1}</td><td>${(PHASES.find((p) => p.key === r.phase) || {}).name}</td><td class="num">${r.pct}</td><td style="font-size:13px;color:var(--text-2)">${esc(r.acts)}</td></tr>`).join('')}</tbody></table></div>` : ''}`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button>${res.rows.length && !structural ? `<button class="btn ${uniq.length ? 'btn-ghost' : 'btn-primary'}" id="imp-go">${I('upload')}${uniq.length ? 'Cargar y corregir en pantalla' : 'Cargar en el asistente'}</button>` : ''}`,
      onMount: (m, close) => { const b = $('#imp-go', m); if (b) b.addEventListener('click', () => { F.rows = res.rows.map((r) => ({ phase: r.phase, pct: r.pct, acts: r.acts })); if (res.meta.start) F.start = res.meta.start; if (res.meta.budget) F.budget = res.meta.budget; if (!F.name && res.meta.name) F.name = res.meta.name; saveDraft(); close(); render(); U.toast(res.rows.length + ' hitos cargados desde el archivo'); }); } });
  }

  function submit() {
    for (let n = 1; n <= 3; n++) { const e = checkStep(n); if (e.length) { F.step = n; render(e); return; } }
    if (!F.confirm) { render(['Debes aceptar la declaración para enviar el proyecto.']); return; }
    if (ctx.LIVE) { submitLive(); return; }
    const u = ctx.state.user, now = new Date().toISOString();
    if (F.editId) {
      const rec = ctx.db.projects[F.editId], reg = rec.reg; reg.stage = 'interventor'; reg.history.push({ t: 'reenviado', by: u.name, role: u.role, d: now, text: 'Proyecto corregido y reenviado a interventoría.' });
      const np = build(F, F.editId, reg), old = ctx.PROJECTS.findIndex((x) => x.id === F.editId); ctx.PROJECTS[old] = np; rec.form = F; ctx.persist(); ctx.log('Reenvió el proyecto «' + np.name + '» a interventoría', 'send', np.id); ctx.setProject(np.id);
    } else {
      const id = 'n' + Date.now().toString(36), reg = { stage: 'interventor', submittedOn: now, history: [{ t: 'enviado', by: u.name, role: u.role, d: now, text: 'Proyecto registrado y enviado a interventoría.' }] };
      const np = build(F, id, reg); ctx.PROJECTS.push(np); ctx.db.projects[id] = { form: F, reg }; delete ctx.db.drafts[u.id]; ctx.persist(); ctx.log('Registró el proyecto «' + np.name + '»', 'plus', id); ctx.setProject(id);
    }
    F = null; U.confetti();
    U.modal({ title: 'Proyecto enviado', body: `<div class="alert a-ok">${I('check-circle-2')}<div><b>¡Listo!</b><p>Tu proyecto quedó en revisión del interventor. Te avisaremos si hay observaciones o cuando se active.</p></div></div>`, footer: '<button class="btn btn-primary" data-close>Entendido</button>' });
    location.hash = '#/proyectos'; ctx.refresh();
  }

  async function submitLive() {
    const u = ctx.state.user, editing = !!F.editId, form = F, files = FILES;
    for (const x of form.planos.slice(0, 2)) if (!files[x.key] && !x.path) { render([`Vuelve a seleccionar el archivo de «${x.name}» (los archivos no se conservan al cerrar la página).`]); return; }
    let id = null;
    const ok = await ctx.act(async () => { id = await ctx.live.saveProject(form, files, true, u.company); }, null);
    if (!ok) return;
    delete ctx.db.drafts[u.id]; ctx.persist(); F = null; FILES = {}; if (id) ctx.setProject(id); U.confetti();
    U.modal({ title: editing ? 'Proyecto reenviado' : 'Proyecto enviado', body: `<div class="alert a-ok">${I('check-circle-2')}<div><b>¡Listo!</b><p>Tu proyecto quedó en revisión del interventor. Te avisaremos si hay observaciones o cuando se active.</p></div></div>`, footer: '<button class="btn btn-primary" data-close>Entendido</button>' });
    location.hash = '#/proyectos'; ctx.refresh();
  }

  function onClick(e) {
    const t = e.target.closest('[data-w]'); if (!t) return; const a = t.dataset.w, i = +t.dataset.i;
    if (['next', 'back', 'goto', 'amen-toggle', 'amen-add', 'typ-add', 'typ-del', 'photo-clear', 'row-add', 'row-del', 'row-equal', 'row-fix', 'sched-suggest', 'sample', 'reset', 'submit'].includes(a)) { if (!F || !$('#wiz')) return; }
    switch (a) {
      case 'next': { const err = checkStep(F.step); if (err.length) { $('#wiz-errors').innerHTML = errorsHtml(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return; } F.step++; saveDraft(); render(); break; }
      case 'back': F.step = Math.max(1, F.step - 1); render(); break;
      case 'goto': { const n = +t.dataset.n; if (n <= F.step) { F.step = n; render(); } break; }
      case 'amen-toggle': { const v = t.dataset.v, k = F.amenities.indexOf(v); k < 0 ? F.amenities.push(v) : F.amenities.splice(k, 1); $('#amen').innerHTML = amenChips(); saveDraft(); break; }
      case 'amen-add': { const el = $('#amen-new'), v = el.value.trim(); if (v && !F.amenities.includes(v)) F.amenities.push(v); el.value = ''; $('#amen').innerHTML = amenChips(); saveDraft(); break; }
      case 'typ-add': F.typologies.push({ name: '', area: '', beds: 2, baths: 2, parking: 1, price: '' }); render(); break;
      case 'typ-del': F.typologies.splice(i, 1); render(); break;
      case 'photo-clear': F.photo = null; saveDraft(); render(); break;
      case 'row-add': { const last = F.rows[F.rows.length - 1]; F.rows.push({ phase: last ? last.phase : PHASES[0].key, pct: 0, acts: '' }); render(); setTimeout(() => { const b = $('#sched-body'); b && b.lastElementChild && b.lastElementChild.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60); saveDraft(); break; }
      case 'row-del': F.rows.splice(i, 1); saveDraft(); render(); break;
      case 'row-equal': { const n = F.rows.length; if (!n) return; const b = S.round2(100 / n); F.rows.forEach((r) => { r.pct = b; }); F.rows[n - 1].pct = S.round2(100 - b * (n - 1)); saveDraft(); render(); break; }
      case 'row-fix': fixTotal(); saveDraft(); render(); U.toast('Porcentajes ajustados para sumar 100 %'); break;
      case 'sched-suggest': { const n = +$('#sched-n').value; if (!(n >= 6 && n <= 60)) { U.toast('Ingresa una duración entre 6 y 60 meses', 'err'); return; } const go = () => { F.rows = S.suggest(n); saveDraft(); render(); U.toast('Sugerencia generada: ' + F.rows.length + ' hitos'); }; if (F.rows.length) U.modal({ title: 'Reemplazar cronograma', body: '<p>Se reemplazarán los hitos actuales por una sugerencia automática de ' + n + ' meses. ¿Continuar?</p>', footer: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ok">Reemplazar</button>', onMount: (m, close) => $('#ok', m).addEventListener('click', () => { close(); go(); }) }); else go(); break; }
      case 'sample': F = sample(ctx.state.user); saveDraft(); render(); U.toast('Datos de ejemplo cargados'); break;
      case 'reset': U.modal({ title: 'Empezar de nuevo', body: '<p>Se borrará el borrador actual del proyecto. ¿Continuar?</p>', footer: '<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-bad" id="ok">Borrar borrador</button>', onMount: (m, close) => $('#ok', m).addEventListener('click', () => { F = blank(ctx.state.user); delete ctx.db.drafts[ctx.state.user.id]; ctx.persist(); close(); render(); }) }); break;
      case 'submit': submit(); break;
      case 'edit': { const src = ctx.LIVE ? ctx.projById(t.dataset.id).form : ctx.db.projects[t.dataset.id].form; F = JSON.parse(JSON.stringify(src)); FILES = {}; F.editId = t.dataset.id; F.step = 1; F.confirm = false; location.hash = '#/nuevo'; if (ctx.state.route === 'nuevo') render(); break; }
      case 'sol-approve': solApprove(ctx.projById(t.dataset.id)); break;
      case 'sol-activate': solActivate(ctx.projById(t.dataset.id)); break;
      case 'sol-observe': solObserve(ctx.projById(t.dataset.id)); break;
      case 'chg-open': changeModal(ctx.projById(t.dataset.id)); break;
      case 'chg-approve': { const p = ctx.projById(t.dataset.id); chgApprove(p, findChange(p.id, t.dataset.c)); break; }
      case 'chg-reject': { const p = ctx.projById(t.dataset.id); chgReject(p, findChange(p.id, t.dataset.c)); break; }
    }
  }
  function solApprove(p) {
    const items = ['Revisé el presupuesto y su distribución por hitos', 'Los hitos son medibles y verificables en obra', 'La duración y las fases son razonables para el alcance', 'Los planos y la licencia corresponden al proyecto'];
    U.modal({ title: 'Aprobar cronograma · ' + esc(p.name), body: `<div class="alert a-info" style="margin-bottom:16px">${I('lock')}<p>Al aprobar, el cronograma queda <b>bloqueado</b>: cualquier cambio posterior requerirá una solicitud de modificación.</p></div><div class="stack" style="gap:10px">${items.map((t) => `<label class="check" style="padding:12px 14px;border:1px solid var(--line);border-radius:12px"><input type="checkbox" class="ck"> ${t}</label>`).join('')}</div><div class="field" style="margin:16px 0 0"><label for="note">Comentario (opcional)</label><textarea class="input" id="note"></textarea></div>`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-ok" id="go" disabled>${I('fingerprint')}Aprobar y firmar</button>`,
      onMount: (m, close) => { const cks = $$('.ck', m), go = $('#go', m); cks.forEach((k) => k.addEventListener('change', () => { go.disabled = !cks.every((x) => x.checked); })); go.addEventListener('click', () => { if (ctx.LIVE) { const note = $('#note', m).value; close(); ctx.act(() => ctx.live.reviewProject(p.id, true, note), 'Cronograma aprobado. Pasa a validación de la plataforma.'); return; } setStage(p, 'admin', 'aprobado por interventor', $('#note', m).value); ctx.log('Aprobó el cronograma de «' + p.name + '»', 'check-circle-2', p.id); close(); U.toast('Cronograma aprobado. Pasa a validación de la plataforma.'); ctx.refresh(); }); } });
  }
  function solActivate(p) {
    const cm = ctx.compliance(ctx.company(p.constructora));
    U.modal({ title: 'Validar y activar · ' + esc(p.name), body: cm.blocked.length ? `<div class="alert a-bad">${I('shield-alert')}<div><b>No se puede activar</b><p>${cm.blocked.map((d) => d.title).join(', ')} está vencido. La constructora debe renovarlo.</p></div></div>` : `<div class="alert a-ok" style="margin-bottom:12px">${I('shield-check')}<div><b>Documentación vigente</b><p>El proyecto se publicará como «En construcción» y comenzará el hito del primer mes. El cronograma queda bloqueado.</p></div></div><div class="field" style="margin:0"><label for="note">Comentario (opcional)</label><textarea class="input" id="note"></textarea></div>`,
      footer: cm.blocked.length ? '<button class="btn btn-ghost" data-close>Entendido</button>' : `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-ok" id="go">${I('check-circle-2')}Activar proyecto</button>`,
      onMount: (m, close) => { const b = $('#go', m); if (b) b.addEventListener('click', () => { if (ctx.LIVE) { const note = $('#note', m).value; close(); ctx.act(async () => { await ctx.live.activateProject(p.id, true, note); U.confetti(); }, 'Proyecto activado y publicado'); return; } setStage(p, 'activo', 'activado', $('#note', m).value); ctx.log('Activó el proyecto «' + p.name + '»', 'shield-check', p.id); close(); U.confetti(); U.toast('Proyecto activado y publicado'); ctx.refresh(); }); } });
  }
  function solObserve(p) {
    U.modal({ title: 'Devolver con observaciones', body: `<p class="muted" style="margin-bottom:14px">Indica qué debe corregir la constructora en <b>${esc(p.name)}</b>.</p><div class="field" style="margin:0"><label for="obs">Observaciones</label><textarea class="input" id="obs" placeholder="Ej.: La fase de estructura concentra demasiado presupuesto en un solo mes…"></textarea></div>`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-bad" id="go">${I('alert-triangle')}Enviar observaciones</button>`,
      onMount: (m, close) => $('#go', m).addEventListener('click', () => { const t = $('#obs', m).value.trim(); if (t.length < 8) { U.toast('Describe brevemente las observaciones', 'err'); return; } if (ctx.LIVE) { close(); ctx.act(() => (ctx.state.user.role === 'admin' ? ctx.live.activateProject(p.id, false, t) : ctx.live.reviewProject(p.id, false, t)), 'Observaciones enviadas a la constructora'); return; } setStage(p, 'observado', 'observado', t); ctx.log('Devolvió «' + p.name + '» con observaciones', 'alert-triangle', p.id); close(); U.toast('Observaciones enviadas a la constructora'); ctx.refresh(); }) });
  }

  /* ============ entrada de datos ============ */
  function onField(e) {
    const el = e.target.closest('[data-f]'); if (!el || !F) return; const path = el.dataset.f, t = el.dataset.t; let v;
    if (t === 'bool') v = el.checked;
    else if (t === 'int' || t === 'num') v = el.value === '' ? '' : Number(el.value);
    else if (t === 'money') v = Number(String(el.value).replace(/\D/g, '')) || '';
    else v = el.value;
    set(path, v);
    if (t === 'money' && e.type === 'change') el.value = v ? U.fmtN(v) : '';
    if (path === 'budget') { const h = $('#budget-hint'); if (h) h.textContent = v ? '= ' + U.moneyM(v) : 'Valor total que se custodia y se desembolsa por hitos'; }
    if (path === 'description') { const c = $('#desc-count'); if (c) c.textContent = String(F.description.trim().length); }
    if (/^rows\.|^start$|^budget$/.test(path)) updateSched();
    saveDraft();
  }
  async function onFile(e) {
    const el = e.target.closest('[data-file]'); if (!el || !el.files || !el.files[0] || !F) return; const f = el.files[0], kind = el.dataset.file;
    try {
      if (kind === 'photo') { if (!/^image\//.test(f.type)) throw new Error('Selecciona una imagen (JPG o PNG).'); F.photo = await resizeImage(f); saveDraft(); render(); }
      else if (kind === 'plano') { if (f.size > 50 * 1048576) throw new Error('El archivo supera los 50 MB.'); const x = F.planos[+el.dataset.i]; x.file = f.name; x.size = sz(f.size); x.path = null; FILES[x.key] = f; saveDraft(); render(); }
      else if (kind === 'import') { const res = await S.parseFile(f); importModal(res, f.name); }
    } catch (err) { U.toast(err.message || 'No se pudo leer el archivo', 'err'); }
    el.value = '';
  }


  /* ============ Modificaciones del cronograma (proyectos activos) ============ */
  const changesOf = (pid) => ((ctx.db.changes || {})[pid] || []);
  const isActive = (p) => !p.reg || p.reg.stage === 'activo';
  const canRequest = (p) => { const u = ctx.state.user; return u.role === 'constructora' && p.constructora === u.company && isActive(p) && p.monthsData.filter((m) => m.status === 'pendiente').length >= 2 && !changesOf(p.id).some((c) => c.status === 'pendiente'); };
  const changeButton = (p) => (canRequest(p) ? `<button class="btn btn-ghost" data-w="chg-open" data-id="${p.id}">${I('pen-line')}Solicitar cambio de cronograma</button>` : '');
  const chgBadge = (s) => ({ pendiente: '<span class="badge b-warn">' + I('clock') + 'En revisión</span>', aprobada: '<span class="badge b-ok">' + I('check-circle-2') + 'Aprobada</span>', rechazada: '<span class="badge b-bad">' + I('x') + 'Rechazada</span>' }[s]);
  const lbl = (p, n) => (p.monthsData[n - 1] || {}).label || ('mes ' + n);
  const chgSummary = (p, c) => c.items.filter((x) => Math.abs(x.to - x.from) > 0.001).map((x) => `<span class="chip" style="text-transform:capitalize">${lbl(p, x.n)}: ${U.fmtN(x.from, 2)}% → <b>${U.fmtN(x.to, 2)}%</b></span>`).join(' ');
  function changesCard(p) {
    if (!isActive(p)) return '';
    const list = changesOf(p.id).slice().reverse();
    return `<div class="card card-pad reveal" style="margin:14px 0 8px"><div class="card-head" style="margin-bottom:${list.length ? 14 : 0}px"><div class="row" style="gap:14px"><span class="di ic-blue" style="width:44px;height:44px;border-radius:13px;display:grid;place-items:center;flex:none">${I('lock')}</span><div><h3>Cronograma bloqueado</h3><div class="sub">Aprobado por interventoría. Cualquier cambio requiere una solicitud y su aprobación.</div></div></div>${changeButton(p)}</div>
      ${list.length ? `<div class="stack" style="gap:12px">${list.slice(0, 4).map((c) => `<div style="padding:14px 16px;border:1px solid var(--line);border-radius:14px"><div class="row row-wrap between"><b style="font-size:14px">${U.fmtDT(c.d)} · ${esc(c.by)}</b>${chgBadge(c.status)}</div><div style="font-size:13.5px;color:var(--text-2);margin:6px 0 8px">${esc(c.reason)}</div><div class="row row-wrap" style="gap:6px">${chgSummary(p, c)}</div>${c.note ? `<div class="muted" style="font-size:13px;margin-top:8px">Interventor: ${esc(c.note)}</div>` : ''}</div>`).join('')}</div>` : ''}</div>`;
  }
  function changeModal(p) {
    const pend = p.monthsData.filter((m) => m.status === 'pendiente'), orig = S.round2(pend.reduce((s, m) => s + m.tranchePct, 0)), cap = S.capFor(p.months);
    U.modal({ title: 'Solicitar cambio de cronograma', wide: true, body: `<div class="alert a-info" style="margin-bottom:16px">${I('info')}<p>Solo se pueden modificar los meses <b>pendientes</b>. Los meses ya desembolsados o en ejecución no cambian, y el total de los meses pendientes debe seguir sumando <b>${orig.toLocaleString('es-CO')} %</b>.</p></div>
      <div class="table-wrap" style="max-height:300px;overflow:auto"><table><thead><tr><th>Mes</th><th>Fase</th><th>% actual</th><th style="width:130px">% nuevo</th><th>Cambio</th></tr></thead><tbody>${pend.map((m, i) => `<tr><td style="text-transform:capitalize;white-space:nowrap"><b>${m.label}</b></td><td>${m.phaseName}</td><td class="num">${U.fmtN(m.tranchePct, 2)}</td><td><input class="input sm num chg-in" type="number" step="0.01" min="0" data-i="${i}" value="${S.round2(m.tranchePct)}" aria-label="Nuevo porcentaje ${m.label}"></td><td class="num" id="cd-${i}">—</td></tr>`).join('')}</tbody></table></div>
      <div id="chg-sum" style="margin:14px 0"></div>
      <div class="field" style="margin:0"><label for="chg-reason">Motivo del cambio <span style="color:var(--bad)">*</span></label><textarea class="input" id="chg-reason" placeholder="Explica por qué es necesario (mínimo 20 caracteres): clima, retrasos de proveedores, ajustes de diseño…"></textarea></div>`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-ghost" id="chg-fix">Ajustar al total</button><button class="btn btn-primary" id="chg-go" disabled>${I('send')}Enviar a interventoría</button>`,
      onMount: (m, close) => {
        const ins = $$('.chg-in', m), go = $('#chg-go', m), reason = $('#chg-reason', m);
        const vals = () => ins.map((x) => (x.value === '' ? NaN : +x.value));
        function check() {
          const v = vals(), sum = S.round2(v.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)), errs = [];
          v.forEach((x, i) => { const d = $('#cd-' + i, m), diff = S.round2((isNaN(x) ? 0 : x) - pend[i].tranchePct); d.textContent = Math.abs(diff) < 0.001 ? '—' : (diff > 0 ? '+' : '') + diff.toLocaleString('es-CO'); d.style.color = diff > 0.001 ? 'var(--warn)' : diff < -0.001 ? 'var(--info)' : ''; });
          if (v.some((x) => isNaN(x) || x <= 0)) errs.push('Cada mes debe tener un porcentaje mayor que 0.');
          if (v.some((x) => x > cap)) errs.push(`Ningún mes puede superar ${cap} % del presupuesto.`);
          if (Math.abs(sum - orig) > 0.01) errs.push(`Los meses pendientes suman ${sum.toLocaleString('es-CO')} %; deben sumar ${orig.toLocaleString('es-CO')} %.`);
          if (!v.some((x, i) => Math.abs(x - pend[i].tranchePct) > 0.001)) errs.push('Modifica al menos un mes.');
          if (reason.value.trim().length < 20) errs.push('Escribe el motivo (mínimo 20 caracteres).');
          $('#chg-sum', m).innerHTML = `<div class="row between row-wrap" style="gap:8px"><span class="muted">Total meses pendientes</span><b class="num" style="color:var(--${Math.abs(sum - orig) <= 0.01 ? 'ok' : 'bad'})">${sum.toLocaleString('es-CO')} % / ${orig.toLocaleString('es-CO')} %</b></div>${errs.length ? `<ul class="err-list">${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : `<div class="alert a-ok" style="padding:10px 14px;margin-top:8px">${I('check-circle-2')}<p>La solicitud es válida.</p></div>`}`;
          go.disabled = errs.length > 0;
        }
        ins.forEach((x) => x.addEventListener('input', check)); reason.addEventListener('input', check); check();
        $('#chg-fix', m).addEventListener('click', () => { const v = vals().map((x) => (isNaN(x) || x < 0 ? 0 : x)), t = v.reduce((a, b) => a + b, 0); if (t <= 0) return; const sc = v.map((x) => S.round2((x * orig) / t)); sc[sc.length - 1] = S.round2(sc[sc.length - 1] + orig - sc.reduce((a, b) => a + b, 0)); ins.forEach((x, i) => { x.value = sc[i]; }); check(); });
        go.addEventListener('click', () => {
          const v = vals(), u = ctx.state.user;
          if (ctx.LIVE) { const items = pend.map((x, i) => ({ n: x.n, to: v[i], from: x.tranchePct })).filter((x) => Math.abs(x.to - x.from) > 0.001).map((x) => ({ n: x.n, to: x.to })), reasonTxt = reason.value.trim(); close(); ctx.act(() => ctx.live.requestChange(p.id, reasonTxt, items), 'Solicitud enviada al interventor'); return; }
          ctx.db.changes = ctx.db.changes || {}; (ctx.db.changes[p.id] = ctx.db.changes[p.id] || []).push({ id: 'c' + Date.now().toString(36), pid: p.id, by: u.name, d: new Date().toISOString(), reason: reason.value.trim(), status: 'pendiente', items: pend.map((x, i) => ({ n: x.n, from: x.tranchePct, to: v[i] })) });
          ctx.persist(); ctx.log('Solicitó un cambio al cronograma de «' + p.name + '»', 'pen-line', p.id); close(); U.toast('Solicitud enviada al interventor'); ctx.refresh();
        });
      } });
  }
  const pendingChanges = () => { const u = ctx.state.user; return ctx.PROJECTS.filter((p) => isActive(p) && (u.role === 'admin' || p.interventor === u.interventor)).flatMap((p) => changesOf(p.id).filter((c) => c.status === 'pendiente').map((c) => ({ p, c }))); };
  function changeCard({ p, c }) {
    const u = ctx.state.user, mine = u.role === 'interventor', co = ctx.company(p.constructora);
    return `<article class="card req reveal"><div class="req-head"><div class="req-thumb">${U.art(p, null, { static: true })}</div><div class="grow"><div class="row row-wrap" style="gap:8px"><h3 style="font-size:20px">${esc(p.name)}</h3><span class="badge b-warn">${I('pen-line')}Cambio de cronograma</span></div><div class="muted" style="margin-top:4px">${esc(co.name)}</div><div class="muted" style="font-size:12.5px">Solicitado el ${U.fmtDT(c.d)} por ${esc(c.by)}</div></div></div>
      <div class="alert a-info" style="margin:16px 0">${I('info')}<div><b>Motivo</b><p>${esc(c.reason)}</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Mes</th><th>% actual</th><th>% propuesto</th><th>Cambio</th><th>Desembolso propuesto</th></tr></thead><tbody>${c.items.map((x) => { const d = S.round2(x.to - x.from); return `<tr><td style="text-transform:capitalize"><b>${lbl(p, x.n)}</b></td><td class="num">${U.fmtN(x.from, 2)} %</td><td class="num"><b>${U.fmtN(x.to, 2)} %</b></td><td class="num" style="color:var(--${d > 0 ? 'warn' : d < 0 ? 'info' : 'muted'})">${Math.abs(d) < 0.001 ? '—' : (d > 0 ? '+' : '') + d.toLocaleString('es-CO')}</td><td class="num">${U.moneyM((p.budget * x.to) / 100)}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="row row-wrap" style="margin-top:20px">${mine ? `<button class="btn btn-ok" data-w="chg-approve" data-id="${p.id}" data-c="${c.id}">${I('check-circle-2')}Aprobar cambio</button><button class="btn btn-bad" data-w="chg-reject" data-id="${p.id}" data-c="${c.id}">${I('x')}Rechazar</button>` : `<span class="badge b-mute">${I('clock')}Esperando al interventor</span>`}</div></article>`;
  }
  function applyChange(p, c) {
    const map = {}; c.items.forEach((x) => { map[x.n] = x.to; }); let cum = 0;
    p.monthsData.forEach((m) => { if (map[m.n] != null && Math.abs(map[m.n] - m.tranchePct) > 0.001) { m.tranchePct = map[m.n]; m.changed = true; } cum += m.tranchePct; m.plannedCum = Math.min(100, S.round2(cum)); });
    const last = p.monthsData[p.monthsData.length - 1]; if (Math.abs(100 - last.plannedCum) < 0.05) last.plannedCum = 100;
    p.monthsData.forEach((m) => ctx.saveMonth(p, m));
  }
  const findChange = (pid, id) => changesOf(pid).find((x) => x.id === id);
  function chgApprove(p, c) {
    U.modal({ title: 'Aprobar cambio de cronograma', body: `<div class="alert a-info" style="margin-bottom:14px">${I('lock')}<p>Al aprobar, los porcentajes de los meses indicados se actualizan, cambia el avance planificado y se recalculan los desembolsos futuros. Queda registrado en el historial.</p></div><label class="check" style="padding:12px 14px;border:1px solid var(--line);border-radius:12px"><input type="checkbox" id="ck"> Evalué el motivo y el impacto en el avance planificado y el flujo de desembolsos</label><div class="field" style="margin:16px 0 0"><label for="note">Comentario (opcional)</label><textarea class="input" id="note"></textarea></div>`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-ok" id="go" disabled>${I('fingerprint')}Aprobar y firmar</button>`,
      onMount: (m, close) => { const ck = $('#ck', m), go = $('#go', m); ck.addEventListener('change', () => { go.disabled = !ck.checked; }); go.addEventListener('click', () => { if (ctx.LIVE) { const note = $('#note', m).value.trim(); close(); ctx.act(() => ctx.live.resolveChange(c.id, true, note), 'Cambio aprobado y cronograma actualizado'); return; } c.status = 'aprobada'; c.note = $('#note', m).value.trim(); c.resolvedOn = new Date().toISOString(); applyChange(p, c); ctx.persist(); ctx.log('Aprobó un cambio al cronograma de «' + p.name + '»', 'check-circle-2', p.id); close(); U.toast('Cambio aprobado y cronograma actualizado'); ctx.refresh(); }); } });
  }
  function chgReject(p, c) {
    U.modal({ title: 'Rechazar cambio de cronograma', body: `<div class="field" style="margin:0"><label for="obs">Motivo del rechazo</label><textarea class="input" id="obs" placeholder="Explica a la constructora por qué no se aprueba…"></textarea></div>`, footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-bad" id="go">${I('x')}Rechazar solicitud</button>`,
      onMount: (m, close) => $('#go', m).addEventListener('click', () => { const t = $('#obs', m).value.trim(); if (t.length < 8) { U.toast('Describe brevemente el motivo', 'err'); return; } if (ctx.LIVE) { close(); ctx.act(() => ctx.live.resolveChange(c.id, false, t), 'Solicitud rechazada'); return; } c.status = 'rechazada'; c.note = t; c.resolvedOn = new Date().toISOString(); ctx.persist(); ctx.log('Rechazó un cambio al cronograma de «' + p.name + '»', 'x', p.id); close(); U.toast('Solicitud rechazada'); ctx.refresh(); }) });
  }

  function init(c) {
    ctx = c;
    document.addEventListener('click', onClick);
    document.addEventListener('input', onField); document.addEventListener('change', onField); document.addEventListener('change', onFile);
    return { views: { nuevo: viewNuevo, solicitudes: viewSolicitudes }, mount: { nuevo: () => { if (F && F.step === 3) updateSched(); } }, banner: bannerHtml, notifications, pendingCount, changesCard, changeButton, STAGES,
      resetForm: () => { F = null; } };
  }
  window.Wizard = { init, hydrate, build, STAGES };
})();
