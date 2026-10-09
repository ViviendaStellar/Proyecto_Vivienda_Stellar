-- INN-LOCK · Migración 2: proyectos, cronograma por hitos, evidencias, fondos y trazabilidad

-- ============================================================
-- Proyectos
-- ============================================================
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  tagline          text,
  description      text,
  city             text,
  zone             text,
  address          text,
  lat              numeric(9,6),
  lng              numeric(9,6),
  company_id       uuid not null references public.companies (id),
  interventor_id   uuid references public.interventors (id),
  stage            public.project_stage not null default 'borrador',
  towers           smallint check (towers >= 1),
  floors           smallint check (floors >= 1),
  units            integer check (units >= 1),
  units_sold       integer not null default 0 check (units_sold >= 0),
  parking          integer check (parking >= 0),
  strata           smallint check (strata between 1 and 6),
  price_from       numeric(18,2) check (price_from >= 0),
  area_min         numeric(8,2),
  area_max         numeric(8,2),
  budget           numeric(18,2) check (budget > 0),
  start_date       date,
  months           smallint check (months between 6 and 60),
  end_date         date generated always as ((start_date + make_interval(months => months))::date) stored,
  current_month    smallint not null default 1 check (current_month >= 1),
  photo_path       text,
  lic_number       text,
  lic_issuer       text,
  lic_expires      date,
  fiducia_issuer   text,
  fiducia_number   text,
  schedule_locked  boolean not null default false,
  submitted_at     timestamptz,
  activated_at     timestamptz,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint projects_units_sold check (units is null or units_sold <= units),
  constraint projects_required_after_draft check (
    stage = 'borrador'
    or (budget is not null and start_date is not null and months is not null
        and city is not null and address is not null and interventor_id is not null)
  )
);
create index projects_company_idx on public.projects (company_id);
create index projects_interventor_idx on public.projects (interventor_id);
create index projects_stage_idx on public.projects (stage);
create trigger trg_projects_updated before update on public.projects for each row execute function public.set_updated_at();
comment on table public.projects is 'Proyectos inmobiliarios. El estado (stage) solo cambia mediante funciones del flujo de aprobación.';
comment on column public.projects.schedule_locked is 'Verdadero al activar el proyecto: el cronograma solo cambia con una solicitud aprobada por el interventor.';

create table public.project_typologies (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name       text not null,
  area       numeric(8,2) not null check (area > 0),
  beds       smallint not null default 0 check (beds >= 0),
  baths      smallint not null default 0 check (baths >= 0),
  parking    smallint not null default 0 check (parking >= 0),
  price      numeric(18,2) not null check (price > 0)
);
create index project_typologies_project_idx on public.project_typologies (project_id);

create table public.project_amenities (
  project_id uuid not null references public.projects (id) on delete cascade,
  amenity    text not null,
  primary key (project_id, amenity)
);

create table public.project_plans (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind       text not null check (kind in ('arq', 'est', 'hid', 'ele')),
  name       text not null,
  sheets     integer not null default 0 check (sheets >= 0),
  version    text not null default '1.0',
  file_path  text,
  file_size  bigint,
  created_at timestamptz not null default now(),
  unique (project_id, kind)
);
comment on column public.project_plans.kind is 'arq=arquitectónicos, est=estructurales, hid=hidrosanitarios, ele=eléctricos y de datos.';

-- ============================================================
-- Cronograma: un hito por mes de obra
-- ============================================================
create table public.milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  n            smallint not null check (n >= 1),
  month_date   date not null,
  phase_key    text not null references public.phases (key),
  tranche_pct  numeric(7,4) not null check (tranche_pct > 0 and tranche_pct <= 100),
  planned_cum  numeric(7,4) not null default 0 check (planned_cum between 0 and 100),
  actual_cum   numeric(7,4) check (actual_cum between 0 and 100),
  status       public.milestone_status not null default 'pendiente',
  activities   text[] not null default '{}',
  report       boolean not null default false,
  changed      boolean not null default false,
  released_on  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, n)
);
create index milestones_project_status_idx on public.milestones (project_id, status);
create trigger trg_milestones_updated before update on public.milestones for each row execute function public.set_updated_at();
comment on table public.milestones is 'Hito mensual de obra. tranche_pct es el % del presupuesto que se desembolsa al aprobarse.';

create table public.milestone_events (
  id           bigint generated always as identity primary key,
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  kind         text not null check (kind in ('enviado', 'observado', 'subsanado', 'aprobado')),
  by_user      uuid references public.profiles (id) on delete set null,
  by_name      text,
  by_role      public.user_role,
  text         text,
  created_at   timestamptz not null default now()
);
create index milestone_events_ms_idx on public.milestone_events (milestone_id, created_at);

