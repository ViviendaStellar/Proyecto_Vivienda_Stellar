/* INN-LOCK · Conexión con Supabase (modo real).
   - Autenticación (correo y contraseña), lectura de datos y subida de archivos a Storage.
   - Todas las acciones de negocio llaman a funciones RPC de la base (que validan rol y reglas).
   - Convierte las filas de la base en los mismos objetos que usan las vistas del modo demostración. */
(function () {
  'use strict';
  const D = window.INNLOCK, U = window.UI;
  const cfg = window.INNLOCK_CONFIG || {};
  const create = cfg.createClient || (window.supabase && window.supabase.createClient);
  let forcedDemo = false;
  try { forcedDemo = new URLSearchParams(location.search).get('demo') === '1' || localStorage.getItem('innlock.mode') === 'demo'; } catch (e) { /* sin almacenamiento */ }
  const available = !!(cfg.supabaseUrl && cfg.supabaseKey && create);
  const Live = { available, on: available && !forcedDemo, client: null, log: [], notifs: [], profiles: [], thumbs: new Map(), ctx: null };
  if (!Live.on) { window.Live = Live; return; }

  Live.client = create(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
  const sb = Live.client;

  /* ---------- utilidades ---------- */
  const clean = (e) => {
    const m = (e && e.message) || String(e);
    if (e && (e.code === '42501' || /permission denied|row-level security/i.test(m))) return 'No tienes permiso para realizar esta acción.';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
    return m;
  };
  async function rpc(name, args) { const { data, error } = await sb.rpc(name, args || {}); if (error) throw new Error(clean(error)); return data; }
  async function fetchAll(table, build) {
    const out = []; const size = 1000;
    for (let from = 0; ; from += size) {
      let q = sb.from(table).select('*'); if (build) q = build(q);
      const { data, error } = await q.range(from, from + size - 1);
      if (error) throw new Error(table + ': ' + clean(error));
      out.push(...data); if (data.length < size) break;
    }
    return out;
  }
  const safe = (n) => String(n || 'archivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-80);
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
  const KB = (b) => (b == null ? '—' : b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h % 997) + 3; };
  const day = (s) => (s ? String(s).slice(0, 10) : null);
  const N = (v) => (v == null ? null : Number(v));
  const STAGE_LABEL = { borrador: 'Borrador', interventor: 'En revisión de interventoría', admin: 'En validación de la plataforma', observado: 'Con observaciones', activo: 'En construcción', finalizado: 'Finalizado' };
  const EV = { imagen: 'img', video: 'video', pdf: 'pdf' }, EV_BACK = { img: 'imagen', video: 'video', pdf: 'pdf' };
  const NOTIF_ICON = { hito: 'clock', desembolso: 'coins', observacion: 'alert-triangle', solicitud: 'file-signature', cambio: 'pen-line', documento: 'file-check-2', proyecto: 'building-2', avance: 'trending-up' };
  const group = (rows, key) => { const m = new Map(); rows.forEach((r) => { const k = r[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); return m; };

  /* ============================================================
     Modelo: filas de la base → objetos de la aplicación
     ============================================================ */
  function buildModel(raw, me, email) {
    const icons = Object.fromEntries(D.PHASES.map((p) => [p.key, p.icon]));
    const phaseName = Object.fromEntries(raw.phases.map((p) => [p.key, p.name]));
    const interventors = raw.interventors.map((i) => ({ id: i.id, name: i.name, firm: i.firm, license: i.license || '', email: i.email || '' }));

    const docTypes = raw.document_types.filter((t) => t.scope === 'company').sort((a, b) => a.sort - b.sort);
    const docsByCo = group(raw.v_company_documents, 'company_id'), subsByDoc = group(raw.document_submissions.filter((s) => s.status === 'pendiente'), 'document_id');
    const companies = raw.companies.map((c) => {
      const rows = docsByCo.get(c.id) || [];
      const docs = docTypes.map((t) => {
        const d = rows.find((x) => x.type_key === t.key), eff = d ? d.effective_status : 'faltante';
        const o = { key: t.key, req: t.required, title: t.title, sub: t.subtitle || '', issuer: d ? d.issuer || '' : '', number: d ? d.number || '' : '', issued: d ? day(d.issued_on) : null, expires: d ? day(d.expires_on) : null,
          size: d ? KB(d.file_size) : '—', pages: d ? d.pages : null, insured: d ? N(d.insured_amount) : null, filePath: d ? d.file_path : null, docId: d ? d.id : null };
        if (eff === 'revision' || eff === 'faltante') o.status = eff;
        const sub = d && (subsByDoc.get(d.id) || [])[0];
        if (sub) { o.pending = { file: (sub.file_path || '').split('/').pop(), path: sub.file_path }; o.submissionId = sub.id; }
        return o;
      });
      return { id: c.id, name: c.name, short: c.short_name, nit: c.nit, rep: c.legal_rep || '', repRole: c.rep_role || '', city: c.city || '', founded: c.founded_year || '', delivered: c.delivered_projects, units: c.built_units, sqm: U.fmtN(c.built_sqm),
        email: c.email || '', phone: c.phone || '', rating: c.rating == null ? '—' : N(c.rating), colors: [c.color_a, c.color_b], about: c.about || '', docs };
    });

    const ev = group(raw.milestone_evidence, 'milestone_id'), evts = group(raw.milestone_events, 'milestone_id');
    const chain = new Map(raw.onchain_records.filter((r) => r.kind === 'desembolso' && r.milestone_id).map((r) => [r.milestone_id, r]));
    const typ = group(raw.project_typologies, 'project_id'), amen = group(raw.project_amenities, 'project_id'), plans = group(raw.project_plans, 'project_id');
    const mss = group(raw.milestones, 'project_id'), revs = group(raw.project_reviews, 'project_id');
    const evidence = {}, changes = {};

    const projects = raw.projects.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'es')).map((pr) => {
      const ms = (mss.get(pr.id) || []).sort((a, b) => a.n - b.n);
      const types = (typ.get(pr.id) || []).map((t) => ({ name: t.name, area: N(t.area), beds: t.beds, baths: t.baths, parking: t.parking, price: N(t.price) }));
      const planRows = plans.get(pr.id) || [];
      const monthsData = ms.map((m) => {
        const date = new Date(m.month_date + 'T12:00:00'), evs = (ev.get(m.id) || []).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
        evidence[pr.id + ':' + m.n] = evs.map((e) => ({ id: e.id, kind: EV[e.kind], name: e.name, size: KB(e.size_bytes), path: e.storage_path, thumb: Live.thumbs.get(e.id) || null }));
        const c = chain.get(m.id);
        return { id: m.id, n: m.n, phase: m.phase_key, phaseName: phaseName[m.phase_key] || m.phase_key, icon: icons[m.phase_key] || 'hammer', label: D.MONTH_NAMES[date.getMonth()] + ' ' + date.getFullYear(), year: date.getFullYear(), month: date.getMonth(),
          tranchePct: N(m.tranche_pct), activities: m.activities || [], deviation: 0, photos: evs.filter((e) => e.kind === 'imagen').length, videos: evs.filter((e) => e.kind === 'video').length, report: m.report, changed: m.changed,
          plannedCum: N(m.planned_cum), actualCum: N(m.actual_cum), status: m.status, releasedOn: m.released_on, tx: c ? c.tx_hash : null, ledger: c ? c.ledger : null, reviewer: pr.interventor_id,
          history: (evts.get(m.id) || []).map((e) => ({ t: e.kind, by: e.by_role || 'sistema', byName: e.by_name, text: e.text, d: e.created_at })) };
      });
      const history = (revs.get(pr.id) || []).sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).map((r) => ({ t: r.kind, by: r.by_name || '', role: r.by_role, d: r.created_at, text: r.text || '' }));
      const photoUrl = pr.photo_path ? sb.storage.from('project-photos').getPublicUrl(pr.photo_path).data.publicUrl : null;
      const seed = hash(pr.id), floors = pr.floors || 12;
      const planos = planRows.map((x) => ({ key: x.kind, name: x.name, n: x.sheets, v: x.version, date: day(x.created_at), size: KB(x.file_size), path: x.file_path }));
      const areaTxt = pr.area_min == null ? '—' : N(pr.area_min) === N(pr.area_max) ? N(pr.area_min) + ' m²' : N(pr.area_min) + ' – ' + N(pr.area_max) + ' m²';
      const reg = { stage: pr.stage, submittedOn: pr.submitted_at, history };
      const form = { company: pr.company_id, name: pr.name || '', tagline: pr.tagline || '', city: pr.city || '', zone: pr.zone || '', address: pr.address || '', description: pr.description || '', towers: pr.towers || 1, floors: pr.floors || '', units: pr.units || '', parking: pr.parking == null ? '' : pr.parking,
        strata: pr.strata || 5, amenities: (amen.get(pr.id) || []).map((a) => a.amenity), typologies: types.length ? types.map((t) => ({ ...t })) : [{ name: '', area: '', beds: 2, baths: 2, parking: 1, price: '' }],
        photo: photoUrl, photoPath: pr.photo_path || null, interventor: pr.interventor_id || '', lic: { number: pr.lic_number || '', issuer: pr.lic_issuer || '', expires: day(pr.lic_expires) || '' }, fidu: { issuer: pr.fiducia_issuer || '', number: pr.fiducia_number || '' },
        planos: ['arq', 'est', 'hid', 'ele'].map((k, i) => { const x = planRows.find((r) => r.kind === k); return { key: k, name: ['Planos arquitectónicos', 'Planos estructurales', 'Planos hidrosanitarios', 'Planos eléctricos y de datos'][i], n: x ? x.sheets : '', v: x ? x.version : '1.0', file: x ? (x.file_path || '').split('/').pop() : '', size: x ? KB(x.file_size) : '', path: x ? x.file_path : null }; }),
        start: day(pr.start_date) || '', budget: N(pr.budget) || '', rows: monthsData.map((m) => ({ phase: m.phase, pct: m.tranchePct, acts: m.activities.join('; ') })), step: 1, confirm: false, editId: pr.id };
      return { id: pr.id, seed, name: pr.name, tagline: pr.tagline || '', city: pr.city || '', zone: pr.zone || '', address: pr.address || '', lat: N(pr.lat), lng: N(pr.lng), constructora: pr.company_id, interventor: pr.interventor_id, status: STAGE_LABEL[pr.stage],
        description: pr.description || '', towers: pr.towers || 1, floors, units: pr.units || 0, sold: pr.units_sold, parking: pr.parking || 0, area: areaTxt, priceFrom: N(pr.price_from) || 0, strata: pr.strata || 5, budget: N(pr.budget) || 0,
        start: day(pr.start_date) || '', months: pr.months || ms.length, end: day(pr.end_date) || '', currentMonth: pr.current_month, pendingReview: false, drift: 0.5, amenities: (amen.get(pr.id) || []).map((a) => a.amenity), typologies: types, planos,
        scene: { sky: seed % 3, floors: Math.max(8, Math.min(18, floors)), towers: Math.max(1, Math.min(3, pr.towers || 1)) }, photo: photoUrl, lic: form.lic, fidu: form.fidu, reg, form, monthsData, isLive: true, locked: pr.schedule_locked };
    });

    // Solicitudes de cambio de cronograma
    const items = group(raw.schedule_change_items, 'request_id'), nameOf = new Map(raw.profiles.map((p) => [p.id, p.full_name]));
    raw.schedule_change_requests.sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).forEach((r) => {
      (changes[r.project_id] = changes[r.project_id] || []).push({ id: r.id, pid: r.project_id, by: nameOf.get(r.requested_by) || 'Constructora', d: r.created_at, reason: r.reason, status: r.status, note: r.note || '',
        items: (items.get(r.id) || []).sort((a, b) => a.milestone_n - b.milestone_n).map((i) => ({ n: i.milestone_n, from: N(i.from_pct), to: N(i.to_pct) })) });
    });

    // Compras del comprador
    const pays = group(raw.payments, 'purchase_id');
    const mine = raw.purchases.filter((p) => p.buyer_id === me.id).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    let unit = null;
    if (mine.length) {
      const pu = mine[0], ps = (pays.get(pu.id) || []).sort((a, b) => a.n - b.n), ty = raw.project_typologies.find((t) => t.id === pu.typology_id) || {};
      const next = ps.find((x) => !x.paid_on);
      unit = { code: pu.unit_code, area: N(pu.area), price: N(pu.price), paid: ps.filter((x) => x.paid_on).reduce((s, x) => s + N(x.amount), 0), plan: pu.plan || '', next: next ? next.due_on : null, nextAmount: next ? N(next.amount) : 0,
        installments: [ps.filter((x) => x.n > 0).length, ps.filter((x) => x.n > 0 && x.paid_on).length], beds: ty.beds || 0, baths: ty.baths || 0, parking: ty.parking || 0, projectId: pu.project_id,
        payments: ps.map((x) => ({ n: x.n, due: x.due_on, amount: N(x.amount), paid: !!x.paid_on })) };
    }

    const user = { id: me.id, role: me.role, name: me.full_name || email, title: me.title || '', email, company: me.company_id, interventor: me.interventor_id, projects: projects.map((p) => p.id), unit, active: me.active };
    const users = raw.profiles.map((p) => ({ id: p.id, name: p.full_name || '(sin nombre)', email: p.email || '', role: p.role, active: p.active, company: p.company_id, interventor: p.interventor_id, title: p.title || '' }));
    const log = raw.audit_log.map((a) => ({ d: a.at, who: a.actor_name || 'Sistema', role: a.actor_role || 'sistema', pid: a.project_id, text: a.action, icon: a.icon || 'activity' }));
    const notifs = raw.notifications.map((n) => ({ id: n.id, i: NOTIF_ICON[n.kind] || 'bell', c: 'ic-blue', t: '<b>' + U.esc(n.title) + '</b>' + (n.body ? ' · ' + U.esc(n.body) : ''), s: U.fmtDT(n.created_at), r: ((n.link || '/panel').replace(/^\//, '').split('?')[0]) || 'panel', pid: n.project_id, unread: !n.read_at }));
    return { user, users, companies, interventors, projects, changes, evidence, log, notifs };
  }

  const replace = (arr, items) => { arr.length = 0; arr.push(...items); };

  /* ============================================================
     Carga de datos y sesión
     ============================================================ */
  async function loadRaw() {
    const t = ['phases', 'interventors', 'companies', 'document_types', 'v_company_documents', 'document_submissions', 'projects', 'project_typologies', 'project_amenities', 'project_plans', 'milestones',
      'milestone_events', 'milestone_evidence', 'project_reviews', 'schedule_change_requests', 'schedule_change_items', 'onchain_records', 'purchases', 'payments', 'profiles', 'notifications'];
    const [lists, audit] = await Promise.all([
      Promise.all(t.map((n) => fetchAll(n))),
      sb.from('audit_log').select('*').order('at', { ascending: false }).limit(80).then(({ data, error }) => { if (error) throw new Error('audit_log: ' + clean(error)); return data; })
    ]);
    const raw = Object.fromEntries(t.map((n, i) => [n, lists[i]])); raw.audit_log = audit; raw.notifications.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return raw;
  }

  Live.attach = (ctx) => { Live.ctx = ctx; };

  /** Carga todo lo visible para el usuario y lo deja en las estructuras que usan las vistas. */
  Live.load = async function () {
    const { data: s } = await sb.auth.getSession(); const au = s.session && s.session.user; if (!au) return null;
    const raw = await loadRaw(); const me = raw.profiles.find((p) => p.id === au.id);
    if (!me) throw new Error('Tu perfil aún no está disponible. Intenta de nuevo en unos segundos.');
    const model = buildModel(raw, me, au.email);
    replace(D.PROJECTS, model.projects); replace(D.CONSTRUCTORAS, model.companies); replace(D.INTERVENTORES, model.interventors); replace(D.USERS, model.users);
    Live.log = model.log; Live.notifs = model.notifs; Live.profiles = model.users;
    if (Live.ctx) { Live.ctx.db.changes = model.changes; Live.ctx.db.evidence = model.evidence; }
    return model.user;
  };

  /** Genera enlaces temporales para las fotos de evidencia de los proyectos indicados. */
  Live.ensureEvidence = async function (pids) {
    if (!Live.ctx) return;
    const need = [];
    Object.entries(Live.ctx.db.evidence).forEach(([k, items]) => { if (pids.includes(k.split(':')[0])) items.forEach((x) => { if (x.kind === 'img' && !x.thumb && x.path) need.push(x); }); });
    for (let i = 0; i < need.length; i += 80) {
      const chunk = need.slice(i, i + 80);
      const { data, error } = await sb.storage.from('milestone-evidence').createSignedUrls(chunk.map((x) => x.path), 3600);
      if (error) break;
      data.forEach((r, j) => { if (r.signedUrl) { chunk[j].thumb = r.signedUrl; Live.thumbs.set(chunk[j].id, r.signedUrl); } });
    }
  };

  /** Enlace temporal para abrir/descargar un archivo privado. */
  Live.signedUrl = async function (bucket, path) {
    if (!path) throw new Error('Este documento aún no tiene archivo.');
    const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 300);
    if (error) throw new Error(clean(error));
    return data.signedUrl;
  };

  /* ---------- autenticación ---------- */
  const authMsg = (e) => {
    const m = (e && e.message) || '';
    if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
    if (/email not confirmed/i.test(m)) return 'Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada.';
    if (/already registered|already been registered/i.test(m)) return 'Ya existe una cuenta con ese correo.';
    if (/password.*(short|least|weak)|at least \d+ characters/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.';
    if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    if (/signup.*disabled/i.test(m)) return 'El registro de nuevos usuarios está deshabilitado.';
    return clean(e);
  };
  Live.signIn = async (email, password) => { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw new Error(authMsg(error)); };
  Live.signUp = async (name, email, password) => {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: location.origin + location.pathname } });
    if (error) throw new Error(authMsg(error));
    if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error('Ya existe una cuenta con ese correo.');
    return { needsConfirm: !data.session };
  };
  Live.signOut = async () => { await sb.auth.signOut(); };
  Live.resetPassword = async (email) => { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) throw new Error(authMsg(error)); };
  Live.updatePassword = async (password) => { const { error } = await sb.auth.updateUser({ password }); if (error) throw new Error(authMsg(error)); };
  Live.onAuth = (cb) => sb.auth.onAuthStateChange((evt) => cb(evt));
  Live.hasSession = async () => { const { data } = await sb.auth.getSession(); return !!data.session; };

  /* ---------- archivos ---------- */
  async function upload(bucket, path, blob, type) {
    const { error } = await sb.storage.from(bucket).upload(path, blob, { contentType: type || blob.type || 'application/octet-stream', upsert: false });
    if (error) throw new Error('No se pudo subir el archivo: ' + clean(error));
    return path;
  }
  function reencode(file, max, q) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => { const img = new Image(); img.onerror = rej; img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob((b) => (b ? res(b) : rej(new Error('Imagen inválida'))), 'image/jpeg', q); }; img.src = r.result; }; r.readAsDataURL(file); });
  }
  const dataUrlToBlob = (u) => { const [h, b] = u.split(','), t = (h.match(/:(.*?);/) || [])[1] || 'image/jpeg', bin = atob(b), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: t }); };

  /* ============================================================
     Acciones de negocio (todas pasan por RPC)
     ============================================================ */
  Live.submitDocument = async (company, d, file, f) => {
    const path = company.id + '/' + d.key + '-' + Date.now() + '-' + safe(file.name);
    await upload('company-documents', path, file, file.type);
    return rpc('submit_document', { p_type_key: d.key, p_number: f.number || null, p_issuer: f.issuer || d.issuer || null, p_issued: f.issued || null, p_expires: f.expires || null, p_file_path: path, p_file_size: file.size, p_company: company.id });
  };
  Live.reviewDocument = (submissionId, approve, note) => rpc('review_document_submission', { p_submission: submissionId, p_approve: approve, p_note: note || null });

  Live.submitMilestone = async (p, m, items, summary, userId) => {
    // 1) sube lo nuevo y registra las evidencias; 2) envía el hito
    for (let i = 0; i < items.length; i++) {
      const it = items[i]; if (!it.file) continue;
      const blob = it.kind === 'img' ? await reencode(it.file, 1600, 0.82) : it.file;
      const path = p.id + '/' + m.id + '/' + Date.now() + '-' + i + '-' + safe(it.kind === 'img' ? it.name.replace(/\.\w+$/, '') + '.jpg' : it.name);
      await upload('milestone-evidence', path, blob, it.kind === 'img' ? 'image/jpeg' : it.file.type);
      const { error } = await sb.from('milestone_evidence').insert({ milestone_id: m.id, kind: EV_BACK[it.kind], name: it.name, storage_path: path, size_bytes: blob.size, uploaded_by: userId });
      if (error) throw new Error(clean(error));
    }
    // borra las evidencias que el usuario quitó de la lista
    const keep = new Set(items.filter((x) => x.id).map((x) => x.id));
    for (const old of ((Live.ctx.db.evidence[p.id + ':' + m.n]) || [])) if (old.id && !keep.has(old.id)) { await sb.from('milestone_evidence').delete().eq('id', old.id); }
    return rpc('submit_milestone', { p_milestone: m.id, p_summary: summary || null, p_reported_cum: null });
  };
  Live.reviewMilestone = (m, approve, note, checks) => rpc('review_milestone', { p_milestone: m.id, p_approve: approve, p_note: note || null, p_checks: approve ? checks : null });

  Live.saveProject = async (F, files, submit, company) => {
    const draft = uuid(); let photoPath = F.photoPath || null;
    if (F.photo && /^data:/.test(F.photo)) photoPath = await upload('project-photos', company + '/' + uuid() + '.jpg', dataUrlToBlob(F.photo), 'image/jpeg');
    else if (!F.photo) photoPath = null;
    const plans = [];
    for (const x of F.planos) {
      const f = files && files[x.key]; let path = x.path || null, size = null;
      if (f) { path = await upload('project-plans', company + '/' + draft + '/' + x.key + '-' + safe(f.name), f, f.type || 'application/pdf'); size = f.size; }
      if (path && Number(x.n) > 0) plans.push({ kind: x.key, name: x.name, sheets: Number(x.n), version: x.v || '1.0', file_path: path, file_size: size });
    }
    const payload = { name: F.name, tagline: F.tagline, description: F.description, city: F.city, zone: F.zone, address: F.address, towers: F.towers, floors: F.floors, units: F.units, parking: F.parking === '' ? null : F.parking, strata: F.strata,
      budget: F.budget, start_date: F.start, photo_path: photoPath, lic_number: F.lic.number, lic_issuer: F.lic.issuer, lic_expires: F.lic.expires || null, fiducia_issuer: F.fidu.issuer, fiducia_number: F.fidu.number, interventor_id: F.interventor || null,
      typologies: F.typologies.filter((t) => t.name && t.area > 0 && t.price > 0).map((t) => ({ name: t.name, area: t.area, beds: t.beds, baths: t.baths, parking: t.parking, price: t.price })),
      amenities: F.amenities, plans, rows: F.rows.map((r) => ({ phase: r.phase, pct: r.pct, acts: r.acts })) };
    return rpc('save_project', { p_id: F.editId || null, p_payload: payload, p_submit: !!submit });
  };
  Live.reviewProject = (id, approve, note) => rpc('review_project', { p_id: id, p_approve: approve, p_note: note || null });
  Live.activateProject = (id, approve, note) => rpc('activate_project', { p_id: id, p_approve: approve, p_note: note || null });
  Live.requestChange = (pid, reason, items) => rpc('request_schedule_change', { p_project: pid, p_reason: reason, p_items: items });
  Live.resolveChange = (id, approve, note) => rpc('resolve_schedule_change', { p_request: id, p_approve: approve, p_note: note || null });

  // Administración
  Live.setRole = (user, role, company, interventor) => rpc('admin_set_role', { p_user: user, p_role: role, p_company: company || null, p_interventor: interventor || null });
  Live.setActive = (user, active) => rpc('admin_set_active', { p_user: user, p_active: active });
  Live.upsertCompany = (id, p) => rpc('admin_upsert_company', { p_id: id || null, p });
  Live.upsertInterventor = (id, p) => rpc('admin_upsert_interventor', { p_id: id || null, p });
  Live.createPurchase = (a) => rpc('create_purchase', { p_buyer: a.buyer, p_project: a.project, p_unit_code: a.unit, p_typology: a.typology || null, p_price: a.price, p_installments: a.installments || 24, p_initial_date: a.date || null });
  Live.markPaid = (id) => rpc('mark_payment_paid', { p_payment: id });
  Live.markNotificationsRead = async () => { await sb.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null); };
  Live.listPayments = async (purchaseId) => { const { data } = await sb.from('payments').select('*').eq('purchase_id', purchaseId).order('n'); return data || []; };

  Live.buildModel = buildModel; // para pruebas
  window.Live = Live;
})();
