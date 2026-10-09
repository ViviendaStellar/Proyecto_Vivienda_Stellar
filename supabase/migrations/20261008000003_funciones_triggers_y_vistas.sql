-- INN-LOCK · Migración 3: funciones auxiliares, triggers, vistas y flujo de aprobación (RPC)
-- Todas las funciones que cambian el estado del negocio son SECURITY DEFINER y validan el rol del usuario
-- (auth.uid()). El cliente NO modifica directamente estados, desembolsos ni cronogramas bloqueados.

-- ============================================================
-- Identidad y alcance del usuario autenticado
-- ============================================================
create or replace function public.auth_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.auth_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.auth_interventor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select interventor_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() = 'admin', false)
$$;

-- ¿Participa el usuario en el proyecto como administrador, constructora dueña o interventor asignado?
create or replace function public.is_project_member(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid and (
      public.is_admin()
      or p.company_id = public.auth_company_id()
      or (p.interventor_id is not null and p.interventor_id = public.auth_interventor_id() and p.stage <> 'borrador')
    )
  )
$$;

create or replace function public.is_project_buyer(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.purchases pu where pu.project_id = pid and pu.buyer_id = auth.uid())
$$;

-- Los proyectos activos son visibles para todo usuario autenticado; el resto, solo para sus participantes.
create or replace function public.can_view_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_project_member(pid)
      or public.is_project_buyer(pid)
      or exists (select 1 from public.projects p where p.id = pid and p.stage in ('activo', 'finalizado'))
$$;

-- ============================================================
-- Cumplimiento legal de la constructora
-- ============================================================
create or replace function public.has_pending_submission(doc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.document_submissions s where s.document_id = doc and s.status = 'pendiente')
$$;

create or replace function public.effective_doc_status(p_expires date, p_override public.doc_status, p_pending boolean)
returns public.doc_status language sql stable as $$
  select case
    when p_override is not null then p_override
    when p_pending then 'revision'::public.doc_status
    when p_expires is not null and p_expires < current_date then 'vencido'::public.doc_status
    when p_expires is not null and p_expires - current_date <= 15 then 'por_vencer'::public.doc_status
    else 'vigente'::public.doc_status
  end
$$;

create or replace function public.company_compliance(cid uuid)
returns table (ok integer, total integer, pct numeric, blocked integer)
language sql stable security definer set search_path = public as $$
  with st as (
    select case when d.id is null then 'faltante'::public.doc_status
                else public.effective_doc_status(d.expires_on, d.status_override, public.has_pending_submission(d.id)) end as s
    from public.document_types t
    left join public.company_documents d on d.type_key = t.key and d.company_id = cid
    where t.scope = 'company' and t.required
  )
  select (count(*) filter (where s in ('vigente', 'por_vencer')))::integer,
         count(*)::integer,
         coalesce(round(100.0 * count(*) filter (where s in ('vigente', 'por_vencer')) / nullif(count(*), 0), 2), 0),
         (count(*) filter (where s in ('vencido', 'faltante')))::integer
  from st
$$;

create or replace function public.company_blocked(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (select blocked from public.company_compliance(cid)) > 0
$$;

-- ============================================================
-- Utilidades internas (no expuestas al cliente)
-- ============================================================
create or replace function public.log_audit(p_action text, p_icon text, p_project uuid default null, p_payload jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v public.profiles;
begin
  select * into v from public.profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_name, actor_role, project_id, action, icon, payload)
  values (auth.uid(), v.full_name, v.role, p_project, p_action, p_icon, coalesce(p_payload, '{}'::jsonb));
end $$;

create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text default null, p_link text default null, p_project uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, link, project_id) values (p_user, p_kind, p_title, p_body, p_link, p_project)
$$;

