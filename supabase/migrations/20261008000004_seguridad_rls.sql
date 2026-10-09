-- INN-LOCK · Migración 4: seguridad (RLS, privilegios y políticas)
-- Principios: (1) nadie escribe estados/desembolsos directamente; todo pasa por funciones RPC que validan el rol;
-- (2) cada rol ve solo lo que le corresponde; (3) sin acceso para el rol anónimo.

-- ============================================================
-- Privilegios base
-- ============================================================
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant usage on schema public to authenticated;

-- Lectura (filtrada por RLS)
grant select on
  public.companies, public.interventors, public.profiles, public.phases, public.document_types,
  public.company_documents, public.document_submissions,
  public.projects, public.project_typologies, public.project_amenities, public.project_plans,
  public.milestones, public.milestone_events, public.milestone_evidence,
  public.schedule_change_requests, public.schedule_change_items, public.project_reviews, public.project_drafts,
  public.disbursements, public.purchases, public.payments, public.escrow_ledger, public.onchain_records,
  public.audit_log, public.notifications,
  public.v_company_documents, public.v_milestones, public.v_project_funds, public.v_purchases
to authenticated;

-- Escrituras directas permitidas (todo lo demás va por RPC)
grant update (full_name, title, phone) on public.profiles to authenticated;
grant insert, update, delete on public.project_drafts to authenticated;
grant insert, delete on public.milestone_evidence to authenticated;
grant delete on public.projects to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Funciones que las políticas evalúan con el rol del usuario
grant execute on function
  public.auth_role(), public.auth_company_id(), public.auth_interventor_id(), public.is_admin(),
  public.is_project_member(uuid), public.is_project_buyer(uuid), public.can_view_project(uuid),
  public.has_pending_submission(uuid), public.effective_doc_status(date, public.doc_status, boolean),
  public.company_compliance(uuid), public.company_blocked(uuid), public.validate_schedule(uuid)
to authenticated;

-- RPC del flujo de negocio
grant execute on function
  public.save_project(uuid, jsonb, boolean),
  public.review_project(uuid, boolean, text),
  public.activate_project(uuid, boolean, text),
  public.submit_milestone(uuid, text, numeric),
  public.review_milestone(uuid, boolean, text, jsonb),
  public.request_schedule_change(uuid, text, jsonb),
  public.resolve_schedule_change(uuid, boolean, text),
  public.submit_document(text, text, text, date, date, text, bigint, uuid),
  public.review_document_submission(uuid, boolean, text),
  public.admin_set_role(uuid, public.user_role, uuid, uuid),
  public.create_purchase(uuid, uuid, text, uuid, numeric, integer, date),
  public.mark_payment_paid(uuid, date),
  public.save_project_draft(jsonb)
to authenticated;

