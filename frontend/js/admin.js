/* INN-LOCK · Administración en modo real: usuarios y roles, constructoras, interventores y ventas. */
(function () {
  'use strict';
  const D = window.INNLOCK, U = window.UI, I = U.icon, esc = U.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  let ctx = null;
  const ROLE = { admin: 'Administrador', comprador: 'Comprador', constructora: 'Constructora', interventor: 'Interventor' };
  const RCLS = { admin: 'b-gold', comprador: 'b-info', constructora: 'b-ok', interventor: 'b-warn' };
  const opt = (v, t, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(t)}</option>`;
  const fld = (id, label, val, o) => { o = o || {}; return `<div class="field" style="margin-bottom:12px"><label for="${id}">${label}${o.req ? ' <span style="color:var(--bad)">*</span>' : ''}</label><input class="input" id="${id}" type="${o.type || 'text'}" value="${esc(val == null ? '' : val)}" ${o.ph ? `placeholder="${o.ph}"` : ''} ${o.min != null ? `min="${o.min}"` : ''}></div>`; };
  const val = (m, id) => $('#' + id, m).value.trim();

  function view() {
    const users = D.USERS, cos = D.CONSTRUCTORAS, ints = D.INTERVENTORES, me = ctx.state.user;
    const coName = (id) => (cos.find((c) => c.id === id) || {}).short || '—', inName = (id) => (ints.find((x) => x.id === id) || {}).name || '—';
    return `<div class="page-head"><div><h1>Usuarios y organizaciones</h1><p>Asigna roles a quienes se registran, y administra las constructoras e interventores de la plataforma.</p></div>
      <div class="row row-wrap"><button class="btn btn-ghost" data-adm="int-new">${I('plus')}Nuevo interventor</button><button class="btn btn-primary" data-adm="co-new">${I('plus')}Nueva constructora</button></div></div>
      <div class="alert a-info reveal" style="margin-bottom:20px">${I('info')}<p>Las personas se registran solas en la página y aparecen aquí como <strong>compradores</strong>. Para convertir a alguien en constructora o interventor, primero registra su organización y luego edita su rol.</p></div>
      <div class="card card-pad reveal"><div class="card-head"><div><h3>Usuarios (${users.length})</h3></div></div><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Organización</th><th>Estado</th><th></th></tr></thead><tbody>
      ${users.map((u) => `<tr><td><div class="cell-user"><span class="avatar">${U.initials(u.name)}</span><div><b>${esc(u.name)}</b>${u.id === me.id ? ' <span class="badge b-mute">Tú</span>' : ''}<div class="muted" style="font-size:12.5px">${esc(u.email)}</div></div></div></td>
        <td><span class="badge ${RCLS[u.role]}">${ROLE[u.role]}</span></td><td>${u.role === 'constructora' ? esc(coName(u.company)) : u.role === 'interventor' ? esc(inName(u.interventor)) : '—'}</td>
        <td>${u.active ? '<span class="badge b-ok"><span class="dot"></span>Activo</span>' : '<span class="badge b-bad">Inactivo</span>'}</td>
        <td style="text-align:right;white-space:nowrap">${u.role === 'comprador' ? `<button class="btn btn-ghost btn-sm" data-adm="buy" data-id="${u.id}">${I('key-round')}Asignar unidad</button> ` : ''}<button class="btn btn-soft btn-sm" data-adm="role" data-id="${u.id}">${I('user-cog')}Editar</button></td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="grid g-2" style="margin-top:22px;align-items:start">
        <div class="card card-pad reveal"><div class="card-head"><div><h3>Constructoras (${cos.length})</h3></div></div>${cos.length ? `<div class="stack" style="gap:10px">${cos.map((c) => `<div class="row" style="padding:12px 14px;border:1px solid var(--line);border-radius:14px"><div class="co-logo" style="width:40px;height:40px;font-size:14px;border-radius:12px;background:linear-gradient(135deg,${c.colors[0]},${c.colors[1]})">${U.initials(c.short)}</div><div class="grow"><b style="font-size:14px">${esc(c.name)}</b><div class="muted" style="font-size:12.5px">NIT ${esc(c.nit)} · ${esc(c.city || '—')}</div></div><button class="btn btn-ghost btn-sm" data-adm="co-edit" data-id="${c.id}">Editar</button></div>`).join('')}</div>` : `<div class="empty">${I('building')}Aún no hay constructoras.</div>`}</div>
        <div class="card card-pad reveal"><div class="card-head"><div><h3>Interventores (${ints.length})</h3></div></div>${ints.length ? `<div class="stack" style="gap:10px">${ints.map((x) => `<div class="row" style="padding:12px 14px;border:1px solid var(--line);border-radius:14px"><span class="avatar" style="box-shadow:none;background:linear-gradient(135deg,#FFD54A,#FF9A00);color:#3B2500">${U.initials(x.name.replace('Ing. ', ''))}</span><div class="grow"><b style="font-size:14px">${esc(x.name)}</b><div class="muted" style="font-size:12.5px">${esc(x.firm)}</div></div><button class="btn btn-ghost btn-sm" data-adm="int-edit" data-id="${x.id}">Editar</button></div>`).join('')}</div>` : `<div class="empty">${I('clipboard-check')}Aún no hay interventores.</div>`}</div>
      </div>`;
  }

  function roleModal(u) {
    const cos = D.CONSTRUCTORAS, ints = D.INTERVENTORES;
    U.modal({ title: 'Editar usuario', body: `<div class="row" style="gap:12px;margin-bottom:16px"><span class="avatar">${U.initials(u.name)}</span><div><b>${esc(u.name)}</b><div class="muted" style="font-size:12.5px">${esc(u.email)}</div></div></div>
      <div class="field"><label for="r-role">Rol</label><select class="input" id="r-role">${Object.keys(ROLE).map((k) => opt(k, ROLE[k], u.role === k)).join('')}</select></div>
      <div class="field" id="r-co" ${u.role === 'constructora' ? '' : 'hidden'}><label for="r-company">Constructora</label><select class="input" id="r-company">${cos.map((c) => opt(c.id, c.name, u.company === c.id)).join('') || opt('', 'No hay constructoras registradas')}</select></div>
      <div class="field" id="r-in" ${u.role === 'interventor' ? '' : 'hidden'}><label for="r-int">Interventor / firma</label><select class="input" id="r-int">${ints.map((x) => opt(x.id, x.name + ' · ' + x.firm, u.interventor === x.id)).join('') || opt('', 'No hay interventores registrados')}</select></div>
      <label class="check" style="margin-top:6px"><input type="checkbox" id="r-active" ${u.active ? 'checked' : ''} ${u.id === ctx.state.user.id ? 'disabled' : ''}> Usuario activo</label>
      ${u.id === ctx.state.user.id ? '<p class="muted" style="font-size:12.5px;margin-top:10px">No puedes quitarte el rol de administrador desde aquí si eres el único.</p>' : ''}`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ok">${I('check')}Guardar</button>`,
      onMount: (m, close) => {
        const sel = $('#r-role', m); sel.addEventListener('change', () => { $('#r-co', m).hidden = sel.value !== 'constructora'; $('#r-in', m).hidden = sel.value !== 'interventor'; });
        $('#ok', m).addEventListener('click', () => {
          const role = sel.value, co = $('#r-company', m).value, it = $('#r-int', m).value, active = $('#r-active', m).checked;
          if (role === 'constructora' && !co) { U.toast('Primero registra y elige una constructora', 'err'); return; }
          if (role === 'interventor' && !it) { U.toast('Primero registra y elige un interventor', 'err'); return; }
          close();
          ctx.act(async () => {
            if (role !== u.role || (role === 'constructora' && co !== u.company) || (role === 'interventor' && it !== u.interventor)) await window.Live.setRole(u.id, role, co, it);
            if (active !== u.active) await window.Live.setActive(u.id, active);
          }, 'Usuario actualizado');
        });
      } });
  }

  function companyModal(c) {
    c = c || {};
    U.modal({ title: c.id ? 'Editar constructora' : 'Nueva constructora', wide: true, body: `<div class="grid g-2" style="gap:0 14px">${fld('c-name', 'Razón social', c.name, { req: 1 })}${fld('c-short', 'Nombre corto', c.short)}${fld('c-nit', 'NIT', c.nit, { req: 1, ph: '900.123.456-7' })}${fld('c-city', 'Ciudad', c.city)}${fld('c-rep', 'Representante legal', c.rep)}${fld('c-role', 'Cargo', c.repRole, { ph: 'Representante legal' })}${fld('c-email', 'Correo', c.email, { type: 'email' })}${fld('c-phone', 'Teléfono', c.phone)}${fld('c-year', 'Año de fundación', c.founded, { type: 'number', min: 1900 })}</div>
      <div class="field" style="margin:0"><label for="c-about">Descripción</label><textarea class="input" id="c-about">${esc(c.about || '')}</textarea></div>`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ok">${I('check')}Guardar</button>`,
      onMount: (m, close) => $('#ok', m).addEventListener('click', () => {
        if (!val(m, 'c-name') || !val(m, 'c-nit')) { U.toast('Razón social y NIT son obligatorios', 'err'); return; }
        const p = { name: val(m, 'c-name'), short_name: val(m, 'c-short'), nit: val(m, 'c-nit'), city: val(m, 'c-city'), legal_rep: val(m, 'c-rep'), rep_role: val(m, 'c-role'), email: val(m, 'c-email'), phone: val(m, 'c-phone'), founded_year: val(m, 'c-year') || null, about: $('#c-about', m).value.trim() };
        close(); ctx.act(() => window.Live.upsertCompany(c.id, p), 'Constructora guardada');
      }) });
  }

  function interventorModal(x) {
    x = x || {};
    U.modal({ title: x.id ? 'Editar interventor' : 'Nuevo interventor', body: `${fld('i-name', 'Nombre', x.name, { req: 1, ph: 'Ing. Nombre Apellido' })}${fld('i-firm', 'Firma de interventoría', x.firm, { req: 1 })}${fld('i-lic', 'Matrícula profesional', x.license)}${fld('i-email', 'Correo', x.email, { type: 'email' })}`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ok">${I('check')}Guardar</button>`,
      onMount: (m, close) => $('#ok', m).addEventListener('click', () => {
        if (!val(m, 'i-name') || !val(m, 'i-firm')) { U.toast('Nombre y firma son obligatorios', 'err'); return; }
        const p = { name: val(m, 'i-name'), firm: val(m, 'i-firm'), license: val(m, 'i-lic'), email: val(m, 'i-email') };
        close(); ctx.act(() => window.Live.upsertInterventor(x.id, p), 'Interventor guardado');
      }) });
  }

  function purchaseModal(u) {
    const projects = D.PROJECTS.filter((p) => p.reg && p.reg.stage === 'activo');
    if (!projects.length) { U.toast('Aún no hay proyectos activos para vender', 'err'); return; }
    const typesOf = (pid) => (D.PROJECTS.find((p) => p.id === pid) || { typologies: [] }).typologies;
    U.modal({ title: 'Asignar unidad a ' + esc(u.name), body: `<div class="field"><label for="p-proj">Proyecto</label><select class="input" id="p-proj">${projects.map((p) => opt(p.id, p.name)).join('')}</select></div>
      <div class="field"><label for="p-typ">Tipología</label><select class="input" id="p-typ"></select></div>
      <div class="grid g-2" style="gap:0 14px">${fld('p-unit', 'Unidad', '', { req: 1, ph: 'Torre A · Apto. 1204' })}${fld('p-price', 'Precio (COP)', '', { req: 1, type: 'number', min: 1 })}${fld('p-inst', 'Cuotas durante la obra', 24, { type: 'number', min: 1 })}${fld('p-date', 'Fecha de la cuota inicial', new Date().toISOString().slice(0, 10), { type: 'date' })}</div>
      <p class="muted" style="font-size:12.5px">Se programan: 10 % de cuota inicial y 20 % en cuotas mensuales durante la obra. El resto corresponde al crédito del comprador.</p>`,
      footer: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ok">${I('check')}Registrar venta</button>`,
      onMount: (m, close) => {
        const proj = $('#p-proj', m), typ = $('#p-typ', m), price = $('#p-price', m);
        const fill = () => { typ.innerHTML = typesOf(proj.value).map((t, i) => `<option value="${i}">${esc(t.name)} · ${t.area} m²</option>`).join(''); setPrice(); };
        const setPrice = () => { const t = typesOf(proj.value)[+typ.value]; if (t) price.value = t.price; };
        proj.addEventListener('change', fill); typ.addEventListener('change', setPrice); fill();
        $('#ok', m).addEventListener('click', () => {
          const tdef = typesOf(proj.value)[+typ.value]; if (!val(m, 'p-unit') || !(+price.value > 0)) { U.toast('Indica la unidad y el precio', 'err'); return; }
          close(); ctx.act(async () => { const typId = await typologyId(proj.value, tdef); await window.Live.createPurchase({ buyer: u.id, project: proj.value, unit: val(m, 'p-unit'), typology: typId, price: +price.value, installments: +val(m, 'p-inst') || 24, date: val(m, 'p-date') }); }, 'Venta registrada');
        });
      } });
  }
  // las tipologías se leen por nombre desde la base para obtener su id
  async function typologyId(pid, t) {
    const { data } = await window.Live.client.from('project_typologies').select('id,name').eq('project_id', pid);
    const r = (data || []).find((x) => x.name === t.name); return r ? r.id : null;
  }

  function onClick(e) {
    const t = e.target.closest('[data-adm]'); if (!t) return; const id = t.dataset.id;
    switch (t.dataset.adm) {
      case 'role': roleModal(D.USERS.find((u) => u.id === id)); break;
      case 'buy': purchaseModal(D.USERS.find((u) => u.id === id)); break;
      case 'co-new': companyModal(); break; case 'co-edit': companyModal(D.CONSTRUCTORAS.find((c) => c.id === id)); break;
      case 'int-new': interventorModal(); break; case 'int-edit': interventorModal(D.INTERVENTORES.find((x) => x.id === id)); break;
    }
  }

  window.Admin = { init: (c) => { ctx = c; document.addEventListener('click', onClick); return { view }; } };
})();
