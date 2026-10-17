-- Requiere db/migrations/004_crear_proyectos.sql.
-- Se ejecuta con los permisos de quien llama: las políticas RLS aplican a cada fila.
alter function public.crear_proyectos(jsonb) set search_path = public;
revoke execute on function public.crear_proyectos(jsonb) from public, anon;
grant execute on function public.crear_proyectos(jsonb) to authenticated;
