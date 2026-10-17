-- Edición de proyectos.

-- Actualiza datos, etiquetas y monto en una sola transacción.
-- Los permisos los decide la capa de la plataforma (en Supabase, las políticas RLS):
-- si quien llama no puede editar el proyecto, el UPDATE no encuentra la fila.
create or replace function actualizar_proyecto(
  p_id                   uuid,
  p_titulo               text,
  p_cliente              text,
  p_pais_id              int,
  p_estado               estado_proyecto,
  p_etiquetas            int[],
  p_fecha_inicio         date    default null,
  p_fecha_fin            date    default null,
  p_descripcion          text    default null,
  p_resultados           text    default null,
  p_contacto_referencia  text    default null,
  p_monto                numeric default null,
  p_moneda               char(3) default 'USD'
) returns void
language plpgsql as $$
begin
  if coalesce(cardinality(p_etiquetas), 0) = 0 then
    raise exception 'El proyecto debe tener al menos una etiqueta.' using errcode = '22023';
  end if;

  update proyectos set
    titulo = p_titulo, cliente = p_cliente, pais_id = p_pais_id, estado = p_estado,
    fecha_inicio = p_fecha_inicio, fecha_fin = p_fecha_fin, descripcion = p_descripcion,
    resultados = p_resultados, contacto_referencia = p_contacto_referencia
  where id = p_id;
  if not found then
    raise exception 'El proyecto no existe o no tienes permiso para editarlo.' using errcode = '42501';
  end if;

  delete from proyecto_etiquetas where proyecto_id = p_id and etiqueta_id <> all (p_etiquetas);
  insert into proyecto_etiquetas (proyecto_id, etiqueta_id)
  select p_id, e from unnest(p_etiquetas) as e
  on conflict do nothing;

  if p_monto is null then
    delete from proyecto_montos where proyecto_id = p_id;
  else
    insert into proyecto_montos (proyecto_id, monto, moneda) values (p_id, p_monto, p_moneda)
    on conflict (proyecto_id) do update set monto = excluded.monto, moneda = excluded.moneda;
  end if;
end $$;

-- Regla de negocio: no se aceptan proyectos sin evidencias.
-- Impide borrar la última evidencia de un proyecto que sigue existiendo
-- (al borrar el proyecto completo, sus evidencias se van en cascada sin problema).
-- Security definer para contar todas las evidencias, aunque quien borra no las vea todas.
create or replace function impedir_proyecto_sin_evidencias() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from proyectos where id = old.proyecto_id)
     and not exists (select 1 from evidencias where proyecto_id = old.proyecto_id) then
    raise exception 'El proyecto debe conservar al menos una evidencia. Agrega otra antes de quitar la última.'
      using errcode = '23514';
  end if;
  return null;
end $$;

drop trigger if exists trg_evidencias_minimo on evidencias;
create trigger trg_evidencias_minimo
  after delete or update of proyecto_id on evidencias
  for each row execute function impedir_proyecto_sin_evidencias();
