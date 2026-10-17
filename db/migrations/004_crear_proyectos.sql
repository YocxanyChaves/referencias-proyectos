-- Importación masiva: crea varios proyectos en una sola transacción.
-- Si una fila falla, no se guarda ninguna y el error indica el número de fila.
-- Cada elemento de p_proyectos es un objeto con las mismas claves que los parámetros
-- de crear_proyecto (sin el prefijo p_) más "fila", el número de fila de la hoja de cálculo.
create or replace function crear_proyectos(p_proyectos jsonb) returns uuid[]
language plpgsql as $$
declare
  v_ids  uuid[] := '{}';
  v_item jsonb;
  v_fila text;
begin
  if jsonb_typeof(p_proyectos) <> 'array' or jsonb_array_length(p_proyectos) = 0 then
    raise exception 'No hay proyectos para importar.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_proyectos) > 500 then
    raise exception 'Máximo 500 proyectos por importación.' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_proyectos) loop
    v_fila := coalesce(v_item->>'fila', '?');
    begin
      v_ids := v_ids || crear_proyecto(
        p_titulo              => v_item->>'titulo',
        p_cliente             => v_item->>'cliente',
        p_pais_id             => (v_item->>'pais_id')::int,
        p_estado              => (v_item->>'estado')::estado_proyecto,
        p_etiquetas           => array(select jsonb_array_elements_text(v_item->'etiquetas')::int),
        p_fecha_inicio        => (v_item->>'fecha_inicio')::date,
        p_fecha_fin           => (v_item->>'fecha_fin')::date,
        p_descripcion         => v_item->>'descripcion',
        p_resultados          => v_item->>'resultados',
        p_contacto_referencia => v_item->>'contacto_referencia',
        p_monto               => (v_item->>'monto')::numeric,
        p_moneda              => coalesce(v_item->>'moneda', 'USD')
      );
    exception when others then
      raise exception 'Fila %: %', v_fila, sqlerrm using errcode = sqlstate;
    end;
  end loop;

  return v_ids;
end $$;
