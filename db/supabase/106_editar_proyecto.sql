-- Requiere db/migrations/005_editar_proyecto.sql.
alter function public.actualizar_proyecto(uuid, text, text, int, estado_proyecto, int[], date, date, text, text, text, numeric, char)
  set search_path = public;
revoke execute on function public.actualizar_proyecto(uuid, text, text, int, estado_proyecto, int[], date, date, text, text, text, numeric, char)
  from public, anon;
grant execute on function public.actualizar_proyecto(uuid, text, text, int, estado_proyecto, int[], date, date, text, text, text, numeric, char)
  to authenticated;

-- La función del trigger no se llama directamente desde la API.
revoke execute on function public.impedir_proyecto_sin_evidencias() from public, anon, authenticated;
