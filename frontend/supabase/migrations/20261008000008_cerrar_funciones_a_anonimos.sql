-- INN-LOCK · Migración 8: ninguna función de la base es ejecutable por el rol anónimo
-- Supabase concede EXECUTE por defecto a anon/authenticated sobre las funciones nuevas del esquema public.
-- La migración 4 lo revocó para las funciones existentes en ese momento; esta cierra también las posteriores
-- y evita que ocurra con las futuras.

revoke execute on all functions in schema public from public, anon;

-- Privilegios por defecto para objetos futuros (cada bloque tolera que el rol no exista o no se pueda modificar)
do $$
declare r text;
begin
  foreach r in array array['postgres', 'supabase_admin'] loop
    begin
      execute format('alter default privileges for role %I in schema public revoke execute on functions from public, anon', r);
      execute format('alter default privileges for role %I in schema public revoke all on tables from anon', r);
      execute format('alter default privileges for role %I in schema public revoke all on sequences from anon', r);
    exception when others then
      null;  -- p. ej. el rol no existe o no tenemos permiso para cambiar sus privilegios por defecto
    end;
  end loop;
end $$;

-- El rol «authenticated» conserva solo lo concedido explícitamente en las migraciones 4, 5 y 7.
