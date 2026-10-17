-- Requiere db/migrations/003_crear_proyecto.sql.

-- 1. La autoría la pone el servidor, no el navegador.
--    creado_por / subido_por = usuario de la sesión; las fechas de creación, now().
--    Al actualizar se conservan los valores originales.
--    Sin sesión (consultas de mantenimiento con service_role) se respeta lo enviado.
create or replace function privado.fijar_autoria_proyecto() returns trigger
language plpgsql set search_path = public, privado as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := coalesce(auth.uid(), new.creado_por);
    new.creado_en  := now();
  else
    new.creado_por := old.creado_por;
    new.creado_en  := old.creado_en;
  end if;
  return new;
end $$;

create or replace function privado.fijar_autoria_evidencia() returns trigger
language plpgsql set search_path = public, privado as $$
begin
  if tg_op = 'INSERT' then
    new.subido_por := coalesce(auth.uid(), new.subido_por);
    new.subido_en  := now();
  else
    new.subido_por := old.subido_por;
    new.subido_en  := old.subido_en;
  end if;
  return new;
end $$;

revoke all on function privado.fijar_autoria_proyecto(), privado.fijar_autoria_evidencia() from public, anon, authenticated;

drop trigger if exists trg_proyectos_autoria on public.proyectos;
create trigger trg_proyectos_autoria
  before insert or update on public.proyectos
  for each row execute function privado.fijar_autoria_proyecto();

drop trigger if exists trg_evidencias_autoria on public.evidencias;
create trigger trg_evidencias_autoria
  before insert or update on public.evidencias
  for each row execute function privado.fijar_autoria_evidencia();

-- 2. crear_proyecto: se ejecuta con los permisos de quien llama (las políticas RLS
--    deciden si un editor puede crear en ese país). Solo usuarios autenticados.
alter function public.crear_proyecto(text, text, int, estado_proyecto, int[], date, date, text, text, text, numeric, char)
  set search_path = public;
revoke execute on function public.crear_proyecto(text, text, int, estado_proyecto, int[], date, date, text, text, text, numeric, char)
  from public, anon;
grant execute on function public.crear_proyecto(text, text, int, estado_proyecto, int[], date, date, text, text, text, numeric, char)
  to authenticated;
