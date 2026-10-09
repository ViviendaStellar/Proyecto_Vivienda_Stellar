-- INN-LOCK · Migración 7: correo en perfiles y gestión de constructoras / interventores / usuarios (solo administrador)

-- ============================================================
-- Correo del usuario en su perfil (para que el administrador pueda identificarlo)
-- ============================================================
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
create index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- El rol SIEMPRE nace como comprador; solo un administrador puede elevarlo (admin_set_role).
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

create or replace function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return null;
end $$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function public.sync_profile_email();

-- ============================================================
-- Gestión de organizaciones (administrador)
-- ============================================================
create or replace function public.admin_upsert_company(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede gestionar constructoras' using errcode = '42501'; end if;
  if coalesce(trim(p ->> 'name'), '') = '' or coalesce(trim(p ->> 'nit'), '') = '' then raise exception 'Nombre y NIT son obligatorios'; end if;
  if p_id is null then
    insert into public.companies (name, short_name, nit, legal_rep, rep_role, city, founded_year, email, phone, about)
    values (trim(p ->> 'name'), coalesce(nullif(trim(p ->> 'short_name'), ''), trim(p ->> 'name')), trim(p ->> 'nit'),
            nullif(trim(p ->> 'legal_rep'), ''), coalesce(nullif(trim(p ->> 'rep_role'), ''), 'Representante legal'), nullif(trim(p ->> 'city'), ''),
            nullif(p ->> 'founded_year', '')::smallint, nullif(trim(p ->> 'email'), ''), nullif(trim(p ->> 'phone'), ''), nullif(trim(p ->> 'about'), ''))
    returning id into v_id;
    perform public.log_audit('Registró la constructora «' || trim(p ->> 'name') || '»', 'building', null, jsonb_build_object('company', v_id));
  else
    update public.companies set
      name = trim(p ->> 'name'), short_name = coalesce(nullif(trim(p ->> 'short_name'), ''), trim(p ->> 'name')), nit = trim(p ->> 'nit'),
      legal_rep = nullif(trim(p ->> 'legal_rep'), ''), rep_role = coalesce(nullif(trim(p ->> 'rep_role'), ''), rep_role), city = nullif(trim(p ->> 'city'), ''),
      founded_year = nullif(p ->> 'founded_year', '')::smallint, email = nullif(trim(p ->> 'email'), ''), phone = nullif(trim(p ->> 'phone'), ''), about = nullif(trim(p ->> 'about'), '')
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Constructora no encontrada'; end if;
    perform public.log_audit('Actualizó la constructora «' || trim(p ->> 'name') || '»', 'building', null, jsonb_build_object('company', v_id));
  end if;
  return v_id;
end $$;

create or replace function public.admin_upsert_interventor(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede gestionar interventores' using errcode = '42501'; end if;
  if coalesce(trim(p ->> 'name'), '') = '' or coalesce(trim(p ->> 'firm'), '') = '' then raise exception 'Nombre y firma son obligatorios'; end if;
  if p_id is null then
    insert into public.interventors (name, firm, license, email)
    values (trim(p ->> 'name'), trim(p ->> 'firm'), nullif(trim(p ->> 'license'), ''), nullif(trim(p ->> 'email'), '')) returning id into v_id;
    perform public.log_audit('Registró al interventor «' || trim(p ->> 'name') || '»', 'clipboard-check', null, jsonb_build_object('interventor', v_id));
  else
    update public.interventors set name = trim(p ->> 'name'), firm = trim(p ->> 'firm'), license = nullif(trim(p ->> 'license'), ''), email = nullif(trim(p ->> 'email'), '')
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Interventor no encontrado'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.admin_set_active(p_user uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede activar o desactivar usuarios' using errcode = '42501'; end if;
  if p_user = auth.uid() and not p_active then raise exception 'No puedes desactivarte a ti mismo'; end if;
  perform public._bypass();
  update public.profiles set active = p_active where id = p_user;
  if not found then raise exception 'Usuario no encontrado'; end if;
  perform public.log_audit(case when p_active then 'Activó' else 'Desactivó' end || ' a un usuario', 'user-cog', null, jsonb_build_object('user', p_user));
end $$;

grant execute on function
  public.admin_upsert_company(uuid, jsonb),
  public.admin_upsert_interventor(uuid, jsonb),
  public.admin_set_active(uuid, boolean)
to authenticated;
grant select (email) on public.profiles to authenticated;
