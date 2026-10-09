// INN-LOCK · Escenario de integración: recorre la página real en modo «en vivo» contra la base simulada.
// Uso (con la página e2e abierta):  await runScenario()  → devuelve [{name, ok, detail}]
(function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const sql = async (q, p) => (await window.__db.query(q, p)).rows;
  const P1 = 'd0000000-0000-4000-8000-000000000001';
  const results = [];
  async function test(name, fn) {
    try { const d = await fn(); results.push({ name, ok: d !== false, detail: typeof d === 'string' ? d : '' }); }
    catch (e) { results.push({ name, ok: false, detail: e.message }); }
  }
  const need = (c, msg) => { if (!c) throw new Error(msg || 'condición falsa'); return true; };
  const text = () => ($('#view') ? $('#view').innerText : '');
  const clean = (t) => !/undefined|NaN|\[object|Invalid Date/.test(t);
  async function login(email, pass) {
    if (!$('.login')) { $('[data-act=usermenu]').click(); await wait(150); $('[data-act=logout]').click(); await wait(700); }
    $('#email').value = email; $('#pass').value = pass || 'demo1234'; $('#live-form button[type=submit]').click();
    for (let i = 0; i < 60 && $('.login') && !$('.form-error'); i++) await wait(200);
    await wait(600);
  }
  async function pick(name) { $('[data-act=projmenu]').click(); await wait(250); clickText('[data-act=pick-project]', name); await wait(800); }
  async function go(route, ms) { location.hash = '#/' + route; await wait(ms || 700); }
  const pdf = (n) => new File(['%PDF-1.4 demo'], n, { type: 'application/pdf' });
  const setFiles = (input, files) => { const dt = new DataTransfer(); files.forEach((f) => dt.items.add(f)); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); };
  const clickText = (sel, txt) => { const b = $$(sel).find((x) => x.innerText.includes(txt)); if (!b) throw new Error('No hay «' + txt + '» en ' + sel); b.click(); return b; };
  const input = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };

  window.__mkImg = (i) => new Promise((res) => { const c = document.createElement('canvas'); c.width = 1400; c.height = 900; const g = c.getContext('2d'); g.fillStyle = ['#12A8F0', '#FF9A00', '#0E9F6E', '#7C6BE0'][i % 4]; g.fillRect(0, 0, 1400, 900); g.fillStyle = '#fff'; g.font = 'bold 110px sans-serif'; g.fillText('Foto de obra ' + (i + 1), 120, 480); c.toBlob((b) => res(new File([b], 'obra_' + (i + 1) + '.png', { type: 'image/png' }))); });
  window.__progress = results;
  window.runScenario = async function () {
    results.length = 0;

    /* ---------- Administrador ---------- */
    await login('admin@inn-lock.co');
    await test('admin: panel muestra al usuario y los 3 proyectos', async () => { need($('.user-btn .t').innerText.includes('Laura'), 'usuario'); $('[data-act=projmenu]').click(); await wait(200); const n = $$('[data-act=pick-project]').length; $('[data-act=projmenu]').click(); return need(n === 3, 'proyectos=' + n); });
    await test('admin: proyectos con avance y sin valores rotos', async () => { await go('proyectos'); need($$('.pcard').length === 3, 'tarjetas'); return need(clean(text()), 'texto roto: ' + text().slice(0, 200)); });
    for (const r of ['panel', 'info', 'legal', 'obra', 'fondos', 'auditoria']) await test('admin: «' + r + '» sin valores rotos', async () => { await go(r, 900); const t = text(); need(t.length > 300, 'vacía'); return need(clean(t), (t.match(/.{30}(undefined|NaN|Invalid Date).{30}/) || [])[0]); });
    await test('admin: línea de tiempo con meses reales (p. ej. «Octubre 2026»)', async () => { await go('obra', 900); return need(/(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre) 20\d\d/i.test(text()), 'sin meses'); });
    await test('admin: usuarios con correo, rol y acciones', async () => { await go('usuarios', 900); const t = text(); need(t.includes('comprador@inn-lock.co') && t.includes('interventor@inn-lock.co'), 'correos'); need($$('[data-adm=role]').length >= 4, 'editar'); return need($$('[data-adm=buy]').length >= 1, 'asignar unidad'); });
    await test('admin: auditoría con acciones registradas', async () => { await go('auditoria', 900); return need(text().includes('Visita de obra') || text().includes('Validó'), 'sin registros'); });

    /* ---------- Comprador ---------- */
    await login('comprador@inn-lock.co');
    await test('comprador: abre en su proyecto y ve su inversión', async () => { need($('.proj-btn .t b').innerText === 'Torres del Parque', 'proyecto por defecto: ' + $('.proj-btn .t b').innerText); await go('mi-inversion', 900); const t = text(); need(t.includes('Torre A · Apto. 1204'), 'unidad'); need(/17 de 24 cuotas pagadas/.test(t), 'cuotas'); need($$('#view tbody tr').length === 24, 'filas=' + $$('#view tbody tr').length); return need(clean(t), 'roto'); });
    await test('comprador: no ve revisiones ni solicitudes', async () => { await go('revisiones', 600); need(location.hash === '#/panel', 'revisiones'); await go('solicitudes', 600); return need(location.hash === '#/panel', 'solicitudes'); });
    await test('comprador: ve el avance y los desembolsos de su proyecto', async () => { await go('fondos', 900); need(/Desembolsado/.test(text()), 'fondos'); return need(clean(text())); });

    /* ---------- Constructora: documentos ---------- */
    await login('constructora@inn-lock.co');
    await test('constructora: ve sus documentos con estado (cámara por vencer)', async () => { await go('legal', 900); const t = text(); need(/Por vencer/.test(t), 'por vencer'); need(t.includes('Registro Único Tributario') && t.includes('Póliza de seguro'), 'docs'); return need(clean(t), (t.match(/.{30}(undefined|NaN).{30}/) || [])[0]); });
    await test('constructora: renueva la cámara → queda «en validación»', async () => {
      await go('legal', 800); const btn = $$('[data-act=upload-doc]').find((b) => b.dataset.k === 'camara'); btn.click(); await wait(400);
      setFiles($('#file'), [pdf('camara_nueva.pdf')]); await wait(300); $('#num').value = 'CE-NUEVO-1'; $('#ok').click(); await wait(2500);
      const r = await sql(`select effective_status s from v_company_documents where type_key = 'camara' and company_id = 'a0000000-0000-4000-8000-000000000001'`); need(r[0].s === 'revision', 'estado=' + r[0].s);
      return need((await sql(`select count(*) n from storage.objects where bucket_id = 'company-documents'`))[0].n === 1, 'archivo no subido'); });
    await login('admin@inn-lock.co');
    await test('admin: valida el documento → «vigente»', async () => { await pick('Torres del Parque'); await go('legal', 900); const v = $$('[data-act=validate-doc]'); need(v.length >= 1, 'no hay botón Validar'); v[0].click(); await wait(2500); const r = await sql(`select effective_status s from v_company_documents where type_key = 'camara' and company_id = 'a0000000-0000-4000-8000-000000000001'`); return need(r[0].s === 'vigente', 'estado=' + r[0].s); });

    /* ---------- Hito mensual: constructora envía, interventor aprueba ---------- */
    await login('constructora@inn-lock.co');
    await test('constructora: envía el hito con fotos reales y un informe', async () => {
      await go('obra', 1200); $('[data-act=submit-month]').click(); await wait(400);
      const imgs = []; for (let i = 0; i < 4; i++) imgs.push(await window.__mkImg(i)); setFiles($('#ev'), imgs.concat([pdf('informe.pdf')])); await wait(1600);
      need($$('#ev-list .ev-tile').length === 5, 'miniaturas'); $('#rep').value = 'Estructura piso 14'; $('#go').click();
      for (let i = 0; i < 40; i++) { await wait(500); const r = await sql(`select status from milestones where project_id = '${P1}' and n = 12`); if (r[0].status === 'revision') break; }
      const r = await sql(`select m.status, m.report, (select count(*) from milestone_evidence e where e.milestone_id = m.id) ev from milestones m where m.project_id = '${P1}' and m.n = 12`);
      need(r[0].status === 'revision' && r[0].report === true && r[0].ev === 5, JSON.stringify(r[0])); return need((await sql(`select count(*) n from storage.objects where bucket_id = 'milestone-evidence'`))[0].n === 5, 'archivos'); });
    await login('interventor@inn-lock.co');
    await test('interventor: ve la evidencia real (fotos con enlace) y aprueba → desembolso', async () => {
      await pick('Torres del Parque'); await go('obra', 1800); need($$('.tl-card .ev-tile img').some((i) => i.src.startsWith('blob:')), 'sin fotos'); const b = $$('[data-act=approve-month]'); b[b.length - 1].click(); await wait(500);
      need(!/undefined|NaN/.test($('.modal h3').innerText), 'título: ' + $('.modal h3').innerText); need($$('.modal .ev-tile').length === 5, 'galería'); $$('.modal .ck').forEach((c) => c.click()); await wait(150); $('#go').click();
      for (let i = 0; i < 40; i++) { await wait(500); const r = await sql(`select status from milestones where project_id = '${P1}' and n = 12`); if (r[0].status === 'desembolsado') break; }
      const r = await sql(`select m.status, d.amount, (select status from milestones x where x.project_id = m.project_id and x.n = 13) next from milestones m join disbursements d on d.milestone_id = m.id where m.project_id = '${P1}' and m.n = 12`);
      return need(r[0].status === 'desembolsado' && Math.round(r[0].amount) === 1645747200 && r[0].next === 'en_curso', JSON.stringify(r[0])); });
    await test('interventor: bloqueado en Altos de Chicó mientras la cámara de su constructora esté vencida', async () => {
      $('[data-act=projmenu]').click(); await wait(200); clickText('[data-act=pick-project]', 'Altos de Chicó'); await wait(700); await go('obra', 1400);
      $$('[data-act=approve-month]')[0].click(); await wait(500); const t = $('.modal').innerText; $('.modal [data-close]').click(); return need(/No se puede aprobar/.test(t), t.slice(0, 120)); });

    /* ---------- Registro de un proyecto nuevo (asistente) ---------- */
    await login('constructora@inn-lock.co');
    let NEW;
    await test('constructora: el asistente exige volver a elegir los planos si solo hay datos de ejemplo', async () => {
      await go('nuevo', 800); $('[data-w=sample]').click(); await wait(300); for (let i = 0; i < 3; i++) { $('[data-w=next]').click(); await wait(350); }
      const c = $('[data-f=confirm]'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); $('[data-w=submit]').click(); await wait(600);
      return need(/Vuelve a seleccionar el archivo/.test($('#wiz-errors').innerText), $('#wiz-errors').innerText.slice(0, 100)); });
    await test('constructora: sube planos y foto, y envía el proyecto a interventoría', async () => {
      $('[data-w=goto][data-n="2"]').click(); await wait(400); setFiles($('#pl-0'), [pdf('arq.pdf')]); await wait(400); setFiles($('#pl-1'), [pdf('est.pdf')]); await wait(400);
      $('[data-w=goto][data-n="1"]').click(); await wait(400); setFiles($('#f-photo'), [await window.__mkImg(2)]); await wait(1200);
      $('[data-w=goto][data-n="1"]'); for (let i = 0; i < 3; i++) { $('[data-w=next]').click(); await wait(400); }
      const c = $('[data-f=confirm]'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); $('[data-w=submit]').click();
      for (let i = 0; i < 60; i++) { await wait(500); const r = await sql(`select id from projects where name = 'Parque Sur Residencial'`); if (r.length) { NEW = r[0].id; break; } }
      need(NEW, 'no se creó'); const p = (await sql(`select stage, months, photo_path, (select count(*) from project_plans where project_id = projects.id) planos, (select count(*) from milestones where project_id = projects.id) hitos from projects where id = $1`, [NEW]))[0];
      return need(p.stage === 'interventor' && p.hitos === 22 && p.planos === 2 && p.photo_path, JSON.stringify(p)); });
    await test('constructora: ve su proyecto «en revisión de interventoría»', async () => { await go('proyectos', 1000); return need(text().includes('Parque Sur Residencial') && /revisión de interventoría/i.test(text())); });
    await login('interventor@inn-lock.co');
    await test('interventor: revisa y aprueba el cronograma del nuevo proyecto', async () => {
      await go('solicitudes', 1000); need(text().includes('Parque Sur Residencial'), 'no aparece'); $('[data-w=sol-approve]').click(); await wait(400); $$('.modal .ck').forEach((c) => c.click()); await wait(150); $('#go').click(); await wait(2500);
      return need((await sql(`select stage from projects where id = $1`, [NEW]))[0].stage === 'admin'); });
    await login('admin@inn-lock.co');
    await test('admin: valida y activa → cronograma bloqueado y mes 1 en curso', async () => {
      await go('solicitudes', 1000); $('[data-w=sol-activate]').click(); await wait(400); $('#go').click(); await wait(2500);
      const p = (await sql(`select stage, schedule_locked from projects where id = $1`, [NEW]))[0]; need(p.stage === 'activo' && p.schedule_locked, JSON.stringify(p));
      return need((await sql(`select status from milestones where project_id = $1 and n = 1`, [NEW]))[0].status === 'en_curso'); });
    await login('constructora@inn-lock.co');
    await test('constructora: solicita un cambio de cronograma y el interventor lo aprueba', async () => {
      $('[data-act=projmenu]').click(); await wait(200); clickText('[data-act=pick-project]', 'Parque Sur'); await wait(700); await go('obra', 1500);
      $('[data-w=chg-open]').click(); await wait(500); const ins = $$('.chg-in'); const a = ins[2], b = ins[3], A = +a.value, B = +b.value;
      input(a, (A + 0.4).toFixed(2)); input(b, (B - 0.4).toFixed(2)); input($('#chg-reason'), 'Retraso en la entrega del acero por clima adverso.'); await wait(200);
      need(!$('#chg-go').disabled, 'botón deshabilitado: ' + $('#chg-sum').innerText); $('#chg-go').click(); await wait(2500);
      const r = (await sql(`select id, status from schedule_change_requests where project_id = $1`, [NEW]))[0]; need(r && r.status === 'pendiente', 'solicitud');
      await login('interventor@inn-lock.co'); await go('solicitudes', 1200); $('[data-w=chg-approve]').click(); await wait(400); $('#ck').click(); await wait(150); $('#go').click(); await wait(2500);
      const m = (await sql(`select tranche_pct, changed from milestones where project_id = $1 and n = 4`, [NEW]))[0]; return need(m.changed === true && Math.abs(m.tranche_pct - (A + 0.4)) < 0.01, JSON.stringify(m)); });

    /* ---------- Administración ---------- */
    await login('admin@inn-lock.co');
    await test('admin: registra una constructora y un interventor desde la página', async () => {
      await go('usuarios', 900); $('[data-adm=co-new]').click(); await wait(300); $('#c-name').value = 'Constructora Prueba S.A.S.'; $('#c-nit').value = '900.999.111-2'; $('#c-city').value = 'Cali'; $('#ok').click(); await wait(2200);
      await go('usuarios', 900); $('[data-adm=int-new]').click(); await wait(300); $('#i-name').value = 'Ing. Prueba'; $('#i-firm').value = 'Interventoría Prueba'; $('#ok').click(); await wait(2200);
      return need((await sql(`select count(*) n from companies where nit = '900.999.111-2'`))[0].n === 1 && (await sql(`select count(*) n from interventors where firm = 'Interventoría Prueba'`))[0].n === 1, 'no se crearon'); });
    await test('registro de usuarios: la cuenta nueva nace como comprador y el admin le asigna rol', async () => {
      await login('nadie@x.co', 'x'); // deja la pantalla de inicio de sesión visible
      need($('.form-error'), 'debía fallar el ingreso'); $('[data-act=login-view][data-v=up]').click(); await wait(300);
      $('#lname').value = 'Pedro Prueba'; $('#email').value = 'pedro@prueba.co'; $('#pass').value = 'clave-segura-1'; $('#live-form button[type=submit]').click(); await wait(2500);
      need(/confirmar tu cuenta/.test($('#login-err').innerText), 'mensaje de confirmación');
      need((await sql(`select role from profiles where email = 'pedro@prueba.co'`))[0].role === 'comprador', 'rol inicial');
      await login('admin@inn-lock.co'); await go('usuarios', 1000); const row = $$('#view tbody tr').find((r) => r.innerText.includes('pedro@prueba.co')); need(row, 'no aparece en la lista'); row.querySelector('[data-adm=role]').click(); await wait(400);
      const sel = $('#r-role'); sel.value = 'constructora'; sel.dispatchEvent(new Event('change', { bubbles: true })); await wait(200); const co = $('#r-company'); co.value = [...co.options].find((o) => o.text.includes('Prueba')).value; $('#ok').click(); await wait(2500);
      return need((await sql(`select role, company_id from profiles where email = 'pedro@prueba.co'`))[0].role === 'constructora', 'rol no cambió'); });
    await test('admin: asigna una unidad al comprador (se programan 25 pagos)', async () => {
      await go('usuarios', 900); const row = $$('#view tbody tr').find((r) => r.innerText.includes('comprador@inn-lock.co')); row.querySelector('[data-adm=buy]').click(); await wait(500);
      $('#p-proj').value = P1; $('#p-proj').dispatchEvent(new Event('change', { bubbles: true })); await wait(200); $('#p-unit').value = 'Torre B · Apto. 905'; $('#ok').click(); await wait(2800);
      const r = (await sql(`select p.id, (select count(*) from payments where purchase_id = p.id) n from purchases p where unit_code = 'Torre B · Apto. 905'`))[0]; return need(r && r.n === 25, JSON.stringify(r)); });
    return results;
  };
})();
