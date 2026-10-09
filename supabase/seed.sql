-- INN-LOCK · Datos de demostración (SOLO desarrollo local: `supabase db reset`).
-- NO ejecutar en producción: crea usuarios con contraseña conocida (demo1234) y datos ficticios.
-- Replica los datos de la demo del front-end: 3 constructoras, 2 interventores, 3 proyectos y 4 usuarios.

-- ============================================================
-- Organizaciones
-- ============================================================
insert into public.companies (id, name, short_name, nit, legal_rep, rep_role, city, founded_year, email, phone, about, rating, delivered_projects, built_units, built_sqm, color_a, color_b) values
 ('a0000000-0000-4000-8000-000000000001', 'Cimientos & Desarrollos S.A.S.', 'Cimientos & Desarrollos', '901.482.115-3', 'Carolina Mejía Ortiz', 'Representante legal', 'Medellín', 2012, 'legal@cimientosydesarrollos.co', '+57 604 555 0142',
  'Constructora antioqueña con más de una década desarrollando vivienda de mediana y alta gama. Certificada ISO 9001 y con encargo fiduciario en todos sus proyectos.', 4.8, 14, 1830, 212400, '#1450C8', '#12A8F0'),
 ('a0000000-0000-4000-8000-000000000002', 'Arquitectura y Obra Andina Ltda.', 'Arquitectura Andina', '830.117.904-1', 'Julián Pardo Vega', 'Gerente general', 'Bogotá D.C.', 2008, 'juridica@andinaobra.co', '+57 601 555 0188',
  'Firma bogotana especializada en proyectos residenciales verticales de la zona norte de la capital, con certificación EDGE de construcción sostenible.', 4.6, 22, 3120, 388900, '#0B2A6F', '#1450C8'),
 ('a0000000-0000-4000-8000-000000000003', 'Costa Verde Constructores S.A.', 'Costa Verde', '806.552.390-7', 'María Fernanda Ospino', 'Presidente', 'Cartagena', 2005, 'contacto@costaverde.co', '+57 605 555 0107',
  'Referente en vivienda turística y residencial del Caribe colombiano. Más de 30 proyectos entregados a tiempo y sin litigios con compradores.', 4.9, 31, 4650, 541300, '#0A8F8F', '#12A8F0');

insert into public.interventors (id, name, firm, license, email) values
 ('b0000000-0000-4000-8000-000000000001', 'Ing. Ricardo Salazar', 'Salazar & Asociados · Interventoría', 'Mat. Prof. 05202-318877 ANT', 'ricardo@salazarinterventoria.co'),
 ('b0000000-0000-4000-8000-000000000002', 'Ing. Paola Barrios',   'Interventoría Caribe S.A.S.',          'Mat. Prof. 13202-224019 BLV', 'paola@interventoriacaribe.co');

-- Documentos legales (fechas relativas a hoy para que siempre haya casos de vigente / por vencer / vencido)
insert into public.company_documents (company_id, type_key, number, issuer, issued_on, expires_on, pages, insured_amount) values
 ('a0000000-0000-4000-8000-000000000001', 'camara', 'CE-2026-448201', 'Cámara de Comercio de Medellín', current_date - 18, current_date + 12, 6, null),
 ('a0000000-0000-4000-8000-000000000001', 'rut',    'NIT 901.482.115-3', 'DIAN', current_date - 240, null, 4, null),
 ('a0000000-0000-4000-8000-000000000001', 'poliza', 'POL-CUM-9021874', 'Seguros Bolívar', current_date - 200, current_date + 165, 18, 7680000000),
 ('a0000000-0000-4000-8000-000000000001', 'fin',    'EEFF-2025', 'Revisoría Fiscal RF&A', current_date - 190, current_date + 175, 64, null),
 ('a0000000-0000-4000-8000-000000000002', 'camara', 'CE-2026-771002', 'Cámara de Comercio de Bogotá', current_date - 48, current_date - 18, 5, null),   -- vencida: bloquea desembolsos
 ('a0000000-0000-4000-8000-000000000002', 'rut',    'NIT 830.117.904-1', 'DIAN', current_date - 190, null, 4, null),
 ('a0000000-0000-4000-8000-000000000002', 'poliza', 'POL-CUM-7740312', 'Sura Seguros', current_date - 220, current_date + 145, 16, 10400000000),
 ('a0000000-0000-4000-8000-000000000002', 'fin',    'EEFF-2025', 'Deloitte & Touche Ltda.', current_date - 195, current_date + 170, 72, null),
 ('a0000000-0000-4000-8000-000000000003', 'camara', 'CE-2026-125567', 'Cámara de Comercio de Cartagena', current_date - 7, current_date + 23, 7, null),
 ('a0000000-0000-4000-8000-000000000003', 'rut',    'NIT 806.552.390-7', 'DIAN', current_date - 262, null, 4, null),
 ('a0000000-0000-4000-8000-000000000003', 'poliza', 'POL-CUM-5512980', 'Allianz Seguros', current_date - 270, current_date + 95, 20, 12300000000),
 ('a0000000-0000-4000-8000-000000000003', 'fin',    'EEFF-2025', 'KPMG Colombia', current_date - 197, current_date + 168, 88, null);