create table public.milestone_evidence (
  id           uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  kind         public.evidence_kind not null,
  name         text not null,
  storage_path text not null,
  size_bytes   bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index milestone_evidence_ms_idx on public.milestone_evidence (milestone_id, kind);

-- ============================================================
-- Solicitudes de cambio del cronograma (proyecto activo)
-- ============================================================
create table public.schedule_change_requests (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  requested_by uuid references public.profiles (id) on delete set null,
  reason       text not null check (char_length(reason) >= 20),
  status       public.change_status not null default 'pendiente',
  resolved_by  uuid references public.profiles (id) on delete set null,
  resolved_at  timestamptz,
  note         text,
  created_at   timestamptz not null default now()
);
create unique index one_pending_change_per_project on public.schedule_change_requests (project_id) where status = 'pendiente';

create table public.schedule_change_items (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.schedule_change_requests (id) on delete cascade,
  milestone_n smallint not null,
  from_pct    numeric(7,4) not null,
  to_pct      numeric(7,4) not null check (to_pct > 0),
  unique (request_id, milestone_n)
);

-- ============================================================
-- Historial del registro del proyecto (envío → interventor → administrador)
-- ============================================================
create table public.project_reviews (
  id         bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind       text not null check (kind in ('enviado', 'reenviado', 'aprobado por interventor', 'observado', 'activado')),
  by_user    uuid references public.profiles (id) on delete set null,
  by_name    text,
  by_role    public.user_role,
  text       text,
  created_at timestamptz not null default now()
);
create index project_reviews_project_idx on public.project_reviews (project_id, created_at);

-- Borradores del asistente de registro (privados del usuario)
create table public.project_drafts (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger trg_project_drafts_updated before update on public.project_drafts for each row execute function public.set_updated_at();

-- ============================================================
-- Fondos, desembolsos y trazabilidad on-chain
-- ============================================================
create table public.disbursements (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  milestone_id uuid not null unique references public.milestones (id) on delete restrict,
  amount       numeric(18,2) not null check (amount > 0),
  released_on  date not null default current_date,
  approved_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index disbursements_project_idx on public.disbursements (project_id);

create table public.purchases (
  id                 uuid primary key default gen_random_uuid(),
  buyer_id           uuid not null references public.profiles (id) on delete restrict,
  project_id         uuid not null references public.projects (id) on delete restrict,
  typology_id        uuid references public.project_typologies (id) on delete set null,
  unit_code          text not null,
  area               numeric(8,2) check (area > 0),
  price              numeric(18,2) not null check (price > 0),
  plan               text,
  created_at         timestamptz not null default now(),
  unique (project_id, unit_code)
);
create index purchases_buyer_idx on public.purchases (buyer_id);
create index purchases_project_idx on public.purchases (project_id);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  n           smallint not null check (n >= 0),
  due_on      date not null,
  amount      numeric(18,2) not null check (amount > 0),
  paid_on     date,
  created_at  timestamptz not null default now(),
  unique (purchase_id, n)
);
comment on column public.payments.n is '0 = cuota inicial; 1..N = cuotas mensuales durante la obra.';

create table public.escrow_ledger (
  id           bigint generated always as identity primary key,
  project_id   uuid not null references public.projects (id) on delete cascade,
  kind         public.escrow_kind not null,
  amount       numeric(18,2) not null,
  purchase_id  uuid references public.purchases (id) on delete set null,
  payment_id   uuid references public.payments (id) on delete set null,
  milestone_id uuid references public.milestones (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now(),
  constraint escrow_sign check (
    (kind = 'aporte_comprador' and amount > 0) or (kind = 'desembolso' and amount < 0) or kind = 'ajuste'
  )
);
create index escrow_ledger_project_idx on public.escrow_ledger (project_id, created_at);
comment on table public.escrow_ledger is 'Libro de movimientos del patrimonio autónomo (aportes de compradores y desembolsos).';

create table public.onchain_records (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  kind         public.onchain_kind not null,
  milestone_id uuid references public.milestones (id) on delete set null,
  document_id  uuid references public.company_documents (id) on delete set null,
  network      text not null default 'stellar-testnet',
  contract_id  text,
  tx_hash      text,
  ledger       bigint,
  payload      jsonb not null default '{}'::jsonb,
  status       public.onchain_status not null default 'simulado',
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz
);
create index onchain_records_project_idx on public.onchain_records (project_id, created_at);
comment on table public.onchain_records is 'Registros a anclar en Stellar/Soroban. Mientras no exista la integración, status=simulado.';

-- ============================================================
-- Auditoría y notificaciones
-- ============================================================
create table public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid references public.profiles (id) on delete set null,
  actor_name text,
  actor_role public.user_role,
  project_id uuid references public.projects (id) on delete set null,
  action     text not null,
  icon       text,
  payload    jsonb not null default '{}'::jsonb
);
create index audit_log_project_idx on public.audit_log (project_id, at desc);
create index audit_log_at_idx on public.audit_log (at desc);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  link       text,
  project_id uuid references public.projects (id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);
