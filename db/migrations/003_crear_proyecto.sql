-- Crea un proyecto con sus etiquetas y su monto en una sola transacción:
-- si cualquier paso falla, no queda nada guardado.
-- Los permisos los decide la capa de la plataforma (en Supabase, las políticas RLS,
-- porque la función se ejecuta con los permisos de quien la llama).
create or replace function crear_proyecto(
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
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  if coalesce(cardinality(p_etiquetas), 0) = 0 then
    raise exception 'El proyecto debe tener al menos una etiqueta.' using errcode = '22023';
  end if;

  insert into proyectos (titulo, cliente, pais_id, estado, fecha_inicio, fecha_fin,
                         descripcion, resultados, contacto_referencia)
  values (p_titulo, p_cliente, p_pais_id, p_estado, p_fecha_inicio, p_fecha_fin,
          p_descripcion, p_resultados, p_contacto_referencia)
  returning id into v_id;

  insert into proyecto_etiquetas (proyecto_id, etiqueta_id)
  select v_id, e from unnest(p_etiquetas) as e
  on conflict do nothing;

  if p_monto is not null then
    insert into proyecto_montos (proyecto_id, monto, moneda) values (v_id, p_monto, p_moneda);
  end if;

  return v_id;
end $$;
