-- Administración de usuarios y bitácora.

-- Un editor trabaja sobre los proyectos de su país: sin país no podría hacer nada.
-- "not valid" para no fallar si ya hay filas antiguas que no cumplen; aplica a todo cambio nuevo.
alter table usuarios
  add constraint editor_con_pais check (rol <> 'editor' or pais_id is not null) not valid;

-- Siempre debe quedar al menos un administrador activo.
create or replace function impedir_sin_admin() returns trigger
language plpgsql as $$
begin
  if old.rol = 'admin' and old.activo
     and (tg_op = 'DELETE' or new.rol <> 'admin' or not new.activo)
     and not exists (select 1 from usuarios where rol = 'admin' and activo and id <> old.id) then
    raise exception 'Debe quedar al menos un administrador activo.' using errcode = '23514';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_usuarios_minimo_admin on usuarios;
create trigger trg_usuarios_minimo_admin
  before update or delete on usuarios
  for each row execute function impedir_sin_admin();

-- La bitácora se consulta de la más reciente a la más antigua.
create index if not exists idx_descargas_fecha on descargas (fecha desc);
