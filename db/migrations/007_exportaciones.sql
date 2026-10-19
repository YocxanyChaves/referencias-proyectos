-- Exportación de referencias.

-- La bitácora registra también las exportaciones de fichas (una fila por proyecto exportado).
-- En una exportación no hay evidencia: el archivo es la ficha generada, en PDF o Excel.
alter table descargas
  add column tipo text not null default 'evidencia' check (tipo in ('evidencia', 'exportacion')),
  add column formato text check (formato in ('pdf', 'excel'));

alter table descargas
  add constraint exportacion_coherente
  check (tipo = 'evidencia' or (formato is not null and evidencia_id is null));
