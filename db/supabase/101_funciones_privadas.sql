-- Mueve las funciones auxiliares de permisos a un esquema no expuesto por la API.

create schema if not exists privado;
grant usage on schema privado to authenticated;

alter function public.mi_rol() set schema privado;
alter function public.mi_pais() set schema privado;
alter function public.puede_editar_proyecto(uuid) set schema privado;
alter function public.crear_usuario_desde_auth() set schema privado;

alter function privado.mi_rol() set search_path = public, privado;
alter function privado.mi_pais() set search_path = public, privado;
alter function privado.puede_editar_proyecto(uuid) set search_path = public, privado;
alter function privado.crear_usuario_desde_auth() set search_path = public, privado;

revoke all on all functions in schema privado from public, anon;
grant execute on function privado.mi_rol(), privado.mi_pais(), privado.puede_editar_proyecto(uuid) to authenticated;
revoke execute on function privado.crear_usuario_desde_auth() from authenticated;

revoke execute on function public.buscar_proyectos(int[], int[], date, date, text) from public, anon;
grant execute on function public.buscar_proyectos(int[], int[], date, date, text) to authenticated;
