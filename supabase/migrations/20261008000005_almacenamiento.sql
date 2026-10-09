-- INN-LOCK · Migración 5: buckets y políticas de Supabase Storage
-- Convención de rutas:
--   project-photos     → {company_id}/{archivo}                      (público)
--   project-plans      → {company_id}/{project_id|borrador}/{archivo}
--   company-documents  → {company_id}/{archivo}
--   milestone-evidence → {project_id}/{milestone_id}/{archivo}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('project-photos',     'project-photos',     true,  5242880,   array['image/jpeg', 'image/png', 'image/webp']),
  ('project-plans',      'project-plans',      false, 52428800,  array['application/pdf', 'application/zip', 'image/vnd.dwg', 'application/acad']),
  ('company-documents',  'company-documents',  false, 20971520,  array['application/pdf', 'image/jpeg', 'image/png']),
  ('milestone-evidence', 'milestone-evidence', false, 209715200, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ¿Puede el usuario ver los archivos de esta constructora? (admin, la propia constructora o su interventor asignado)
create or replace function public.can_view_company_files(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or cid = public.auth_company_id()
      or exists (select 1 from public.projects p where p.company_id = cid and p.stage <> 'borrador' and public.is_project_member(p.id))
$$;
create or replace function public.can_write_company_files(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.auth_role() = 'constructora' and cid = public.auth_company_id())
$$;
create or replace function public.can_upload_evidence(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.auth_role() = 'constructora'
     and exists (select 1 from public.projects p where p.id = pid and p.company_id = public.auth_company_id())
$$;
grant execute on function public.can_view_company_files(uuid), public.can_write_company_files(uuid), public.can_upload_evidence(uuid) to authenticated;

-- Fotos públicas del proyecto
create policy "fotos: lectura pública" on storage.objects for select to anon, authenticated using (bucket_id = 'project-photos');
create policy "fotos: escritura de la constructora" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-photos' and public.can_write_company_files(public.safe_uuid((storage.foldername(name))[1])));
create policy "fotos: edición de la constructora" on storage.objects for update to authenticated
  using (bucket_id = 'project-photos' and public.can_write_company_files(public.safe_uuid((storage.foldername(name))[1])));
create policy "fotos: borrado de la constructora" on storage.objects for delete to authenticated
  using (bucket_id = 'project-photos' and public.can_write_company_files(public.safe_uuid((storage.foldername(name))[1])));

-- Planos y documentos legales (privados)
create policy "privados: lectura" on storage.objects for select to authenticated
  using (bucket_id in ('project-plans', 'company-documents') and public.can_view_company_files(public.safe_uuid((storage.foldername(name))[1])));
create policy "privados: escritura" on storage.objects for insert to authenticated
  with check (bucket_id in ('project-plans', 'company-documents') and public.can_write_company_files(public.safe_uuid((storage.foldername(name))[1])));
create policy "privados: edición" on storage.objects for update to authenticated
  using (bucket_id in ('project-plans', 'company-documents') and public.can_write_company_files(public.safe_uuid((storage.foldername(name))[1])));
create policy "privados: borrado" on storage.objects for delete to authenticated
  using (bucket_id in ('project-plans', 'company-documents') and public.can_write_company_files(public.safe_uuid((storage.foldername(name))[1])));

-- Evidencias de obra
create policy "evidencias: lectura" on storage.objects for select to authenticated
  using (bucket_id = 'milestone-evidence' and (
    public.is_project_member(public.safe_uuid((storage.foldername(name))[1]))
    or public.is_project_buyer(public.safe_uuid((storage.foldername(name))[1]))));
create policy "evidencias: escritura" on storage.objects for insert to authenticated
  with check (bucket_id = 'milestone-evidence' and public.can_upload_evidence(public.safe_uuid((storage.foldername(name))[1])));
create policy "evidencias: borrado" on storage.objects for delete to authenticated
  using (bucket_id = 'milestone-evidence' and public.can_upload_evidence(public.safe_uuid((storage.foldername(name))[1])));
