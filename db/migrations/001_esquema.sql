-- Esquema base. PostgreSQL estándar, sin dependencias de plataforma.

create extension if not exists pgcrypto;

-- Catálogos

create table paises (
  id      serial primary key,
  nombre  text not null unique,
  codigo  char(2) not null unique
);

create table etiquetas (
  id      serial primary key,
  nombre  text not null unique
);

-- Usuarios

create type rol_usuario as enum ('admin', 'editor', 'consulta');

create table usuarios (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  nombre      text not null,
  rol         rol_usuario not null default 'consulta',
  pais_id     int references paises(id),
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- Proyectos

create type estado_proyecto as enum ('en_curso', 'finalizado');

create table proyectos (
  id                   uuid primary key default gen_random_uuid(),
  titulo               text not null,
  cliente              text not null,
  pais_id              int not null references paises(id),
  fecha_inicio         date,
  fecha_fin            date,
  estado               estado_proyecto not null default 'finalizado',
  descripcion          text,
  resultados           text,
  contacto_referencia  text,
  creado_por           uuid references usuarios(id) on delete set null,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  constraint fechas_validas check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio)
);

create table proyecto_etiquetas (
  proyecto_id  uuid references proyectos(id) on delete cascade,
  etiqueta_id  int  references etiquetas(id) on delete restrict,
  primary key (proyecto_id, etiqueta_id)
);

-- Información financiera de uso interno. No se incluye en exportaciones.
create table proyecto_montos (
  proyecto_id  uuid primary key references proyectos(id) on delete cascade,
  monto        numeric(14,2) not null check (monto >= 0),
  moneda       char(3) not null default 'USD'
);

-- Evidencias

create type tipo_evidencia as enum (
  'acta_recepcion', 'carta_referencia', 'contrato', 'informe', 'foto', 'otro'
);

create table evidencias (
  id            uuid primary key default gen_random_uuid(),
  proyecto_id   uuid not null references proyectos(id) on delete cascade,
  tipo          tipo_evidencia not null,
  descripcion   text,
  ruta_archivo  text not null unique,   -- ruta relativa dentro del almacenamiento de archivos
  nombre_original text not null,
  tamano_bytes  bigint,
  compartible   boolean not null default true,  -- false: uso interno, se excluye de exportaciones
  subido_por    uuid references usuarios(id) on delete set null,
  subido_en     timestamptz not null default now()
);

-- Bitácora de descargas y exportaciones

create table descargas (
  id            bigserial primary key,
  usuario_id    uuid not null references usuarios(id),
  proyecto_id   uuid references proyectos(id) on delete set null,
  evidencia_id  uuid references evidencias(id) on delete set null,
  fecha         timestamptz not null default now()
);

-- Índices

create index idx_proyectos_pais on proyectos (pais_id);
create index idx_proyectos_fecha_fin on proyectos (fecha_fin);
create index idx_proyecto_etiquetas_etiqueta on proyecto_etiquetas (etiqueta_id);
create index idx_evidencias_proyecto on evidencias (proyecto_id);
create index idx_descargas_usuario on descargas (usuario_id);
create index idx_usuarios_pais on usuarios (pais_id);

-- Fecha de actualización automática

create or replace function marcar_actualizado() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger trg_proyectos_actualizado
  before update on proyectos
  for each row execute function marcar_actualizado();

-- Búsqueda: proyectos que tienen todas las etiquetas indicadas.
-- Devuelve todos si la lista está vacía.
create or replace function buscar_proyectos(
  p_etiquetas int[] default '{}',
  p_paises    int[] default '{}',
  p_desde     date  default null,
  p_hasta     date  default null,
  p_texto     text  default null
) returns setof proyectos
language sql stable as $$
  select p.*
  from proyectos p
  where (cardinality(p_paises) = 0 or p.pais_id = any(p_paises))
    and (p_desde is null or p.fecha_fin >= p_desde)
    and (p_hasta is null or p.fecha_fin <= p_hasta)
    and (p_texto is null or p.titulo ilike '%' || p_texto || '%'
                         or p.cliente ilike '%' || p_texto || '%'
                         or p.descripcion ilike '%' || p_texto || '%')
    and (cardinality(p_etiquetas) = 0 or (
      select count(distinct pe.etiqueta_id)
      from proyecto_etiquetas pe
      where pe.proyecto_id = p.id and pe.etiqueta_id = any(p_etiquetas)
    ) = cardinality(p_etiquetas))
  order by p.fecha_fin desc nulls last;
$$;
