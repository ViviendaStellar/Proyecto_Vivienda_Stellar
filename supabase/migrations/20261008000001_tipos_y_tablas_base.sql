-- INN-LOCK · Migración 1: tipos, perfiles, constructoras, interventores y catálogos
-- Plataforma de custodia de fondos para vivienda sobre planos (Stellar/Soroban en una fase posterior).

create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- Tipos
-- ============================================================
create type public.user_role as enum ('admin', 'comprador', 'constructora', 'interventor');
create type public.project_stage as enum ('borrador', 'interventor', 'admin', 'observado', 'activo', 'finalizado');
create type public.milestone_status as enum ('pendiente', 'en_curso', 'revision', 'observado', 'desembolsado');
create type public.doc_status as enum ('vigente', 'por_vencer', 'vencido', 'revision', 'faltante');
create type public.change_status as enum ('pendiente', 'aprobada', 'rechazada');
create type public.evidence_kind as enum ('imagen', 'video', 'pdf');
create type public.submission_status as enum ('pendiente', 'validado', 'rechazado');
create type public.escrow_kind as enum ('aporte_comprador', 'desembolso', 'ajuste');
create type public.onchain_kind as enum ('desembolso', 'ancla_documento', 'ancla_cronograma', 'ancla_evidencia');
create type public.onchain_status as enum ('simulado', 'pendiente', 'confirmada', 'fallida');

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- Organizaciones
-- ============================================================
create table public.companies (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  short_name         text not null,
  nit                text not null unique,
  legal_rep          text,
  rep_role           text,
  city               text,
  founded_year       smallint check (founded_year between 1900 and 2100),
  email              text,
  phone              text,
  about              text,
  rating             numeric(2,1) check (rating between 0 and 5),
  delivered_projects integer not null default 0 check (delivered_projects >= 0),
  built_units        integer not null default 0 check (built_units >= 0),
  built_sqm          numeric(12,0) not null default 0 check (built_sqm >= 0),
  color_a            text not null default '#1450C8',
  color_b            text not null default '#12A8F0',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.companies is 'Constructoras registradas en la plataforma.';
create trigger trg_companies_updated before update on public.companies for each row execute function public.set_updated_at();

create table public.interventors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  firm       text not null,
  license    text,
  email      text,
  created_at timestamptz not null default now()
);
comment on table public.interventors is 'Interventores (personas/firmas) que auditan la obra y autorizan desembolsos.';

-- ============================================================
-- Perfiles (1 a 1 con auth.users)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.user_role not null default 'comprador',
  full_name     text not null default '',
  title         text,
  phone         text,
  company_id    uuid references public.companies (id) on delete set null,
  interventor_id uuid references public.interventors (id) on delete set null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_company_idx on public.profiles (company_id);
create index profiles_interventor_idx on public.profiles (interventor_id);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
comment on column public.profiles.role is 'Solo el administrador puede cambiarlo (ver admin_set_role y el trigger guard_profile_update).';

-- ============================================================
-- Catálogos
-- ============================================================
create table public.phases (
  key     text primary key,
  name    text not null,
  ref_pct numeric(5,2) not null check (ref_pct > 0),
  sort    smallint not null unique,
  icon    text
);
comment on table public.phases is 'Fases de obra en orden. El cronograma debe avanzar en este orden.';

create table public.document_types (
  key        text primary key,
  title      text not null,
  subtitle   text,
  scope      text not null check (scope in ('company', 'project')),
  required   boolean not null default false,
  has_expiry boolean not null default false,
  sort       smallint not null default 0
);
comment on table public.document_types is 'Documentos legales exigidos. Los de ámbito company se gestionan en company_documents.';

-- ============================================================
-- Documentos legales de la constructora
-- ============================================================
create table public.company_documents (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  type_key        text not null references public.document_types (key),
  number          text,
  issuer          text,
  issued_on       date,
  expires_on      date,
  status_override public.doc_status check (status_override in ('faltante')),
  file_path       text,
  file_size       bigint check (file_size is null or file_size >= 0),
  pages           integer,
  insured_amount  numeric(18,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (company_id, type_key)
);
create trigger trg_company_documents_updated before update on public.company_documents for each row execute function public.set_updated_at();

create table public.document_submissions (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.company_documents (id) on delete cascade,
  number      text,
  issuer      text,
  issued_on   date,
  expires_on  date,
  file_path   text,
  file_size   bigint,
  submitted_by uuid references public.profiles (id) on delete set null,
  status      public.submission_status not null default 'pendiente',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  note        text,
  created_at  timestamptz not null default now()
);
create index document_submissions_doc_idx on public.document_submissions (document_id, status);
comment on table public.document_submissions is 'Nuevas versiones de documentos pendientes de validación del administrador.';
