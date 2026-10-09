// INN-LOCK · Validación de la base de datos sin Docker (Postgres en memoria con PGlite).
// Aplica migraciones + semilla, y prueba seguridad (RLS), reglas de negocio y el flujo de aprobación completo.
// Uso: cd supabase/tests && npm install && npm test
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = new PGlite({ extensions: { pgcrypto } });

// ---------- Simulación mínima de lo que aporta Supabase ----------
await db.exec(readFileSync(join(root, 'tests', 'stubs.sql'), 'utf8'));

// ---------- Migraciones y semilla ----------
const files = readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) {
  try { await db.exec(readFileSync(join(root, 'migrations', f), 'utf8')); console.log('✔ migración', f); }
  catch (e) { console.error('✘ migración', f, '\n   ', e.message); process.exit(1); }
}
try { await db.exec(readFileSync(join(root, 'seed.sql'), 'utf8')); console.log('✔ seed.sql'); }
catch (e) { console.error('✘ seed.sql\n   ', e.message); process.exit(1); }

// ---------- Utilidades de prueba ----------
const U = { admin: 'e0000000-0000-4000-8000-000000000001', buyer: 'e0000000-0000-4000-8000-000000000002', builder: 'e0000000-0000-4000-8000-000000000003', inter: 'e0000000-0000-4000-8000-000000000004' };
const C1 = 'a0000000-0000-4000-8000-000000000001', C2 = 'a0000000-0000-4000-8000-000000000002', I1 = 'b0000000-0000-4000-8000-000000000001';
const P1 = 'd0000000-0000-4000-8000-000000000001', P2 = 'd0000000-0000-4000-8000-000000000002';
let pass = 0, fail = 0;
async function as(user, sql, params) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${user ?? ''}', false); ${user === 'anon' ? 'set role anon' : user ? 'set role authenticated' : 'reset role'};`);
  try { return await db.query(sql, params); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
const rows = async (user, sql, params) => (await as(user, sql, params)).rows;
const one = async (user, sql, params) => (await rows(user, sql, params))[0];
async function ok(name, fn) { try { const r = await fn(); if (r === false) throw new Error('condición falsa'); pass++; console.log('  ✔', name); } catch (e) { fail++; console.log('  ✘', name, '→', e.message); } }
async function denied(name, user, sql, params, match) {
  try { await as(user, sql, params); fail++; console.log('  ✘', name, '→ se permitió y debía bloquearse'); }
  catch (e) { if (match && !new RegExp(match, 'i').test(e.message)) { fail++; console.log('  ✘', name, '→ error inesperado:', e.message); } else { pass++; console.log('  ✔', name, '(bloqueado)'); } }
}
const eq = (a, b, msg) => { if (String(a) !== String(b)) throw new Error(`${msg ?? ''} esperado ${b}, obtenido ${a}`); return true; };

// Payload de proyecto válido (22 meses, fases en orden)
function payload(over = {}) {
  const counts = [2, 3, 6, 3, 3, 3, 2], ref = [8, 14, 30, 12, 12, 16, 8], keys = ['prel', 'cim', 'est', 'mam', 'ins', 'aca', 'ent'], rows = [];
  keys.forEach((k, i) => { const base = Math.round((ref[i] / counts[i]) * 100) / 100; let acc = 0; for (let j = 0; j < counts[i]; j++) { const pct = j < counts[i] - 1 ? base : Math.round((ref[i] - acc) * 100) / 100; acc += pct; rows.push({ phase: k, pct, acts: `Actividad A ${k}; Actividad B ${k}` }); } });
  return { name: 'Parque Sur Residencial', tagline: 'Vivienda junto al parque', city: 'Medellín', zone: 'Envigado', address: 'Cl. 37 Sur # 27 - 85',
    description: 'Dos torres de 20 pisos con apartamentos de 56 a 98 m², balcones amplios y zonas sociales de 3.000 m².', towers: 2, floors: 20, units: 160, parking: 190, strata: 5,
    budget: 29500000000, start_date: '2026-12-01', interventor_id: I1, lic_number: 'LC-2026-1190', lic_issuer: 'Curaduría Urbana 2', lic_expires: '2030-01-01',
    fiducia_issuer: 'Fiduciaria Andina', fiducia_number: 'FA-PA-2026-204',
    typologies: [{ name: 'Tipo A', area: 56, beds: 2, baths: 2, parking: 1, price: 410000000 }, { name: 'Tipo B', area: 78, beds: 3, baths: 2, parking: 2, price: 560000000 }],
    amenities: ['Piscina', 'Gimnasio'], plans: [{ kind: 'arq', name: 'Planos arquitectónicos', sheets: 22, version: '1.0', file_path: `${C1}/x/arq.pdf`, file_size: 1000 }, { kind: 'est', name: 'Planos estructurales', sheets: 12, version: '1.0', file_path: `${C1}/x/est.pdf`, file_size: 1000 }],
    rows, ...over };
}

// ================== PRUEBAS ==================
console.log('\nEstructura y semilla');
await ok('todas las tablas de public tienen RLS activo', async () => { const r = await rows(null, `select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`); if (r.length) throw new Error('sin RLS: ' + r.map((x) => x.relname).join(', ')); });
await ok('3 constructoras, 2 interventores, 3 proyectos, 74 hitos', async () => { const r = await one(null, `select (select count(*) from companies) c, (select count(*) from interventors) i, (select count(*) from projects) p, (select count(*) from milestones) m`); eq(+r.c, 3); eq(+r.i, 2); eq(+r.p, 3); eq(+r.m, 74); });
await ok('cada cronograma sembrado suma 100 % y termina en 100 acumulado', async () => { const r = await rows(null, `select project_id, round(sum(tranche_pct), 2) s, max(planned_cum) c from milestones group by 1`); r.forEach((x) => { eq(+x.s, 100, 'suma'); eq(+x.c, 100, 'acumulado'); }); });
await ok('desembolsos sembrados: 10 + 6 + 16 = 32', async () => eq(+(await one(null, 'select count(*) n from disbursements')).n, 32));
await ok('perfiles de demo con sus roles', async () => { const r = await rows(null, `select u.email, p.role from profiles p join auth.users u on u.id = p.id where u.email like '%@inn-lock.co' order by u.email`); eq(r.map((x) => x.role).join(), 'admin,comprador,constructora,interventor'); });
await ok('el libro de custodia cuadra con los desembolsos', async () => { const r = await one(null, `select (select -sum(amount) from escrow_ledger where kind = 'desembolso') a, (select sum(amount) from disbursements) b`); eq(+r.a, +r.b); });
await ok('estado documental: c1 por vencer, c2 vencido (bloqueada), c3 vigente', async () => { const r = await rows(null, `select company_id, effective_status from v_company_documents where type_key = 'camara' order by company_id`); eq(r.map((x) => x.effective_status).join(), 'por_vencer,vencido,vigente'); eq((await one(null, `select company_blocked('${C2}') b`)).b, true); eq((await one(null, `select company_blocked('${C1}') b`)).b, false); });

console.log('\nSeguridad (RLS y privilegios)');
await denied('el rol anónimo no puede leer proyectos', 'anon', 'select * from projects', [], 'permission denied');
await ok('comprador ve proyectos activos y solo su compra', async () => { eq((await rows(U.buyer, 'select 1 from projects')).length, 3); eq((await rows(U.buyer, 'select 1 from purchases')).length, 1); });
await ok('comprador ve desembolsos solo del proyecto donde compró', async () => { eq((await rows(U.buyer, 'select 1 from disbursements')).length, 10); eq((await rows(U.buyer, `select 1 from disbursements where project_id = '${P2}'`)).length, 0); });
await ok('comprador solo ve sus propios aportes en el libro (no los desembolsos)', async () => { const r = await rows(U.buyer, 'select kind from escrow_ledger'); eq(r.length, 18); eq(r.every((x) => x.kind === 'aporte_comprador'), true); });
await ok('comprador no ve auditoría ni hitos en revisión de documentos internos', async () => { eq((await rows(U.buyer, 'select 1 from audit_log')).length, 0); eq((await rows(U.buyer, 'select 1 from document_submissions')).length, 0); });
await ok('v_project_funds: custodia = presupuesto − desembolsado', async () => { const r = await one(U.builder, `select budget, released, custody from v_project_funds where project_id = '${P1}'`); eq(+r.custody, +r.budget - +r.released); });
await ok('interventor ve auditoría de sus proyectos', async () => (await rows(U.inter, 'select 1 from audit_log')).length >= 3);
await denied('constructora no puede cambiar el estado de un proyecto', U.builder, `update projects set stage = 'borrador' where id = '${P1}'`, [], 'permission denied');
await denied('constructora no puede modificar hitos directamente', U.builder, `update milestones set status = 'desembolsado' where project_id = '${P1}'`, [], 'permission denied');
await denied('constructora no puede crear desembolsos', U.builder, `insert into disbursements (project_id, milestone_id, amount) select project_id, id, 1 from milestones limit 1`, [], 'permission denied');
await denied('nadie escala su propio rol', U.builder, `update profiles set role = 'admin' where id = '${U.builder}'`, [], 'permission denied');
await ok('el usuario sí puede editar su nombre', async () => { await as(U.builder, `update profiles set full_name = 'Carolina Mejía Ortiz' where id = '${U.builder}'`); eq((await one(null, `select full_name from profiles where id = '${U.builder}'`)).full_name, 'Carolina Mejía Ortiz'); });
await denied('comprador no puede invocar RPC de interventor', U.buyer, `select review_milestone(id, true, null, '[true,true,true,true]') from milestones where status = 'revision' limit 1`, [], 'Solo el interventor');
await denied('funciones internas no son invocables por el cliente', U.builder, `select log_audit('x', 'x')`, [], 'permission denied');
await ok('un registro nuevo en auth.users nace como comprador (aunque pida ser admin)', async () => {
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('e0000000-0000-4000-8000-0000000000ff', 'intruso@x.co', '{"role":"admin","full_name":"Intruso"}')`);
  eq((await one(null, `select role from profiles where id = 'e0000000-0000-4000-8000-0000000000ff'`)).role, 'comprador'); });

console.log('\nFlujo: registro → interventoría → administrador → obra');
let NEW;
await denied('un comprador no puede registrar proyectos', U.buyer, `select save_project(null, $1::jsonb, false)`, [JSON.stringify(payload())], 'Solo una constructora');
await denied('no se envía un cronograma que no suma 100 %', U.builder, `select save_project(null, $1::jsonb, true)`, [JSON.stringify(payload({ rows: payload().rows.map((r, i) => (i === 0 ? { ...r, pct: r.pct + 3 } : r)) }))], 'suman');
await denied('no se envía con la fase fuera de orden', U.builder, `select save_project(null, $1::jsonb, true)`, [JSON.stringify(payload({ rows: payload().rows.map((r, i) => (i === 10 ? { ...r, phase: 'prel' } : r)) }))], 'etapa anterior');
await ok('constructora registra y envía el proyecto (22 hitos)', async () => {
  NEW = (await one(U.builder, `select save_project(null, $1::jsonb, true) id`, [JSON.stringify(payload())])).id;
  const p = await one(null, `select stage, months, units_sold, price_from, area_min, area_max, end_date from projects where id = $1`, [NEW]);
  eq(p.stage, 'interventor'); eq(+p.months, 22); eq(+p.price_from, 410000000); eq(+p.area_max, 78);
  eq((await one(null, `select count(*) n from milestones where project_id = $1`, [NEW])).n, 22);
  eq((await one(null, `select max(planned_cum) m from milestones where project_id = $1`, [NEW])).m, '100.0000'); });
await ok('el proyecto enviado es visible para su interventor, no para el comprador', async () => { eq((await rows(U.inter, `select 1 from projects where id = $1`, [NEW])).length, 1); eq((await rows(U.buyer, `select 1 from projects where id = $1`, [NEW])).length, 0); });
await ok('el interventor recibió la notificación', async () => (await rows(U.inter, `select 1 from notifications where project_id = $1`, [NEW])).length === 1);
await denied('la constructora no puede aprobar su propio proyecto', U.builder, `select review_project($1, true, null)`, [NEW], 'Solo el interventor');
await denied('devolver sin motivo es rechazado', U.inter, `select review_project($1, false, 'x')`, [NEW], 'observaciones');
await ok('el interventor devuelve con observaciones y la constructora reenvía', async () => {
  await as(U.inter, `select review_project($1, false, 'La fase de estructura concentra demasiado presupuesto.')`, [NEW]); eq((await one(null, `select stage from projects where id = $1`, [NEW])).stage, 'observado');
  await as(U.builder, `select save_project($1, $2::jsonb, true)`, [NEW, JSON.stringify(payload({ name: 'Parque Sur Residencial II' }))]);
  eq((await one(null, `select stage, name from projects where id = $1`, [NEW])).stage, 'interventor'); });
await denied('el administrador no activa antes de la aprobación del interventor', U.admin, `select activate_project($1, true, null)`, [NEW], 'pendiente de validación');
await ok('el interventor aprueba y pasa al administrador', async () => { await as(U.inter, `select review_project($1, true, 'Cronograma razonable.')`, [NEW]); eq((await one(null, `select stage from projects where id = $1`, [NEW])).stage, 'admin'); });
await denied('la constructora no puede activar', U.builder, `select activate_project($1, true, null)`, [NEW], 'administrador');
await ok('el administrador activa: cronograma bloqueado, mes 1 en curso y ancla simulada', async () => {
  await as(U.admin, `select activate_project($1, true, null)`, [NEW]);
  const p = await one(null, `select stage, schedule_locked from projects where id = $1`, [NEW]); eq(p.stage, 'activo'); eq(p.schedule_locked, true);
  eq((await one(null, `select status from milestones where project_id = $1 and n = 1`, [NEW])).status, 'en_curso');
  eq((await one(null, `select count(*) n from onchain_records where project_id = $1 and kind = 'ancla_cronograma'`, [NEW])).n, '1');
  eq((await rows(U.buyer, `select 1 from projects where id = $1`, [NEW])).length, 1, 'ahora es público'); });
await ok('el historial del registro quedó completo', async () => eq((await rows(U.admin, `select kind from project_reviews where project_id = $1 order by id`, [NEW])).map((x) => x.kind).join('|'), 'enviado|observado|reenviado|aprobado por interventor|activado'));
await ok('trigger: nadie con sesión puede alterar un cronograma bloqueado', async () => {
  await db.exec(`select set_config('request.jwt.claim.sub', '${U.admin}', false)`);
  let blocked = false; try { await db.exec(`update milestones set tranche_pct = tranche_pct + 1 where project_id = '${NEW}' and n = 2`); } catch (e) { blocked = /bloqueado/.test(e.message); }
  await db.exec(`select set_config('request.jwt.claim.sub', '', false)`); return blocked || (() => { throw new Error('no se bloqueó'); })(); });

console.log('\nFlujo: hito mensual y desembolso');
const M1 = async () => (await one(null, `select id from milestones where project_id = $1 and n = 1`, [NEW])).id;
await denied('no se puede enviar el hito sin 3 fotos', U.builder, `select submit_milestone($1, 'listo')`, [await M1()], '3 fotos');
await ok('la constructora adjunta 3 fotos (insert directo permitido por RLS)', async () => { for (let i = 1; i <= 3; i++) await as(U.builder, `insert into milestone_evidence (milestone_id, kind, name, storage_path, size_bytes, uploaded_by) values ($1, 'imagen', $2, $3, 1000, $4)`, [await M1(), `foto${i}.jpg`, `${NEW}/${await M1()}/foto${i}.jpg`, U.builder]); });
await denied('la evidencia no puede apuntar a archivos de otro hito', U.builder, `insert into milestone_evidence (milestone_id, kind, name, storage_path, uploaded_by) values ($1, 'imagen', 'x.jpg', '${P1}/otro/x.jpg', $2)`, [await M1(), U.builder], 'row-level security');
await denied('un comprador no puede subir evidencias', U.buyer, `insert into milestone_evidence (milestone_id, kind, name, storage_path, uploaded_by) values ($1, 'imagen', 'x.jpg', 'x', $2)`, [await M1(), U.buyer], 'row-level security');
await ok('envía el hito a revisión', async () => { await as(U.builder, `select submit_milestone($1, 'Preliminares completos')`, [await M1()]); eq((await one(null, `select status from milestones where id = $1`, [await M1()])).status, 'revision'); });
await denied('aprobar exige todos los puntos de verificación', U.inter, `select review_milestone($1, true, null, '[true,true,false,true]')`, [await M1()], 'puntos de verificación');
await ok('el interventor aprueba: desembolso exacto, libro, ancla y siguiente hito en curso', async () => {
  await as(U.inter, `select review_milestone($1, true, 'Verificado en sitio', '[true,true,true,true]')`, [await M1()]);
  const m = await one(null, `select d.amount, m.status, p.budget, m.tranche_pct from milestones m join disbursements d on d.milestone_id = m.id join projects p on p.id = m.project_id where m.id = $1`, [await M1()]);
  eq(m.status, 'desembolsado'); eq(+m.amount, Math.round(+m.budget * +m.tranche_pct) / 100);
  eq((await one(null, `select count(*) n from escrow_ledger where milestone_id = $1 and amount < 0`, [await M1()])).n, '1');
  eq((await one(null, `select count(*) n from onchain_records where milestone_id = $1 and kind = 'desembolso'`, [await M1()])).n, '1');
  const nx = await one(null, `select status from milestones where project_id = $1 and n = 2`, [NEW]); eq(nx.status, 'en_curso');
  eq((await one(null, `select current_month from projects where id = $1`, [NEW])).current_month, 2); });
await denied('no se puede aprobar dos veces', U.inter, `select review_milestone($1, true, null, '[true,true,true,true]')`, [await M1()], 'no está en revisión');
await denied('desembolso bloqueado si la constructora tiene documentación vencida', U.inter, `select review_milestone(id, true, null, '[true,true,true,true]') from milestones where project_id = '${P2}' and status = 'revision'`, [], 'bloqueado');
await ok('observar un hito exige motivo y lo deja «observado»', async () => {
  await as(U.inter, `select review_milestone(id, false, 'Falta el informe de ensayos de concreto.') from milestones where project_id = '${P1}' and status = 'revision'`);
  eq((await one(null, `select status from milestones where project_id = '${P1}' and n = 11`)).status, 'observado'); });

console.log('\nCambios al cronograma bloqueado');
await denied('la suma modificada debe conservarse', U.builder, `select request_schedule_change($1, 'Retraso de proveedores de acero por clima adverso.', '[{"n":5,"to":4.0},{"n":6,"to":4.0}]'::jsonb)`, [NEW], 'conservarse');
await denied('no se puede modificar un mes ya desembolsado', U.builder, `select request_schedule_change($1, 'Retraso de proveedores de acero por clima adverso.', '[{"n":1,"to":3.0},{"n":6,"to":5.0}]'::jsonb)`, [NEW], 'pendientes');
let REQ;
await ok('la constructora solicita mover 0,3 puntos entre dos meses', async () => {
  const cur = await rows(null, `select n, tranche_pct from milestones where project_id = $1 and n in (6, 7) order by n`, [NEW]);
  const items = [{ n: 6, to: +cur[0].tranche_pct + 0.3 }, { n: 7, to: +cur[1].tranche_pct - 0.3 }];
  REQ = (await one(U.builder, `select request_schedule_change($1, 'Retraso de proveedores de acero por clima adverso.', $2::jsonb) id`, [NEW, JSON.stringify(items)])).id; });
await denied('solo una solicitud pendiente por proyecto', U.builder, `select request_schedule_change($1, 'Otro motivo suficientemente largo para validar.', '[{"n":8,"to":4.5},{"n":9,"to":3.5}]'::jsonb)`, [NEW], 'pendiente|conservarse');
await denied('la constructora no puede aprobar su solicitud', U.builder, `select resolve_schedule_change($1, true, null)`, [REQ], 'interventor');
await ok('el interventor aprueba: porcentajes, acumulado y ancla se recalculan', async () => {
  const before = (await one(null, `select tranche_pct from milestones where project_id = $1 and n = 6`, [NEW])).tranche_pct;
  await as(U.inter, `select resolve_schedule_change($1, true, 'Aprobado')`, [REQ]);
  const m6 = await one(null, `select tranche_pct, changed from milestones where project_id = $1 and n = 6`, [NEW]); eq(m6.changed, true); eq(Math.round((+m6.tranche_pct) * 100) / 100, Math.round((+before + 0.3) * 100) / 100);
  eq((await one(null, `select round(sum(tranche_pct), 2) s from milestones where project_id = $1`, [NEW])).s, '100.00');
  eq((await one(null, `select max(planned_cum) c from milestones where project_id = $1`, [NEW])).c, '100.0000');
  eq((await one(null, `select count(*) n from onchain_records where project_id = $1 and kind = 'ancla_cronograma'`, [NEW])).n, '2'); });

console.log('\nDocumentos legales');
await ok('la constructora carga una nueva cámara: queda «en validación»', async () => {
  await as(U.builder, `select submit_document('camara', 'CE-NUEVO', 'Cámara de Comercio de Medellín', current_date, current_date + 30, $1, 1000)`, [`${C1}/camara.pdf`]);
  eq((await one(U.builder, `select effective_status s from v_company_documents where company_id = $1 and type_key = 'camara'`, [C1])).s, 'revision'); });
await ok('el administrador valida y el documento queda vigente', async () => {
  const s = await one(U.admin, `select id from document_submissions where status = 'pendiente' limit 1`);
  await as(U.admin, `select review_document_submission($1, true, null)`, [s.id]);
  eq((await one(U.builder, `select effective_status s from v_company_documents where company_id = $1 and type_key = 'camara'`, [C1])).s, 'vigente'); });
await denied('la constructora no puede validar documentos', U.builder, `select review_document_submission(gen_random_uuid(), true, null)`, [], 'administrador');
await ok('el administrador renueva la cámara vencida de c2 y se desbloquean los desembolsos', async () => {
  await as(U.admin, `select submit_document('camara', 'CE-2026-NUEVO', 'Cámara de Comercio de Bogotá', current_date, current_date + 30, $1, 1000, $2)`, [`${C2}/camara.pdf`, C2]);
  eq((await one(null, `select company_blocked('${C2}') b`)).b, false);
  await as(U.inter, `select review_milestone(id, true, 'OK', '[true,true,true,true]') from milestones where project_id = '${P2}' and status = 'revision'`);
  eq((await one(null, `select status from milestones where project_id = '${P2}' and n = 7`)).status, 'desembolsado'); });

console.log('\nAdministración, ventas y custodia');
await denied('solo el administrador cambia roles', U.builder, `select admin_set_role('${U.buyer}', 'admin')`, [], 'administrador');
await ok('el administrador asigna un rol de constructora a un usuario', async () => { await as(U.admin, `select admin_set_role('e0000000-0000-4000-8000-0000000000ff', 'constructora', '${C2}')`); eq((await one(null, `select company_id from profiles where id = 'e0000000-0000-4000-8000-0000000000ff'`)).company_id, C2); });
let PUR;
await ok('registra una venta: 25 pagos programados y unidades vendidas +1', async () => {
  const t = await one(null, `select id, price from project_typologies where project_id = $1 limit 1`, [NEW]);
  PUR = (await one(U.admin, `select create_purchase('${U.buyer}', $1, 'Torre 1 · 301', $2, $3, 24) id`, [NEW, t.id, t.price])).id;
  eq((await one(null, `select count(*) n from payments where purchase_id = $1`, [PUR])).n, '25'); eq(+(await one(null, `select units_sold from projects where id = $1`, [NEW])).units_sold, 1); });
await ok('al confirmar un pago, ingresa al libro de la custodia', async () => {
  const pay = await one(null, `select id, amount from payments where purchase_id = $1 and n = 0`, [PUR]);
  await as(U.admin, `select mark_payment_paid($1)`, [pay.id]);
  eq(+(await one(null, `select sum(amount) s from escrow_ledger where purchase_id = $1`, [PUR])).s, +pay.amount);
  eq(+(await one(U.admin, `select contributed from v_project_funds where project_id = $1`, [NEW])).contributed, +pay.amount);
  eq(+(await one(U.admin, `select escrow_balance from v_project_funds where project_id = $1`, [NEW])).escrow_balance, +pay.amount - +(await one(null, `select sum(amount) d from disbursements where project_id = $1`, [NEW])).d); });
await ok('v_purchases calcula cuotas pagadas y próxima cuota', async () => { const r = await one(U.buyer, `select installments_total, installments_paid, paid_total from v_purchases where id = 'f0000000-0000-4000-8000-000000000001'`); eq(+r.installments_total, 24); eq(+r.installments_paid, 17); });

console.log('\nGestión de organizaciones y usuarios');
await ok('los perfiles guardan el correo (también los nuevos)', async () => { eq((await one(null, `select email from profiles where id = '${U.admin}'`)).email, 'admin@inn-lock.co'); eq((await one(null, `select email from profiles where id = 'e0000000-0000-4000-8000-0000000000ff'`)).email, 'intruso@x.co'); });
await ok('el administrador ve a todos los usuarios; los demás, solo su perfil', async () => { eq((await rows(U.admin, 'select 1 from profiles')).length >= 5, true); eq((await rows(U.buyer, 'select 1 from profiles')).length, 1); });
await denied('un comprador no puede registrar constructoras', U.buyer, `select admin_upsert_company(null, '{"name":"X","nit":"1"}'::jsonb)`, [], 'administrador');
await ok('el administrador registra y actualiza una constructora y un interventor', async () => {
  const c = (await one(U.admin, `select admin_upsert_company(null, '{"name":"Nueva Constructora S.A.S.","short_name":"Nueva","nit":"900.111.222-3","city":"Cali","email":"a@b.co"}'::jsonb) id`)).id;
  eq((await one(null, `select short_name from companies where id = $1`, [c])).short_name, 'Nueva');
  await as(U.admin, `select admin_upsert_company($1, '{"name":"Nueva Constructora S.A.S.","short_name":"Nueva 2","nit":"900.111.222-3"}'::jsonb)`, [c]);
  eq((await one(null, `select short_name from companies where id = $1`, [c])).short_name, 'Nueva 2');
  const i = (await one(U.admin, `select admin_upsert_interventor(null, '{"name":"Ing. Nuevo","firm":"Firma Nueva","license":"Mat. 1"}'::jsonb) id`)).id;
  eq((await rows(null, `select 1 from interventors where id = $1`, [i])).length, 1); });
await denied('el NIT debe ser único', U.admin, `select admin_upsert_company(null, '{"name":"Otra","nit":"900.111.222-3"}'::jsonb)`, [], 'duplicate|unique|único');
await ok('un usuario desactivado pierde su rol y su acceso a datos propios', async () => {
  await as(U.admin, `select admin_set_active('e0000000-0000-4000-8000-0000000000ff', false)`);
  eq((await one(null, `select active from profiles where id = 'e0000000-0000-4000-8000-0000000000ff'`)).active, false);
  eq((await one('e0000000-0000-4000-8000-0000000000ff', `select auth_role() r`)).r, null); });
await denied('nadie puede desactivarse a sí mismo', U.admin, `select admin_set_active('${U.admin}', false)`, [], 'ti mismo');

console.log('\nAlmacenamiento (políticas de Storage)');
await ok('la constructora sube la foto en la carpeta de su empresa', async () => { await as(U.builder, `insert into storage.objects (bucket_id, name) values ('project-photos', '${C1}/portada.jpg')`); });
await denied('…pero no en la carpeta de otra empresa', U.builder, `insert into storage.objects (bucket_id, name) values ('project-photos', '${C2}/portada.jpg')`, [], 'row-level security');
await ok('las fotos públicas son legibles sin sesión', async () => eq((await rows('anon', `select 1 from storage.objects where bucket_id = 'project-photos'`)).length, 1));
await ok('la constructora sube evidencia de su proyecto', async () => { await as(U.builder, `insert into storage.objects (bucket_id, name) values ('milestone-evidence', '${P1}/m/foto.jpg')`); });
await denied('un comprador no puede subir evidencias', U.buyer, `insert into storage.objects (bucket_id, name) values ('milestone-evidence', '${P1}/m/otra.jpg')`, [], 'row-level security');
await ok('el comprador del proyecto puede ver la evidencia; el de otro no', async () => { eq((await rows(U.buyer, `select 1 from storage.objects where bucket_id = 'milestone-evidence'`)).length, 1); await db.exec(`insert into storage.objects (bucket_id, name) values ('milestone-evidence', '${P2}/m/foto.jpg')`); eq((await rows(U.buyer, `select 1 from storage.objects where bucket_id = 'milestone-evidence' and name like '${P2}%'`)).length, 0); });
await ok('los documentos legales solo los ve su constructora, el admin y el interventor', async () => {
  await db.exec(`insert into storage.objects (bucket_id, name) values ('company-documents', '${C1}/rut.pdf')`);
  eq((await rows(U.builder, `select 1 from storage.objects where bucket_id = 'company-documents'`)).length, 1); eq((await rows(U.admin, `select 1 from storage.objects where bucket_id = 'company-documents'`)).length, 1);
  eq((await rows(U.inter, `select 1 from storage.objects where bucket_id = 'company-documents'`)).length, 1); eq((await rows(U.buyer, `select 1 from storage.objects where bucket_id = 'company-documents'`)).length, 0); });

console.log(`\nResultado: ${pass} correctas, ${fail} con error`);
process.exit(fail ? 1 : 0);
