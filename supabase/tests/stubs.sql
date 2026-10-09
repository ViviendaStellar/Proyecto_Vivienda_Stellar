-- Simulación mínima de lo que aporta Supabase (roles, auth, storage) para probar sin Docker.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant anon, authenticated, service_role to postgres;
  create schema auth; create schema extensions; create schema storage;
  grant usage on schema auth, extensions, storage to anon, authenticated, service_role;
  create table auth.users (id uuid primary key default gen_random_uuid(), instance_id uuid, aud text, role text, email text unique,
    encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
    confirmation_token text, email_change text, email_change_token_new text, recovery_token text);
  create table auth.identities (id uuid primary key, user_id uuid references auth.users(id) on delete cascade, provider_id text, identity_data jsonb, provider text,
    last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
  alter table storage.objects enable row level security;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  create function storage.foldername(name text) returns text[] language plpgsql as $$
    declare _parts text[]; begin select string_to_array(name, '/') into _parts; return _parts[1:array_length(_parts, 1) - 1]; end $$;
  create extension pgcrypto with schema extensions;
