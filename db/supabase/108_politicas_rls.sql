-- Requiere db/supabase/107_administracion.sql.
-- Mismos permisos que antes, escritos para que Postgres evalúe una sola política por consulta.

-- 1. Una sola política de lectura por tabla. Las políticas "for all" también aplicaban al select,
--    así que se separan en insert, update y delete, y su condición de lectura se suma a la de *_leer.

-- paises y etiquetas: todos leen, solo el admin escribe.
drop policy if exists paises_admin on public.paises;
create policy paises_insertar on public.paises for insert to authenticated
  with check (privado.mi_rol() = 'admin');
create policy paises_actualizar on public.paises for update to authenticated
  using (privado.mi_rol() = 'admin') with check (privado.mi_rol() = 'admin');
create policy paises_eliminar on public.paises for delete to authenticated
  using (privado.mi_rol() = 'admin');

drop policy if exists etiquetas_admin on public.etiquetas;
create policy etiquetas_insertar on public.etiquetas for insert to authenticated
  with check (privado.mi_rol() = 'admin');
create policy etiquetas_actualizar on public.etiquetas for update to authenticated
  using (privado.mi_rol() = 'admin') with check (privado.mi_rol() = 'admin');
create policy etiquetas_eliminar on public.etiquetas for delete to authenticated
  using (privado.mi_rol() = 'admin');

-- usuarios: cada quien ve su fila y el admin ve todas (usuarios_propio ya lo cubría).
-- Además, auth.uid() va dentro de un select para que se calcule una vez y no por cada fila.
drop policy if exists usuarios_admin on public.usuarios;
drop policy if exists usuarios_propio on public.usuarios;
create policy usuarios_propio on public.usuarios for select to authenticated
  using (id = (select auth.uid()) or privado.mi_rol() = 'admin');
create policy usuarios_insertar on public.usuarios for insert to authenticated
  with check (privado.mi_rol() = 'admin');
create policy usuarios_actualizar on public.usuarios for update to authenticated
  using (privado.mi_rol() = 'admin') with check (privado.mi_rol() = 'admin');
create policy usuarios_eliminar on public.usuarios for delete to authenticated
  using (privado.mi_rol() = 'admin');

-- proyecto_etiquetas: leen todos los usuarios; escribe quien puede editar el proyecto.
drop policy if exists proyecto_etiquetas_escribir on public.proyecto_etiquetas;
drop policy if exists proyecto_etiquetas_leer on public.proyecto_etiquetas;
create policy proyecto_etiquetas_leer on public.proyecto_etiquetas for select to authenticated
  using (privado.mi_rol() is not null or privado.puede_editar_proyecto(proyecto_id));
create policy proyecto_etiquetas_insertar on public.proyecto_etiquetas for insert to authenticated
  with check (privado.puede_editar_proyecto(proyecto_id));
create policy proyecto_etiquetas_actualizar on public.proyecto_etiquetas for update to authenticated
  using (privado.puede_editar_proyecto(proyecto_id)) with check (privado.puede_editar_proyecto(proyecto_id));
create policy proyecto_etiquetas_eliminar on public.proyecto_etiquetas for delete to authenticated
  using (privado.puede_editar_proyecto(proyecto_id));

-- evidencias: las compartibles las ve cualquier usuario; las internas, solo quien puede editar el proyecto.
drop policy if exists evidencias_escribir on public.evidencias;
drop policy if exists evidencias_leer on public.evidencias;
create policy evidencias_leer on public.evidencias for select to authenticated
  using ((privado.mi_rol() is not null and compartible) or privado.puede_editar_proyecto(proyecto_id));
create policy evidencias_insertar on public.evidencias for insert to authenticated
  with check (privado.puede_editar_proyecto(proyecto_id));
create policy evidencias_actualizar on public.evidencias for update to authenticated
  using (privado.puede_editar_proyecto(proyecto_id)) with check (privado.puede_editar_proyecto(proyecto_id));
create policy evidencias_eliminar on public.evidencias for delete to authenticated
  using (privado.puede_editar_proyecto(proyecto_id));