-- ============================================================
-- Funciones de apoyo a las políticas
-- ============================================================
create or replace function public.can_view_company(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or cid = public.auth_company_id()
      or exists (
        select 1 from public.projects p
        where p.company_id = cid and (p.stage in ('activo', 'finalizado') or public.is_project_member(p.id))
      )
$$;
grant execute on function public.can_view_company(uuid) to authenticated;

create or replace function public.safe_uuid(p text) returns uuid
language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;
grant execute on function public.safe_uuid(text) to authenticated;

-- ============================================================
-- Activar RLS
-- ============================================================
alter table public.companies               enable row level security;
alter table public.interventors            enable row level security;
alter table public.profiles                enable row level security;
alter table public.phases                  enable row level security;
alter table public.document_types          enable row level security;
alter table public.company_documents       enable row level security;
alter table public.document_submissions    enable row level security;
alter table public.projects                enable row level security;
alter table public.project_typologies      enable row level security;
alter table public.project_amenities       enable row level security;
alter table public.project_plans           enable row level security;
alter table public.milestones              enable row level security;
alter table public.milestone_events        enable row level security;
alter table public.milestone_evidence      enable row level security;
alter table public.schedule_change_requests enable row level security;
alter table public.schedule_change_items   enable row level security;
alter table public.project_reviews         enable row level security;
alter table public.project_drafts          enable row level security;
alter table public.disbursements           enable row level security;
alter table public.purchases               enable row level security;
alter table public.payments                enable row level security;
alter table public.escrow_ledger           enable row level security;
alter table public.onchain_records         enable row level security;
alter table public.audit_log               enable row level security;
alter table public.notifications           enable row level security;

-- ============================================================
-- Políticas
-- ============================================================
-- Catálogos y organizaciones: lectura para cualquier usuario autenticado
create policy phases_read on public.phases for select to authenticated using (true);
create policy doctypes_read on public.document_types for select to authenticated using (true);
create policy companies_read on public.companies for select to authenticated using (true);
create policy interventors_read on public.interventors for select to authenticated using (true);

-- Perfiles: cada quien el suyo; el administrador todos
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Documentos legales
create policy company_docs_select on public.company_documents for select to authenticated using (public.can_view_company(company_id));
create policy doc_submissions_select on public.document_submissions for select to authenticated
  using (public.is_admin() or exists (select 1 from public.company_documents d where d.id = document_id and d.company_id = public.auth_company_id()));

-- Proyectos y datos descriptivos
create policy projects_select on public.projects for select to authenticated using (public.can_view_project(id));
create policy projects_delete_draft on public.projects for delete to authenticated
  using (stage = 'borrador' and company_id = public.auth_company_id() and public.auth_role() = 'constructora');
create policy typologies_select on public.project_typologies for select to authenticated using (public.can_view_project(project_id));
create policy amenities_select on public.project_amenities for select to authenticated using (public.can_view_project(project_id));
create policy plans_select on public.project_plans for select to authenticated using (public.can_view_project(project_id));

-- Cronograma, historial y evidencias
create policy milestones_select on public.milestones for select to authenticated using (public.can_view_project(project_id));
create policy milestone_events_select on public.milestone_events for select to authenticated
  using (exists (select 1 from public.milestones m where m.id = milestone_id and public.can_view_project(m.project_id)));
create policy evidence_select on public.milestone_evidence for select to authenticated
  using (exists (select 1 from public.milestones m where m.id = milestone_id and (public.is_project_member(m.project_id) or public.is_project_buyer(m.project_id))));
create policy evidence_insert on public.milestone_evidence for insert to authenticated
  with check (
    uploaded_by = auth.uid() and public.auth_role() = 'constructora'
    and exists (select 1 from public.milestones m join public.projects p on p.id = m.project_id
                where m.id = milestone_id and p.company_id = public.auth_company_id()
                  and p.stage = 'activo' and m.status in ('en_curso', 'observado'))
    -- la ruta del archivo debe pertenecer a este hito: {project_id}/{milestone_id}/...
    and exists (select 1 from public.milestones m where m.id = milestone_id and storage_path like m.project_id::text || '/' || m.id::text || '/%')
  );
create policy evidence_delete on public.milestone_evidence for delete to authenticated
  using (
    public.auth_role() = 'constructora'
    and exists (select 1 from public.milestones m join public.projects p on p.id = m.project_id
                where m.id = milestone_id and p.company_id = public.auth_company_id() and m.status in ('en_curso', 'observado'))
  );

-- Cambios de cronograma y revisiones del registro
create policy changes_select on public.schedule_change_requests for select to authenticated using (public.is_project_member(project_id));
create policy change_items_select on public.schedule_change_items for select to authenticated
  using (exists (select 1 from public.schedule_change_requests r where r.id = request_id and public.is_project_member(r.project_id)));
create policy reviews_select on public.project_reviews for select to authenticated using (public.is_project_member(project_id));

-- Borradores propios
create policy drafts_all on public.project_drafts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fondos y trazabilidad
create policy disbursements_select on public.disbursements for select to authenticated
  using (public.is_project_member(project_id) or public.is_project_buyer(project_id));
create policy ledger_select on public.escrow_ledger for select to authenticated
  using (
    public.is_project_member(project_id)
    or exists (select 1 from public.purchases pu where pu.id = purchase_id and pu.buyer_id = auth.uid())
  );
create policy onchain_select on public.onchain_records for select to authenticated
  using (public.is_project_member(project_id) or public.is_project_buyer(project_id));

-- Compras y pagos
create policy purchases_select on public.purchases for select to authenticated using (buyer_id = auth.uid() or public.is_admin());
create policy payments_select on public.payments for select to authenticated
  using (exists (select 1 from public.purchases pu where pu.id = purchase_id and (pu.buyer_id = auth.uid() or public.is_admin())));

-- Auditoría y notificaciones
create policy audit_select on public.audit_log for select to authenticated
  using (public.is_admin() or actor_id = auth.uid() or (project_id is not null and public.is_project_member(project_id)));
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Tiempo real (solo si existe la publicación de Supabase)
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.milestones, public.notifications, public.project_reviews, public.schedule_change_requests;
  end if;
end $$;
