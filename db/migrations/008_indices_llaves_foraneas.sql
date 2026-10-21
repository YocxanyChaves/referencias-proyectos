-- Índices para las llaves foráneas que no tenían uno.
-- Aceleran los filtros de la bitácora y los borrados en cascada al eliminar un proyecto o una evidencia.

create index if not exists idx_descargas_proyecto on descargas (proyecto_id);
create index if not exists idx_descargas_evidencia on descargas (evidencia_id);
create index if not exists idx_evidencias_subido_por on evidencias (subido_por);
create index if not exists idx_proyectos_creado_por on proyectos (creado_por);