create or replace function public.notify_project(p_project uuid, p_audience text, p_kind text, p_title text, p_body text default null, p_link text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.projects;
begin
  select * into p from public.projects where id = p_project;
  if p_audience = 'constructora' then
    perform public.notify(u.id, p_kind, p_title, p_body, p_link, p_project) from public.profiles u where u.company_id = p.company_id and u.active;
  elsif p_audience = 'interventor' then
    perform public.notify(u.id, p_kind, p_title, p_body, p_link, p_project) from public.profiles u where u.interventor_id = p.interventor_id and u.active;
  elsif p_audience = 'admin' then
    perform public.notify(u.id, p_kind, p_title, p_body, p_link, p_project) from public.profiles u where u.role = 'admin' and u.active;
  elsif p_audience = 'compradores' then
    perform public.notify(pu.buyer_id, p_kind, p_title, p_body, p_link, p_project) from (select distinct buyer_id from public.purchases where project_id = p_project) pu;
  end if;
end $$;

create or replace function public._bypass() returns void language sql as $$
  select set_config('innlock.bypass', 'on', true)
$$;

create or replace function public._bypassed() returns boolean language sql stable as $$
  select coalesce(current_setting('innlock.bypass', true), '') = 'on'
$$;

create or replace function public._me() returns public.profiles language sql stable security definer set search_path = public as $$
  select p from public.profiles p where p.id = auth.uid() and p.active
$$;

create or replace function public._add_review(p_project uuid, p_kind text, p_text text default null) returns void
language sql security definer set search_path = public as $$
  insert into public.project_reviews (project_id, kind, by_user, by_name, by_role, text)
  select p_project, p_kind, auth.uid(), pr.full_name, pr.role, p_text from public.profiles pr where pr.id = auth.uid()
$$;

create or replace function public._add_event(p_milestone uuid, p_kind text, p_text text default null) returns void
language sql security definer set search_path = public as $$
  insert into public.milestone_events (milestone_id, kind, by_user, by_name, by_role, text)
  select p_milestone, p_kind, auth.uid(), pr.full_name, pr.role, p_text from public.profiles pr where pr.id = auth.uid()
$$;

-- Recalcula el avance planificado acumulado de todos los hitos de un proyecto
create or replace function public.recompute_planned_cum(pid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_last numeric;
begin
  perform public._bypass();
  update public.milestones m set planned_cum = least(100, c.cum)
  from (select id, round(sum(tranche_pct) over (order by n), 4) as cum from public.milestones where project_id = pid) c
  where m.id = c.id;
  select planned_cum into v_last from public.milestones where project_id = pid order by n desc limit 1;
  if v_last is not null and abs(100 - v_last) < 0.05 then
    update public.milestones set planned_cum = 100 where project_id = pid and n = (select max(n) from public.milestones where project_id = pid);
  end if;
end $$;

-- ============================================================
-- Triggers de protección
-- ============================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- El rol SIEMPRE nace como comprador; solo un administrador puede elevarlo (admin_set_role).
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public._bypassed() and not coalesce(public.is_admin(), false) then
    if new.role is distinct from old.role or new.company_id is distinct from old.company_id
       or new.interventor_id is distinct from old.interventor_id or new.active is distinct from old.active then
      raise exception 'No puedes modificar tu rol, organización o estado' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger trg_profiles_guard before update on public.profiles for each row execute function public.guard_profile_update();

create or replace function public.guard_project_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public._bypassed() then
    if new.stage is distinct from old.stage then
      raise exception 'El estado del proyecto solo cambia mediante el flujo de aprobación' using errcode = '42501';
    end if;
    if old.schedule_locked and (new.budget is distinct from old.budget or new.start_date is distinct from old.start_date
       or new.months is distinct from old.months or new.schedule_locked is distinct from old.schedule_locked) then
      raise exception 'El cronograma está bloqueado: solicita un cambio al interventor' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger trg_projects_guard before update on public.projects for each row execute function public.guard_project_update();

create or replace function public.guard_milestone_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_locked boolean;
begin
  if auth.uid() is null or public._bypassed() then
    return coalesce(new, old);
  end if;
  select schedule_locked into v_locked from public.projects where id = coalesce(new.project_id, old.project_id);
  if coalesce(v_locked, false) then
    if tg_op in ('INSERT', 'DELETE')
       or new.tranche_pct is distinct from old.tranche_pct or new.n is distinct from old.n or new.phase_key is distinct from old.phase_key then
      raise exception 'El cronograma está bloqueado: solicita un cambio al interventor' using errcode = '42501';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger trg_milestones_guard before insert or update or delete on public.milestones for each row execute function public.guard_milestone_change();

-- Unidades vendidas del proyecto
create or replace function public.sync_units_sold() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pid uuid := coalesce(new.project_id, old.project_id);
begin
  update public.projects set units_sold = (select count(*) from public.purchases where project_id = v_pid) where id = v_pid;
  return null;
end $$;
create trigger trg_purchases_units after insert or delete on public.purchases for each row execute function public.sync_units_sold();

-- Cada pago confirmado de un comprador ingresa al libro de la custodia
create or replace function public.sync_payment_ledger() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pid uuid;
begin
  select project_id into v_pid from public.purchases where id = new.purchase_id;
  if new.paid_on is not null and (tg_op = 'INSERT' or old.paid_on is null) then
    insert into public.escrow_ledger (project_id, kind, amount, purchase_id, payment_id, note)
    values (v_pid, 'aporte_comprador', new.amount, new.purchase_id, new.id, case when new.n = 0 then 'Cuota inicial' else 'Cuota ' || new.n end);
  elsif tg_op = 'UPDATE' and new.paid_on is null and old.paid_on is not null then
    delete from public.escrow_ledger where payment_id = new.id;
  end if;
  return new;
end $$;
create trigger trg_payments_ledger after insert or update of paid_on on public.payments for each row execute function public.sync_payment_ledger();

-- ============================================================
-- Vistas
-- ============================================================
create view public.v_company_documents with (security_invoker = true) as
select d.*, t.title, t.subtitle, t.required, t.has_expiry,
       public.effective_doc_status(d.expires_on, d.status_override, public.has_pending_submission(d.id)) as effective_status
from public.company_documents d
join public.document_types t on t.key = d.type_key;

create view public.v_milestones with (security_invoker = true) as
select m.*, ph.name as phase_name, round(p.budget * m.tranche_pct / 100, 2) as amount
from public.milestones m
join public.projects p on p.id = m.project_id
join public.phases ph on ph.key = m.phase_key;

-- Fondos del proyecto (filtrada por can_view_project; no expone movimientos individuales de otros compradores).
-- budget/released/custody: avance de la obra · contributed: aportes de compradores · escrow_balance: aportes − desembolsos
create view public.v_project_funds as
select p.id as project_id,
       p.budget,
       coalesce(d.released, 0)                       as released,
       coalesce(r.in_review, 0)                      as in_review,
       p.budget - coalesce(d.released, 0)            as custody,
       coalesce(l.contributed, 0)                    as contributed,
       coalesce(l.balance, 0)                        as escrow_balance
from public.projects p
left join lateral (select sum(amount) as released from public.disbursements where project_id = p.id) d on true
left join lateral (select sum(round(p.budget * tranche_pct / 100, 2)) as in_review from public.milestones where project_id = p.id and status = 'revision') r on true
left join lateral (select sum(amount) filter (where kind = 'aporte_comprador') as contributed, sum(amount) as balance from public.escrow_ledger where project_id = p.id) l on true
where p.budget is not null and public.can_view_project(p.id);

create view public.v_purchases with (security_invoker = true) as
select pu.*,
       coalesce(sum(pa.amount) filter (where pa.paid_on is not null), 0) as paid_total,
       coalesce(sum(pa.amount), 0)                                      as scheduled_total,
       count(pa.id) filter (where pa.n > 0)                             as installments_total,
       count(pa.id) filter (where pa.n > 0 and pa.paid_on is not null)  as installments_paid,
       min(pa.due_on) filter (where pa.paid_on is null)                 as next_due,
       (array_agg(pa.amount order by pa.due_on) filter (where pa.paid_on is null))[1] as next_amount
from public.purchases pu
left join public.payments pa on pa.purchase_id = pu.id
group by pu.id;

-- ============================================================
-- Validación del cronograma (reglas de la plataforma)
-- ============================================================
create or replace function public.validate_schedule(pid uuid)
returns table (code text, message text)
language plpgsql stable security definer set search_path = public as $$
declare v_n integer; v_sum numeric; v_cap numeric;
begin
  if not public.can_view_project(pid) then return; end if;  -- no revela datos de proyectos ajenos
  select count(*), coalesce(sum(tranche_pct), 0) into v_n, v_sum from public.milestones where project_id = pid;
  v_cap := greatest(15, round(200.0 / greatest(v_n, 1), 2));
  if v_n < 6 then code := 'months'; message := format('El cronograma tiene %s mes(es); el mínimo es 6.', v_n); return next; end if;
  if v_n > 60 then code := 'months'; message := format('El cronograma tiene %s meses; el máximo es 60.', v_n); return next; end if;
  if v_n > 0 and abs(v_sum - 100) > 0.01 then
    code := 'sum'; message := format('Los porcentajes suman %s %%; deben sumar exactamente 100 %%.', v_sum); return next;
  end if;
  for code, message in
    select 'cap', format('Mes %s: %s %% supera el tope por hito (%s %%).', m.n, m.tranche_pct, v_cap)
    from public.milestones m where m.project_id = pid and m.tranche_pct > v_cap
  loop return next; end loop;
  for code, message in
    select 'order', format('Mes %s: la fase «%s» vuelve a una etapa anterior.', x.n, x.name)
    from (
      select m.n, ph.name, ph.sort,
             max(ph.sort) over (order by m.n rows between unbounded preceding and 1 preceding) as prev_max
      from public.milestones m join public.phases ph on ph.key = m.phase_key where m.project_id = pid
    ) x where x.prev_max is not null and x.sort < x.prev_max
  loop return next; end loop;
  for code, message in
    select 'acts', format('Mes %s: describe al menos una actividad.', m.n)
    from public.milestones m where m.project_id = pid and coalesce(array_length(m.activities, 1), 0) = 0
  loop return next; end loop;
end $$;

-- ============================================================
-- Registro del proyecto (constructora)
-- ============================================================
create or replace function public._submit_project(pid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  p public.projects;
  errs text[] := '{}';
  e record;
begin
  select * into p from public.projects where id = pid for update;
  if coalesce(trim(p.name), '') = '' then errs := errs || 'Falta el nombre del proyecto'; end if;
  if coalesce(trim(p.city), '') = '' or coalesce(trim(p.zone), '') = '' or coalesce(trim(p.address), '') = '' then errs := errs || 'Faltan ciudad, zona o dirección'; end if;
  if char_length(coalesce(trim(p.description), '')) < 40 then errs := errs || 'La descripción debe tener al menos 40 caracteres'; end if;
  if coalesce(p.towers, 0) < 1 or coalesce(p.floors, 0) < 1 or coalesce(p.units, 0) < 1 then errs := errs || 'Faltan torres, pisos o unidades'; end if;
  if p.interventor_id is null then errs := errs || 'Falta el interventor'; end if;
  if p.budget is null or p.start_date is null then errs := errs || 'Faltan el presupuesto o la fecha de inicio'; end if;
  if coalesce(trim(p.lic_number), '') = '' or coalesce(trim(p.lic_issuer), '') = '' then errs := errs || 'Faltan los datos de la licencia de construcción';
  elsif p.lic_expires is null or p.lic_expires < current_date then errs := errs || 'La licencia de construcción no está vigente'; end if;
  if coalesce(trim(p.fiducia_issuer), '') = '' or coalesce(trim(p.fiducia_number), '') = '' then errs := errs || 'Faltan los datos del encargo fiduciario'; end if;
  if not exists (select 1 from public.project_typologies where project_id = pid) then errs := errs || 'Agrega al menos una tipología'; end if;
  if (select count(*) from public.project_plans where project_id = pid and kind in ('arq', 'est') and file_path is not null and sheets > 0) < 2 then
    errs := errs || 'Carga los planos arquitectónicos y estructurales';
  end if;
  for e in select * from public.validate_schedule(pid) loop errs := errs || e.message; end loop;
  if public.company_blocked(p.company_id) then errs := errs || 'La documentación legal de la constructora tiene documentos vencidos o faltantes'; end if;
  if array_length(errs, 1) > 0 then
    raise exception 'Proyecto incompleto: %', array_to_string(errs, ' · ') using errcode = '23514';
  end if;

  perform public._bypass();
  update public.projects set stage = 'interventor', submitted_at = now() where id = pid;
  perform public._add_review(pid, case when p.stage = 'observado' then 'reenviado' else 'enviado' end,
                             case when p.stage = 'observado' then 'Proyecto corregido y reenviado a interventoría.' else 'Proyecto registrado y enviado a interventoría.' end);
  perform public.notify_project(pid, 'interventor', 'solicitud', 'Nuevo proyecto por revisar', p.name || ' espera la revisión de su cronograma.', '/solicitudes');
  perform public.log_audit(case when p.stage = 'observado' then 'Reenvió el proyecto «' || p.name || '» a interventoría' else 'Registró el proyecto «' || p.name || '»' end, 'send', pid);
end $$;

-- Crea o actualiza un proyecto (y su cronograma) a partir del payload del asistente.
-- p_payload: { name, tagline, description, city, zone, address, lat, lng, towers, floors, units, parking, strata,
--              budget, start_date, photo_path, lic_number, lic_issuer, lic_expires, fiducia_issuer, fiducia_number,
--              interventor_id, typologies:[{name,area,beds,baths,parking,price}], amenities:[text],
--              plans:[{kind,name,sheets,version,file_path,file_size}], rows:[{phase,pct,acts}] }
create or replace function public.save_project(p_id uuid, p_payload jsonb, p_submit boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me public.profiles := public._me();
  v_id uuid;
  v_p  public.projects;
  v_start date := nullif(p_payload ->> 'start_date', '')::date;
begin
  if v_me.id is null or v_me.role <> 'constructora' or v_me.company_id is null then
    raise exception 'Solo una constructora puede registrar proyectos' using errcode = '42501';
  end if;
  perform public._bypass();
  if p_id is null then
    insert into public.projects (name, company_id, created_by, stage)
    values (coalesce(nullif(trim(p_payload ->> 'name'), ''), 'Proyecto sin nombre'), v_me.company_id, v_me.id, 'borrador')
    returning id into v_id;
  else
    select * into v_p from public.projects where id = p_id for update;
    if not found or v_p.company_id <> v_me.company_id then raise exception 'Proyecto no encontrado' using errcode = '42501'; end if;
    if v_p.stage not in ('borrador', 'observado') then raise exception 'El proyecto no se puede editar en la etapa «%»', v_p.stage using errcode = '42501'; end if;
    v_id := p_id;
  end if;

  update public.projects set
    name = coalesce(nullif(trim(p_payload ->> 'name'), ''), name),
    tagline = nullif(trim(p_payload ->> 'tagline'), ''),
    description = nullif(trim(p_payload ->> 'description'), ''),
    city = nullif(trim(p_payload ->> 'city'), ''), zone = nullif(trim(p_payload ->> 'zone'), ''), address = nullif(trim(p_payload ->> 'address'), ''),
    lat = nullif(p_payload ->> 'lat', '')::numeric, lng = nullif(p_payload ->> 'lng', '')::numeric,
    towers = nullif(p_payload ->> 'towers', '')::smallint, floors = nullif(p_payload ->> 'floors', '')::smallint,
    units = nullif(p_payload ->> 'units', '')::integer, parking = nullif(p_payload ->> 'parking', '')::integer,
    strata = coalesce(nullif(p_payload ->> 'strata', '')::smallint, 5),
    budget = nullif(p_payload ->> 'budget', '')::numeric, start_date = v_start,
    photo_path = nullif(p_payload ->> 'photo_path', ''),
    lic_number = nullif(trim(p_payload ->> 'lic_number'), ''), lic_issuer = nullif(trim(p_payload ->> 'lic_issuer'), ''), lic_expires = nullif(p_payload ->> 'lic_expires', '')::date,
    fiducia_issuer = nullif(trim(p_payload ->> 'fiducia_issuer'), ''), fiducia_number = nullif(trim(p_payload ->> 'fiducia_number'), ''),
    interventor_id = nullif(p_payload ->> 'interventor_id', '')::uuid
  where id = v_id;

  delete from public.project_typologies where project_id = v_id;
  insert into public.project_typologies (project_id, name, area, beds, baths, parking, price)
  select v_id, t.name, t.area, coalesce(t.beds, 0), coalesce(t.baths, 0), coalesce(t.parking, 0), t.price
  from jsonb_to_recordset(coalesce(p_payload -> 'typologies', '[]'::jsonb)) as t(name text, area numeric, beds int, baths int, parking int, price numeric)
  where t.name is not null and t.area > 0 and t.price > 0;
  update public.projects set
    price_from = (select min(price) from public.project_typologies where project_id = v_id),
    area_min = (select min(area) from public.project_typologies where project_id = v_id),
    area_max = (select max(area) from public.project_typologies where project_id = v_id)
  where id = v_id;

  delete from public.project_amenities where project_id = v_id;
  insert into public.project_amenities (project_id, amenity)
  select distinct v_id, trim(a) from jsonb_array_elements_text(coalesce(p_payload -> 'amenities', '[]'::jsonb)) a where trim(a) <> '';

  delete from public.project_plans where project_id = v_id;
  insert into public.project_plans (project_id, kind, name, sheets, version, file_path, file_size)
  select v_id, x.kind, x.name, coalesce(x.sheets, 0), coalesce(x.version, '1.0'), x.file_path, x.file_size
  from jsonb_to_recordset(coalesce(p_payload -> 'plans', '[]'::jsonb)) as x(kind text, name text, sheets int, version text, file_path text, file_size bigint)
  where x.kind in ('arq', 'est', 'hid', 'ele') and x.file_path is not null;

  delete from public.milestones where project_id = v_id;
  insert into public.milestones (project_id, n, month_date, phase_key, tranche_pct, activities)
  select v_id, e.ord::int, (date_trunc('month', coalesce(v_start, current_date)) + make_interval(months => e.ord::int - 1))::date,
         e.value ->> 'phase', (e.value ->> 'pct')::numeric,
         case when jsonb_typeof(e.value -> 'acts') = 'array'
              then array(select trim(a) from jsonb_array_elements_text(e.value -> 'acts') a where trim(a) <> '')
              else array(select trim(a) from unnest(regexp_split_to_array(coalesce(e.value ->> 'acts', ''), '\s*[;|\n]\s*')) a where trim(a) <> '') end
  from jsonb_array_elements(coalesce(p_payload -> 'rows', '[]'::jsonb)) with ordinality as e(value, ord);
  update public.projects set months = (select count(*) from public.milestones where project_id = v_id) where id = v_id
    and (select count(*) from public.milestones where project_id = v_id) between 6 and 60;
  perform public.recompute_planned_cum(v_id);

  if p_submit then perform public._submit_project(v_id); end if;
  return v_id;
end $$;

-- ============================================================
-- Aprobación del proyecto: interventor → administrador
-- ============================================================
create or replace function public.review_project(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_me public.profiles := public._me(); p public.projects;
begin
  select * into p from public.projects where id = p_id for update;
  if not found then raise exception 'Proyecto no encontrado'; end if;
  if v_me.role <> 'interventor' or v_me.interventor_id is distinct from p.interventor_id then raise exception 'Solo el interventor asignado puede revisar el proyecto' using errcode = '42501'; end if;
  if p.stage <> 'interventor' then raise exception 'El proyecto no está pendiente de interventoría (etapa «%»)', p.stage; end if;
  perform public._bypass();
  if p_approve then
    update public.projects set stage = 'admin' where id = p_id;
    perform public._add_review(p_id, 'aprobado por interventor', p_note);
    perform public.notify_project(p_id, 'admin', 'solicitud', 'Proyecto listo para validar', p.name || ' fue aprobado por interventoría.', '/solicitudes');
    perform public.log_audit('Aprobó el cronograma de «' || p.name || '»', 'check-circle-2', p_id);
  else
    if char_length(coalesce(trim(p_note), '')) < 8 then raise exception 'Describe las observaciones (mínimo 8 caracteres)'; end if;
    update public.projects set stage = 'observado' where id = p_id;
    perform public._add_review(p_id, 'observado', p_note);
    perform public.notify_project(p_id, 'constructora', 'observacion', 'Proyecto devuelto con observaciones', p_note, '/proyectos');
    perform public.log_audit('Devolvió «' || p.name || '» con observaciones', 'alert-triangle', p_id);
  end if;
end $$;

create or replace function public.activate_project(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.projects; v_hash text;
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede activar proyectos' using errcode = '42501'; end if;
  select * into p from public.projects where id = p_id for update;
  if not found then raise exception 'Proyecto no encontrado'; end if;
  if p.stage <> 'admin' then raise exception 'El proyecto no está pendiente de validación (etapa «%»)', p.stage; end if;
  perform public._bypass();
  if p_approve then
    if public.company_blocked(p.company_id) then raise exception 'No se puede activar: la constructora tiene documentación vencida o faltante' using errcode = '23514'; end if;
    update public.projects set stage = 'activo', schedule_locked = true, activated_at = now(), current_month = 1 where id = p_id;
    update public.milestones set status = 'en_curso' where project_id = p_id and n = 1;
    select md5(string_agg(n || ':' || phase_key || ':' || tranche_pct, ',' order by n)) into v_hash from public.milestones where project_id = p_id;
    insert into public.onchain_records (project_id, kind, payload, status)
    values (p_id, 'ancla_cronograma', jsonb_build_object('schedule_hash', v_hash, 'months', p.months, 'budget', p.budget), 'simulado');
    perform public._add_review(p_id, 'activado', p_note);
    perform public.notify_project(p_id, 'constructora', 'proyecto', 'Proyecto activado', p.name || ' ya está en construcción y su cronograma quedó bloqueado.', '/panel');
    perform public.log_audit('Activó el proyecto «' || p.name || '»', 'shield-check', p_id);
  else
    if char_length(coalesce(trim(p_note), '')) < 8 then raise exception 'Describe las observaciones (mínimo 8 caracteres)'; end if;
    update public.projects set stage = 'observado' where id = p_id;
    perform public._add_review(p_id, 'observado', p_note);
    perform public.notify_project(p_id, 'constructora', 'observacion', 'Proyecto devuelto con observaciones', p_note, '/proyectos');
    perform public.log_audit('Devolvió «' || p.name || '» con observaciones', 'alert-triangle', p_id);
  end if;
end $$;

-- ============================================================
-- Hitos de obra: envío (constructora) y revisión (interventor)
-- ============================================================
create or replace function public.submit_milestone(p_milestone uuid, p_summary text default null, p_reported_cum numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_me public.profiles := public._me(); m public.milestones; p public.projects; v_imgs integer;
begin
  select * into m from public.milestones where id = p_milestone for update;
  if not found then raise exception 'Hito no encontrado'; end if;
  select * into p from public.projects where id = m.project_id;
  if v_me.role <> 'constructora' or v_me.company_id is distinct from p.company_id then raise exception 'Solo la constructora del proyecto puede enviar el hito' using errcode = '42501'; end if;
  if p.stage <> 'activo' then raise exception 'El proyecto no está activo'; end if;
  if m.status not in ('en_curso', 'observado') then raise exception 'El hito no se puede enviar en estado «%»', m.status; end if;
  select count(*) into v_imgs from public.milestone_evidence where milestone_id = p_milestone and kind = 'imagen';
  if v_imgs < 3 then raise exception 'Adjunta al menos 3 fotos de evidencia (hay %)', v_imgs using errcode = '23514'; end if;
  if p_reported_cum is not null and (p_reported_cum < 0 or p_reported_cum > 100) then raise exception 'El avance reportado debe estar entre 0 y 100'; end if;
  perform public._bypass();
  update public.milestones set status = 'revision', actual_cum = coalesce(p_reported_cum, actual_cum, greatest(0, planned_cum - 0.5)),
         report = exists (select 1 from public.milestone_evidence where milestone_id = p_milestone and kind = 'pdf')
  where id = p_milestone;
  perform public._add_event(p_milestone, case when m.status = 'observado' then 'subsanado' else 'enviado' end, coalesce(nullif(trim(p_summary), ''), 'Evidencias del mes cargadas para revisión.'));
  perform public.notify_project(p.id, 'interventor', 'hito', 'Hito por revisar', p.name || ' · mes ' || m.n || ' espera tu revisión.', '/revisiones');
  perform public.log_audit('Envió el hito del mes ' || m.n || ' de «' || p.name || '» a interventoría', 'send', p.id);
end $$;

create or replace function public.review_milestone(p_milestone uuid, p_approve boolean, p_note text default null, p_checks jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me public.profiles := public._me(); m public.milestones; p public.projects;
  v_amount numeric; v_next smallint; v_open integer;
begin
  select * into m from public.milestones where id = p_milestone for update;
  if not found then raise exception 'Hito no encontrado'; end if;
  select * into p from public.projects where id = m.project_id;
  if v_me.role <> 'interventor' or v_me.interventor_id is distinct from p.interventor_id then raise exception 'Solo el interventor asignado puede revisar el hito' using errcode = '42501'; end if;
  if m.status <> 'revision' then raise exception 'El hito no está en revisión (estado «%»)', m.status; end if;
  perform public._bypass();
  if p_approve then
    if jsonb_typeof(p_checks) is distinct from 'array' or jsonb_array_length(p_checks) < 4
       or exists (select 1 from jsonb_array_elements(p_checks) c where c <> 'true'::jsonb) then
      raise exception 'Debes confirmar todos los puntos de verificación antes de aprobar' using errcode = '23514';
    end if;
    if public.company_blocked(p.company_id) then
      raise exception 'Desembolso bloqueado: la constructora tiene documentación vencida o faltante' using errcode = '23514';
    end if;
    v_amount := round(p.budget * m.tranche_pct / 100, 2);
    update public.milestones set status = 'desembolsado', released_on = current_date, actual_cum = coalesce(actual_cum, planned_cum) where id = p_milestone;
    insert into public.disbursements (project_id, milestone_id, amount, approved_by) values (p.id, p_milestone, v_amount, v_me.id);
    insert into public.escrow_ledger (project_id, kind, amount, milestone_id, note) values (p.id, 'desembolso', -v_amount, p_milestone, 'Hito mes ' || m.n);
    insert into public.onchain_records (project_id, kind, milestone_id, tx_hash, payload, status)
    values (p.id, 'desembolso', p_milestone, md5(p_milestone::text || clock_timestamp()::text) || md5(random()::text),
            jsonb_build_object('amount', v_amount, 'month', m.n, 'approved_by', v_me.id), 'simulado');
    perform public._add_event(p_milestone, 'aprobado', coalesce(nullif(trim(p_note), ''), 'Hito verificado en sitio. Desembolso autorizado.'));
    select min(n) into v_next from public.milestones where project_id = p.id and n > m.n and status = 'pendiente';
    if v_next is not null then
      update public.milestones set status = 'en_curso' where project_id = p.id and n = v_next;
      update public.projects set current_month = v_next where id = p.id;
    else
      select count(*) into v_open from public.milestones where project_id = p.id and status <> 'desembolsado';
      if v_open = 0 then update public.projects set stage = 'finalizado' where id = p.id; end if;
    end if;
    perform public.notify_project(p.id, 'constructora', 'desembolso', 'Desembolso liberado', 'Se liberaron ' || v_amount || ' del mes ' || m.n || ' de ' || p.name || '.', '/fondos');
    perform public.notify_project(p.id, 'compradores', 'avance', 'Avance aprobado', 'El hito del mes ' || m.n || ' de ' || p.name || ' fue aprobado por el interventor.', '/obra');
    perform public.log_audit('Aprobó el hito del mes ' || m.n || ' de «' || p.name || '» y liberó el desembolso', 'check-circle-2', p.id, jsonb_build_object('amount', v_amount));
  else
    if char_length(coalesce(trim(p_note), '')) < 8 then raise exception 'Describe las observaciones (mínimo 8 caracteres)'; end if;
    update public.milestones set status = 'observado' where id = p_milestone;
    perform public._add_event(p_milestone, 'observado', p_note);
    perform public.notify_project(p.id, 'constructora', 'observacion', 'Hito con observaciones', p_note, '/obra');
    perform public.log_audit('Observó el hito del mes ' || m.n || ' de «' || p.name || '»', 'alert-triangle', p.id);
  end if;
end $$;

-- ============================================================
-- Cambios al cronograma bloqueado
-- ============================================================
create or replace function public.request_schedule_change(p_project uuid, p_reason text, p_items jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me public.profiles := public._me(); p public.projects; v_id uuid;
  v_cap numeric; v_old numeric; v_new numeric; v_cnt integer; v_pend integer; v_changed integer;
begin
  select * into p from public.projects where id = p_project;
  if not found or v_me.role <> 'constructora' or v_me.company_id is distinct from p.company_id then raise exception 'Proyecto no encontrado' using errcode = '42501'; end if;
  if p.stage <> 'activo' then raise exception 'Solo se puede solicitar cambios en proyectos activos'; end if;
  if char_length(coalesce(trim(p_reason), '')) < 20 then raise exception 'Explica el motivo del cambio (mínimo 20 caracteres)'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Formato de cambios inválido'; end if;
  select count(*) into v_pend from public.milestones where project_id = p_project and status = 'pendiente';
  if v_pend < 2 then raise exception 'No hay suficientes meses pendientes para modificar'; end if;
  v_cap := greatest(15, round(200.0 / p.months, 2));

  with it as (select (e ->> 'n')::int as n, (e ->> 'to')::numeric as to_pct from jsonb_array_elements(p_items) e)
  select count(*), coalesce(sum(it.to_pct), 0), coalesce(sum(m.tranche_pct), 0),
         count(*) filter (where abs(it.to_pct - m.tranche_pct) > 0.001)
  into v_cnt, v_new, v_old, v_changed
  from it join public.milestones m on m.project_id = p_project and m.n = it.n and m.status = 'pendiente';
  if v_cnt <> jsonb_array_length(p_items) then raise exception 'Solo se pueden modificar meses pendientes y sin repetir'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where (e ->> 'to')::numeric <= 0 or (e ->> 'to')::numeric > v_cap) then
    raise exception 'Cada mes debe estar entre 0 y % %%', v_cap;
  end if;
  if abs(v_new - v_old) > 0.01 then raise exception 'El total de los meses modificados debe conservarse (%)', v_old; end if;
  if v_changed = 0 then raise exception 'Modifica al menos un mes'; end if;
  if exists (select 1 from public.schedule_change_requests where project_id = p_project and status = 'pendiente') then
    raise exception 'Ya hay una solicitud de cambio pendiente';
  end if;

  insert into public.schedule_change_requests (project_id, requested_by, reason) values (p_project, v_me.id, trim(p_reason)) returning id into v_id;
  insert into public.schedule_change_items (request_id, milestone_n, from_pct, to_pct)
  select v_id, (e ->> 'n')::int, m.tranche_pct, (e ->> 'to')::numeric
  from jsonb_array_elements(p_items) e join public.milestones m on m.project_id = p_project and m.n = (e ->> 'n')::int;
  perform public.notify_project(p_project, 'interventor', 'cambio', 'Solicitud de cambio de cronograma', p.name || ' solicita ajustar su cronograma.', '/solicitudes');
  perform public.log_audit('Solicitó un cambio al cronograma de «' || p.name || '»', 'pen-line', p_project);
  return v_id;
end $$;

create or replace function public.resolve_schedule_change(p_request uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_me public.profiles := public._me(); r public.schedule_change_requests; p public.projects; v_hash text;
begin
  select * into r from public.schedule_change_requests where id = p_request for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  select * into p from public.projects where id = r.project_id;
  if v_me.role <> 'interventor' or v_me.interventor_id is distinct from p.interventor_id then raise exception 'Solo el interventor asignado puede resolver la solicitud' using errcode = '42501'; end if;
  if r.status <> 'pendiente' then raise exception 'La solicitud ya fue resuelta'; end if;
  perform public._bypass();
  if p_approve then
    if exists (select 1 from public.schedule_change_items i join public.milestones m on m.project_id = p.id and m.n = i.milestone_n
               where i.request_id = p_request and m.status <> 'pendiente') then
      raise exception 'Algún mes de la solicitud ya no está pendiente';
    end if;
    update public.milestones m set tranche_pct = i.to_pct, changed = true
    from public.schedule_change_items i where i.request_id = p_request and m.project_id = p.id and m.n = i.milestone_n;
    perform public.recompute_planned_cum(p.id);
    select md5(string_agg(n || ':' || phase_key || ':' || tranche_pct, ',' order by n)) into v_hash from public.milestones where project_id = p.id;
    insert into public.onchain_records (project_id, kind, payload, status)
    values (p.id, 'ancla_cronograma', jsonb_build_object('schedule_hash', v_hash, 'request', p_request), 'simulado');
    update public.schedule_change_requests set status = 'aprobada', resolved_by = v_me.id, resolved_at = now(), note = nullif(trim(p_note), '') where id = p_request;
    perform public.log_audit('Aprobó un cambio al cronograma de «' || p.name || '»', 'check-circle-2', p.id);
  else
    if char_length(coalesce(trim(p_note), '')) < 8 then raise exception 'Describe el motivo del rechazo (mínimo 8 caracteres)'; end if;
    update public.schedule_change_requests set status = 'rechazada', resolved_by = v_me.id, resolved_at = now(), note = trim(p_note) where id = p_request;
    perform public.log_audit('Rechazó un cambio al cronograma de «' || p.name || '»', 'x', p.id);
  end if;
  perform public.notify_project(p.id, 'constructora', 'cambio', case when p_approve then 'Cambio de cronograma aprobado' else 'Cambio de cronograma rechazado' end, p_note, '/obra');
end $$;

-- ============================================================
-- Documentos legales de la constructora
-- ============================================================
create or replace function public._apply_submission(p_doc uuid, s public.document_submissions) returns void
language sql security definer set search_path = public as $$
  update public.company_documents
     set number = s.number, issuer = coalesce(s.issuer, issuer), issued_on = s.issued_on, expires_on = s.expires_on,
         file_path = s.file_path, file_size = s.file_size, status_override = null
   where id = p_doc
$$;

create or replace function public.submit_document(
  p_type_key text, p_number text, p_issuer text, p_issued date, p_expires date,
  p_file_path text, p_file_size bigint default null, p_company uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me public.profiles := public._me(); v_company uuid; v_doc uuid; v_sub public.document_submissions; t public.document_types;
begin
  select * into t from public.document_types where key = p_type_key and scope = 'company';
  if not found then raise exception 'Tipo de documento inválido'; end if;
  if v_me.role = 'constructora' then v_company := v_me.company_id;
  elsif v_me.role = 'admin' then v_company := p_company;
  else raise exception 'No autorizado' using errcode = '42501'; end if;
  if v_company is null then raise exception 'Indica la constructora'; end if;
  if t.has_expiry and (p_expires is null or (p_issued is not null and p_expires <= p_issued)) then raise exception 'Indica una fecha de vencimiento posterior a la de expedición'; end if;
  if coalesce(trim(p_file_path), '') = '' then raise exception 'Adjunta el archivo del documento'; end if;

  insert into public.company_documents (company_id, type_key, status_override) values (v_company, p_type_key, 'faltante')
  on conflict (company_id, type_key) do nothing;
  select id into v_doc from public.company_documents where company_id = v_company and type_key = p_type_key;

  insert into public.document_submissions (document_id, number, issuer, issued_on, expires_on, file_path, file_size, submitted_by)
  values (v_doc, p_number, p_issuer, coalesce(p_issued, current_date), p_expires, p_file_path, p_file_size, v_me.id)
  returning * into v_sub;

  perform public._bypass();
  if v_me.role = 'admin' then
    perform public._apply_submission(v_doc, v_sub);
    update public.document_submissions set status = 'validado', reviewed_by = v_me.id, reviewed_at = now() where id = v_sub.id;
  else
    perform public.notify(u.id, 'documento', 'Documento por validar', t.title || ' fue cargado.', '/legal') from public.profiles u where u.role = 'admin' and u.active;
  end if;
  perform public.log_audit('Cargó nueva versión de «' || t.title || '»', 'upload', null, jsonb_build_object('company', v_company));
  return v_sub.id;
end $$;

create or replace function public.review_document_submission(p_submission uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.document_submissions; v_company uuid;
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede validar documentos' using errcode = '42501'; end if;
  select * into s from public.document_submissions where id = p_submission for update;
  if not found or s.status <> 'pendiente' then raise exception 'Solicitud no encontrada o ya resuelta'; end if;
  perform public._bypass();
  if p_approve then
    perform public._apply_submission(s.document_id, s);
    update public.document_submissions set status = 'validado', reviewed_by = auth.uid(), reviewed_at = now(), note = p_note where id = p_submission;
  else
    if char_length(coalesce(trim(p_note), '')) < 8 then raise exception 'Describe el motivo del rechazo (mínimo 8 caracteres)'; end if;
    update public.document_submissions set status = 'rechazado', reviewed_by = auth.uid(), reviewed_at = now(), note = p_note where id = p_submission;
  end if;
  select company_id into v_company from public.company_documents where id = s.document_id;
  perform public.notify(u.id, 'documento', case when p_approve then 'Documento validado' else 'Documento rechazado' end, p_note, '/legal') from public.profiles u where u.company_id = v_company and u.active;
  perform public.log_audit(case when p_approve then 'Validó un documento legal' else 'Rechazó un documento legal' end, 'shield-check', null, jsonb_build_object('submission', p_submission));
end $$;

-- ============================================================
-- Administración
-- ============================================================
create or replace function public.admin_set_role(p_user uuid, p_role public.user_role, p_company uuid default null, p_interventor uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede cambiar roles' using errcode = '42501'; end if;
  if p_role = 'constructora' and p_company is null then raise exception 'Una constructora requiere una organización'; end if;
  if p_role = 'interventor' and p_interventor is null then raise exception 'Un interventor requiere su firma/registro'; end if;
  perform public._bypass();
  update public.profiles set role = p_role,
         company_id = case when p_role = 'constructora' then p_company end,
         interventor_id = case when p_role = 'interventor' then p_interventor end
   where id = p_user;
  if not found then raise exception 'Usuario no encontrado'; end if;
  perform public.log_audit('Cambió el rol de un usuario a ' || p_role, 'user-cog', null, jsonb_build_object('user', p_user, 'role', p_role));
end $$;

-- Venta de una unidad: 10 % cuota inicial + 20 % en cuotas mensuales durante la obra (el resto, crédito del comprador).
create or replace function public.create_purchase(
  p_buyer uuid, p_project uuid, p_unit_code text, p_typology uuid, p_price numeric,
  p_installments integer default 24, p_initial_date date default current_date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_area numeric; i integer;
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede registrar ventas' using errcode = '42501'; end if;
  if not exists (select 1 from public.projects where id = p_project and stage = 'activo') then raise exception 'El proyecto debe estar activo'; end if;
  if p_installments < 1 or p_installments > 60 then raise exception 'Cuotas entre 1 y 60'; end if;
  select area into v_area from public.project_typologies where id = p_typology;
  insert into public.purchases (buyer_id, project_id, typology_id, unit_code, area, price, plan)
  values (p_buyer, p_project, p_typology, p_unit_code, v_area, p_price, '10 % cuota inicial · 20 % en ' || p_installments || ' cuotas · 70 % crédito hipotecario')
  returning id into v_id;
  insert into public.payments (purchase_id, n, due_on, amount) values (v_id, 0, p_initial_date, round(p_price * 0.10, 2));
  for i in 1 .. p_installments loop
    insert into public.payments (purchase_id, n, due_on, amount)
    values (v_id, i, (p_initial_date + make_interval(months => i))::date, round(p_price * 0.20 / p_installments, 2));
  end loop;
  perform public.log_audit('Registró la venta de ' || p_unit_code, 'key-round', p_project);
  return v_id;
end $$;

create or replace function public.mark_payment_paid(p_payment uuid, p_paid_on date default current_date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede confirmar pagos' using errcode = '42501'; end if;
  update public.payments set paid_on = p_paid_on where id = p_payment and paid_on is null;
  if not found then raise exception 'Pago no encontrado o ya confirmado'; end if;
end $$;

-- Guarda/lee el borrador del asistente del usuario autenticado
create or replace function public.save_project_draft(p_data jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.project_drafts (user_id, data) values (auth.uid(), p_data)
  on conflict (user_id) do update set data = excluded.data
$$;
