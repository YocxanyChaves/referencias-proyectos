-- Requiere db/migrations/006_administracion.sql.

alter function public.impedir_sin_admin() set search_path = public;
revoke execute on function public.impedir_sin_admin() from public, anon, authenticated;

-- 1. Desde el navegador, el admin solo cambia nombre, rol, país y estado.
--    El correo lo maneja Auth, y los usuarios se crean solo por invitación
--    (Edge Function invitar-usuario). No se borran: se desactivan, para conservar la bitácora.
revoke insert, update, delete on public.usuarios from anon, authenticated;
grant update (nombre, rol, pais_id, activo) on public.usuarios to authenticated;

-- 2. Un admin no puede quitarse su propio rol ni desactivarse (evita quedarse fuera por error).
create or replace function privado.proteger_usuario_propio() returns trigger
language plpgsql set search_path = public, privado as $$
begin
  if new.id = auth.uid() and (new.rol <> old.rol or new.activo <> old.activo) then
    raise exception 'No puedes cambiar tu propio rol ni desactivarte. Pídeselo a otro administrador.'
      using errcode = '22023';
  end if;
  return new;
end $$;

revoke all on function privado.proteger_usuario_propio() from public, anon, authenticated;

-- Los triggers corren en orden alfabético: este va antes que trg_usuarios_minimo_admin
-- para que, al intentar desactivarse, el mensaje sea este y no el de "último administrador".
drop trigger if exists trg_usuarios_cambio_propio on public.usuarios;
create trigger trg_usuarios_cambio_propio
  before update on public.usuarios
  for each row execute function privado.proteger_usuario_propio();

-- 3. Listado de usuarios para el admin, con datos de Auth que la tabla no tiene:
--    último acceso y si la invitación sigue pendiente (aún no abrió el enlace).
create or replace function public.listar_usuarios()
returns table (
  id uuid, email text, nombre text, rol rol_usuario, pais_id int, activo boolean,
  creado_en timestamptz, ultimo_acceso timestamptz, invitacion_pendiente boolean
)
language plpgsql stable security definer set search_path = public, privado as $$
begin
  if privado.mi_rol() is distinct from 'admin' then
    raise exception 'Solo un administrador puede ver los usuarios.' using errcode = '42501';
  end if;
  return query
    select u.id, u.email, u.nombre, u.rol, u.pais_id, u.activo, u.creado_en,
           a.last_sign_in_at, a.email_confirmed_at is null
    from usuarios u
    join auth.users a on a.id = u.id
    order by u.nombre;
end $$;

revoke execute on function public.listar_usuarios() from public, anon;
grant execute on function public.listar_usuarios() to authenticated;
