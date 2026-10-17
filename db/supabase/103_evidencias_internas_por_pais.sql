-- Las evidencias de uso interno (compartible = false, p. ej. contratos con precios)
-- solo las ven admin y editores del país del proyecto, igual que los montos.
-- Como la Edge Function descargar-evidencia lee como el usuario, la regla aplica también a las descargas.
drop policy if exists evidencias_leer on public.evidencias;
create policy evidencias_leer on public.evidencias for select to authenticated
  using (
    privado.mi_rol() is not null
    and (compartible or privado.puede_editar_proyecto(proyecto_id))
  );
