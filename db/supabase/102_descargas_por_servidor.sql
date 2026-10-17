-- Las descargas pasan solo por el servidor (Edge Function descargar-evidencia),
-- que valida el permiso, registra la descarga y entrega una URL firmada de corta duración.
-- Así la bitácora no se puede saltar (descargando directo del almacenamiento)
-- ni falsear (insertando filas desde el navegador).

-- 1. Sin lectura directa de archivos desde el navegador.
drop policy if exists evidencias_archivos_leer on storage.objects;

-- Borrar en Storage exige también permiso de lectura, así que la política de
-- borrado ya no sirve: los borrados pasan por la Edge Function eliminar-archivos-evidencia.
drop policy if exists evidencias_archivos_eliminar on storage.objects;

-- 2. La bitácora solo la escribe el servidor (rol service_role, que no pasa por RLS).
drop policy if exists descargas_registrar on public.descargas;
revoke insert, update, delete, truncate on public.descargas from anon, authenticated;
revoke usage on sequence public.descargas_id_seq from anon, authenticated;

-- 3. Un usuario inactivo o sin perfil no ve evidencias, ni siquiera las compartibles.
drop policy if exists evidencias_leer on public.evidencias;
create policy evidencias_leer on public.evidencias for select to authenticated
  using (
    privado.mi_rol() is not null
    and (compartible or privado.mi_rol() in ('admin', 'editor'))
  );