-- ============================================================
-- Usuarios de demostración (contraseña: demo1234)
-- ============================================================
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, extensions.crypt('demo1234', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', u.name), now(), now(), '', '', '', ''
from (values
  ('e0000000-0000-4000-8000-000000000001'::uuid, 'admin@inn-lock.co',        'Laura Gómez'),
  ('e0000000-0000-4000-8000-000000000002'::uuid, 'comprador@inn-lock.co',    'Andrés Restrepo'),
  ('e0000000-0000-4000-8000-000000000003'::uuid, 'constructora@inn-lock.co', 'Carolina Mejía'),
  ('e0000000-0000-4000-8000-000000000004'::uuid, 'interventor@inn-lock.co',  'Ricardo Salazar')
) as u(id, email, name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u where u.email like '%@inn-lock.co';

-- El trigger creó los perfiles como «comprador»; el rol real lo asigna el administrador (aquí, la semilla).
update public.profiles set role = 'admin', title = 'Administradora de plataforma' where id = 'e0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'comprador', title = 'Comprador · Apto. 1204 Torre A' where id = 'e0000000-0000-4000-8000-000000000002';
update public.profiles set role = 'constructora', company_id = 'a0000000-0000-4000-8000-000000000001', title = 'Representante legal · Cimientos & Desarrollos' where id = 'e0000000-0000-4000-8000-000000000003';
update public.profiles set role = 'interventor', interventor_id = 'b0000000-0000-4000-8000-000000000001', title = 'Interventor · Salazar & Asociados' where id = 'e0000000-0000-4000-8000-000000000004';

-- ============================================================
-- Proyectos activos
-- ============================================================
insert into public.projects (id, name, tagline, description, city, zone, address, lat, lng, company_id, interventor_id, stage, towers, floors, units, parking, strata,
                             budget, start_date, months, current_month, lic_number, lic_issuer, lic_expires, fiducia_issuer, fiducia_number, schedule_locked, submitted_at, activated_at, created_by) values
 ('d0000000-0000-4000-8000-000000000001', 'Torres del Parque', 'Dos torres frente al Parque Lineal de El Poblado',
  'Complejo residencial de dos torres de 28 pisos con apartamentos de 58 a 112 m², balcones amplios y vista abierta al Valle de Aburrá. Zonas sociales de 4.200 m², coworking, gimnasio, piscina cubierta y certificación de construcción sostenible.',
  'Medellín', 'El Poblado', 'Cra. 43A # 12 Sur - 50', 6.2005, -75.5712, 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'activo', 2, 28, 224, 280, 6,
  38400000000, '2025-11-01', 24, 12, 'LC-2025-0842', 'Curaduría Urbana 2 Medellín', current_date + 660, 'Fiduciaria Andina', 'FA-PA-2025-117', true, '2025-10-10', '2025-10-30', 'e0000000-0000-4000-8000-000000000003'),
 ('d0000000-0000-4000-8000-000000000002', 'Altos de Chicó', 'Vivienda boutique en el corazón del norte de Bogotá',
  'Torre única de 22 pisos con apartamentos de diseño de 64 a 145 m², terrazas privadas y acabados de primera. A pasos de parques, restaurantes y universidades, con acceso directo a vías principales.',
  'Bogotá D.C.', 'Chicó Norte', 'Cl. 98 # 9A - 41', 4.6786, -74.0475, 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'activo', 1, 22, 66, 112, 6,
  52000000000, '2026-03-01', 20, 8, 'LC-2026-0215', 'Curaduría Urbana 5 Bogotá', current_date + 480, 'Fiduciaria Capital', 'FC-PA-2026-033', true, '2026-02-01', '2026-02-20', null),
 ('d0000000-0000-4000-8000-000000000003', 'Mirador del Mar', 'Tres torres con vista directa a la bahía de Cartagena',
  'Conjunto de tres torres frente al mar Caribe con apartamentos de 52 a 130 m². Piscina infinita, club de playa y vistas despejadas. Ideal para vivienda y renta turística, con operador hotelero opcional.',
  'Cartagena', 'Bocagrande', 'Av. San Martín # 7 - 120', 10.4012, -75.5547, 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'activo', 3, 24, 288, 340, 6,
  61500000000, '2025-06-01', 30, 17, 'LC-2025-0377', 'Curaduría Urbana 1 Cartagena', current_date + 520, 'Fiduciaria Bancolombia', 'FB-PA-2025-061', true, '2025-05-01', '2025-05-20', null);

insert into public.project_typologies (project_id, name, area, beds, baths, parking, price) values
 ('d0000000-0000-4000-8000-000000000001', 'Tipo A · 2 alcobas', 58, 2, 2, 1, 485000000), ('d0000000-0000-4000-8000-000000000001', 'Tipo B · 3 alcobas', 82, 3, 2, 2, 652000000), ('d0000000-0000-4000-8000-000000000001', 'Tipo C · 3 alcobas + estudio', 112, 3, 3, 2, 884000000),
 ('d0000000-0000-4000-8000-000000000002', 'Tipo 1 · 2 alcobas', 64, 2, 2, 1, 720000000), ('d0000000-0000-4000-8000-000000000002', 'Tipo 2 · 3 alcobas', 98, 3, 3, 2, 1090000000), ('d0000000-0000-4000-8000-000000000002', 'Penthouse dúplex', 145, 4, 4, 3, 1650000000),
 ('d0000000-0000-4000-8000-000000000003', 'Suite · 1 alcoba', 52, 1, 1, 1, 560000000), ('d0000000-0000-4000-8000-000000000003', 'Tipo B · 2 alcobas', 78, 2, 2, 1, 790000000), ('d0000000-0000-4000-8000-000000000003', 'Tipo C · 3 alcobas', 130, 3, 3, 2, 1320000000);
update public.projects p set price_from = t.pmin, area_min = t.amin, area_max = t.amax
from (select project_id, min(price) pmin, min(area) amin, max(area) amax from public.project_typologies group by project_id) t where t.project_id = p.id;

insert into public.project_amenities (project_id, amenity)
select 'd0000000-0000-4000-8000-000000000001'::uuid, a from unnest(array['Piscina cubierta','Gimnasio','Coworking','Salón social','Zona BBQ','Pet park','Bicicletero','Seguridad 24/7','Lobby doble altura','Terraza panorámica']) a
union all select 'd0000000-0000-4000-8000-000000000002'::uuid, a from unnest(array['Spa y sauna','Gimnasio','Salón de eventos','Cine privado','Terraza BBQ','Lobby con concierge','Parqueadero de visitantes','Domótica']) a
union all select 'd0000000-0000-4000-8000-000000000003'::uuid, a from unnest(array['Piscina infinita','Club de playa','Spa','Gimnasio','Zona de coworking','Parque infantil','Marina privada','Operador hotelero']) a;

insert into public.project_plans (project_id, kind, name, sheets, version, file_path, file_size) values
 ('d0000000-0000-4000-8000-000000000001', 'arq', 'Planos arquitectónicos', 24, '3.2', 'a0000000-0000-4000-8000-000000000001/torres/arq_v3.2.pdf', 22440000), ('d0000000-0000-4000-8000-000000000001', 'est', 'Planos estructurales', 14, '3.1', 'a0000000-0000-4000-8000-000000000001/torres/est_v3.1.pdf', 13500000),
 ('d0000000-0000-4000-8000-000000000001', 'hid', 'Planos hidrosanitarios', 8, '3.0', 'a0000000-0000-4000-8000-000000000001/torres/hid_v3.0.pdf', 6500000), ('d0000000-0000-4000-8000-000000000001', 'ele', 'Planos eléctricos y de datos', 9, '3.0', 'a0000000-0000-4000-8000-000000000001/torres/ele_v3.0.pdf', 8500000),
 ('d0000000-0000-4000-8000-000000000002', 'arq', 'Planos arquitectónicos', 20, '2.0', 'a0000000-0000-4000-8000-000000000002/chico/arq_v2.0.pdf', 19700000), ('d0000000-0000-4000-8000-000000000002', 'est', 'Planos estructurales', 12, '2.0', 'a0000000-0000-4000-8000-000000000002/chico/est_v2.0.pdf', 11500000),
 ('d0000000-0000-4000-8000-000000000003', 'arq', 'Planos arquitectónicos', 30, '4.1', 'a0000000-0000-4000-8000-000000000003/mirador/arq_v4.1.pdf', 29500000), ('d0000000-0000-4000-8000-000000000003', 'est', 'Planos estructurales', 18, '4.0', 'a0000000-0000-4000-8000-000000000003/mirador/est_v4.0.pdf', 17000000);

-- ============================================================
-- Cronograma mensual, desembolsos y libro de custodia
-- ============================================================
create or replace function pg_temp.seed_schedule(p_project uuid, p_counts int[], p_review boolean, p_drift numeric)
returns void language plpgsql as $$
declare
  pr public.projects; ph record; k int; c int; v_n int := 0; v_base numeric; v_acc numeric; v_pct numeric; v_cum numeric := 0;
  v_status public.milestone_status; v_plan numeric; v_id uuid; v_amount numeric; v_inter uuid;
  v_acts text[][] := array[
    array['Cerramiento y campamento de obra','Descapote y localización','Estudios de suelos y topografía','Instalación de redes provisionales'],
    array['Excavación mecánica y entibado','Pilotaje y vigas de cimentación','Fundida de placa de contrapiso','Impermeabilización de sótanos'],
    array['Armado de acero de refuerzo','Fundida de columnas y pantallas','Fundida de placas de entrepiso','Pruebas de resistencia de concreto'],
    array['Levante de muros de fachada','Mampostería interior','Pañetes y revoques','Impermeabilización de cubierta'],
    array['Redes hidrosanitarias','Redes eléctricas y datos','Red contra incendios','Montaje de ascensores'],
    array['Enchapes y pisos','Carpintería de madera y metálica','Pintura de interiores','Cocinas integrales y ventanería'],
    array['Zonas verdes y paisajismo','Salón social y gimnasio','Pruebas finales y puesta en marcha','Entrega de unidades a propietarios']];
begin
  select * into pr from public.projects where id = p_project;
  select p.id into v_inter from public.profiles p where p.interventor_id = pr.interventor_id limit 1;
  for ph in select * from public.phases order by sort loop
    c := p_counts[ph.sort]; v_base := round(ph.ref_pct / c, 4); v_acc := 0;
    for k in 1 .. c loop
      v_n := v_n + 1;
      v_pct := case when k < c then v_base else ph.ref_pct - v_acc end; v_acc := v_acc + v_pct; v_cum := v_cum + v_pct;
      v_status := case when v_n < pr.current_month - 1 then 'desembolsado'
                       when v_n = pr.current_month - 1 then (case when p_review then 'revision' else 'desembolsado' end)
                       when v_n = pr.current_month then 'en_curso' else 'pendiente' end;
      v_plan := least(100, round(v_cum, 4));
      insert into public.milestones (project_id, n, month_date, phase_key, tranche_pct, planned_cum, actual_cum, status, activities, released_on)
      values (p_project, v_n, (date_trunc('month', pr.start_date) + make_interval(months => v_n - 1))::date, ph.key, v_pct, v_plan,
              case v_status when 'desembolsado' then greatest(0, least(100, round(v_plan + case when v_n >= 4 then sin(v_n * 1.7)::numeric * 1.5 - p_drift else 0 end, 4)))
                            when 'revision' then greatest(0, round(v_plan - p_drift - 0.6, 4)) end,
              v_status,
              array[v_acts[ph.sort][1 + (k - 1) % 4], v_acts[ph.sort][1 + (k + 1) % 4], v_acts[ph.sort][1 + (k + 2) % 4]],
              case when v_status = 'desembolsado' then (pr.start_date + make_interval(months => v_n))::date + 3 end)
      returning id into v_id;
      if v_status = 'desembolsado' then
        v_amount := round(pr.budget * v_pct / 100, 2);
        insert into public.disbursements (project_id, milestone_id, amount, released_on, approved_by) values (p_project, v_id, v_amount, (pr.start_date + make_interval(months => v_n))::date + 3, v_inter);
        insert into public.escrow_ledger (project_id, kind, amount, milestone_id, note) values (p_project, 'desembolso', -v_amount, v_id, 'Hito mes ' || v_n);
        insert into public.onchain_records (project_id, kind, milestone_id, tx_hash, ledger, payload, status)
        values (p_project, 'desembolso', v_id, md5(v_id::text) || md5(v_n::text || p_project::text), 51200000 + v_n * 17311, jsonb_build_object('amount', v_amount, 'month', v_n), 'simulado');
      end if;
    end loop;
  end loop;
  perform public.recompute_planned_cum(p_project);
end $$;

select pg_temp.seed_schedule('d0000000-0000-4000-8000-000000000001', array[2,3,7,3,3,4,2], true, 1.4);
select pg_temp.seed_schedule('d0000000-0000-4000-8000-000000000002', array[2,3,5,2,3,3,2], true, 0.8);
select pg_temp.seed_schedule('d0000000-0000-4000-8000-000000000003', array[2,4,9,4,4,5,2], false, 0.3);

-- Historial de un hito con observaciones ya subsanadas (mes 4 del proyecto 1)
insert into public.milestone_events (milestone_id, kind, by_name, by_role, text)
select m.id, e.kind, e.by_name, e.by_role::public.user_role, e.text
from public.milestones m,
     (values ('observado', 'Ricardo Salazar', 'interventor', 'Faltan ensayos de resistencia a 28 días de la primera fundida. Se solicita adjuntar el informe del laboratorio.'),
             ('subsanado', 'Carolina Mejía', 'constructora', 'Se adjunta informe del laboratorio acreditado ONAC. Resistencia: 28.4 MPa (≥ 28 MPa de diseño).'),
             ('aprobado', 'Ricardo Salazar', 'interventor', 'Observaciones subsanadas. Hito aprobado y desembolso autorizado.')) as e(kind, by_name, by_role, text)
where m.project_id = 'd0000000-0000-4000-8000-000000000001' and m.n = 4;

-- Ancla simulada del cronograma de cada proyecto
insert into public.onchain_records (project_id, kind, payload, status)
select p.id, 'ancla_cronograma', jsonb_build_object('schedule_hash', (select md5(string_agg(n || ':' || phase_key || ':' || tranche_pct, ',' order by n)) from public.milestones where project_id = p.id)), 'simulado'
from public.projects p;

-- ============================================================
-- Compra del comprador de demostración (Apto. 1204, Torre A)
-- ============================================================
insert into public.purchases (id, buyer_id, project_id, typology_id, unit_code, area, price, plan)
select 'f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', t.project_id, t.id, 'Torre A · Apto. 1204', t.area, t.price,
       '10 % cuota inicial · 20 % en 24 cuotas · 70 % crédito hipotecario'
from public.project_typologies t where t.project_id = 'd0000000-0000-4000-8000-000000000001' and t.name like 'Tipo B%';

insert into public.payments (purchase_id, n, due_on, amount, paid_on)
select 'f0000000-0000-4000-8000-000000000001', i, (date '2025-12-05' + make_interval(months => i))::date,
       case when i = 0 then round(652000000 * 0.10, 2) else round(652000000 * 0.20 / 24, 2) end,
       case when i <= 17 then (date '2025-12-05' + make_interval(months => i))::date end
from generate_series(0, 24) i;

-- ============================================================
-- Actividad y notificaciones iniciales
-- ============================================================
insert into public.audit_log (at, actor_name, actor_role, project_id, action, icon) values
 (now() - interval '2 days',  'Salazar & Asociados',    'interventor',  'd0000000-0000-4000-8000-000000000001', 'Visita de obra registrada · Torre B piso 14', 'clipboard-check'),
 (now() - interval '3 days',  'Cimientos & Desarrollos', 'constructora', 'd0000000-0000-4000-8000-000000000001', 'Cargó evidencias del mes (23 fotos, 2 videos)', 'camera'),
 (now() - interval '5 days',  'Salazar & Asociados',    'interventor',  'd0000000-0000-4000-8000-000000000002', 'Revisó el informe de avance del mes', 'file-text'),
 (now() - interval '14 days', 'Laura Gómez',            'admin',        'd0000000-0000-4000-8000-000000000003', 'Validó la póliza de cumplimiento actualizada', 'shield-check');

insert into public.notifications (user_id, kind, title, body, link, project_id) values
 ('e0000000-0000-4000-8000-000000000004', 'hito', 'Hito por revisar', 'Torres del Parque · espera tu revisión.', '/revisiones', 'd0000000-0000-4000-8000-000000000001'),
 ('e0000000-0000-4000-8000-000000000002', 'avance', 'Avance aprobado', 'El último hito de Torres del Parque fue aprobado.', '/obra', 'd0000000-0000-4000-8000-000000000001');
