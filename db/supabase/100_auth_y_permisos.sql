-- Adaptador para Supabase: autenticación, permisos por fila y almacenamiento.
-- Si se migra a otra plataforma, este archivo se reemplaza; el esquema base
-- (db/migrations) no cambia.

-- Vincula usuarios con el sistema de autenticación de Supabase.
alter table usuarios
  add constraint usuarios_auth_fk foreign key (id) references auth.users(id) on delete cascade;

-- Al registrarse un usuario en Auth, se crea su fila con rol de consulta.
create or replace function public.crear_usuario_desde_auth() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger trg_auth_nuevo_usuario
  after insert on auth.users
  for each row execute function public.crear_usuario_desde_auth();

-- Funciones auxiliares
create or replace function public.mi_rol() returns rol_usuario
language sql stable security definer set search_path = public as
$$ select rol from usuarios where id = auth.uid() and activo $$;

create or replace function public.mi_pais() returns int
language sql stable security definer set search_path = public as
$$ select pais_id from usuarios where id = auth.uid() and activo $$;

create or replace function public.puede_editar_proyecto(p_proyecto uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select mi_rol() = 'admin'
      or (mi_rol() = 'editor' and exists (
            select 1 from proyectos where id = p_proyecto and pais_id = mi_pais()))
$$;

alter function public.buscar_proyectos(int[], int[], date, date, text) security invoker;
alter function public.marcar_actualizado() set search_path = public;
alter function public.buscar_proyectos(int[], int[], date, date, text) set search_path = public;

-- Row Level Security
alter table paises             enable row level security;
alter table etiquetas          enable row level security;
alter table usuarios           enable row level security;
alter table proyectos          enable row level security;
alter table proyecto_etiquetas enable row level security;
alter table proyecto_montos    enable row level security;
alter table evidencias         enable row level security;
alter table descargas          enable row level security;

-- Catálogos: lectura para usuarios autenticados, escritura solo admin
create policy paises_leer on paises for select to authenticated using (true);
create policy paises_admin on paises for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

create policy etiquetas_leer on etiquetas for select to authenticated using (true);
create policy etiquetas_admin on etiquetas for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

-- Usuarios: cada uno ve su perfil; admin ve y administra todos
create policy usuarios_propio on usuarios for select to authenticated
  using (id = auth.uid() or mi_rol() = 'admin');
create policy usuarios_admin on usuarios for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

-- Proyectos: todos leen; editores escriben en su país; admin en todos
create policy proyectos_leer on proyectos for select to authenticated using (mi_rol() is not null);
create policy proyectos_insertar on proyectos for insert to authenticated
  with check (mi_rol() = 'admin' or (mi_rol() = 'editor' and pais_id = mi_pais()));
create policy proyectos_actualizar on proyectos for update to authenticated
  using (puede_editar_proyecto(id))
  with check (mi_rol() = 'admin' or (mi_rol() = 'editor' and pais_id = mi_pais()));
create policy proyectos_eliminar on proyectos for delete to authenticated
  using (puede_editar_proyecto(id));

create policy proyecto_etiquetas_leer on proyecto_etiquetas for select to authenticated using (mi_rol() is not null);
create policy proyecto_etiquetas_escribir on proyecto_etiquetas for all to authenticated
  using (puede_editar_proyecto(proyecto_id)) with check (puede_editar_proyecto(proyecto_id));

-- Montos: solo admin y editores del país del proyecto
create policy montos_acceso on proyecto_montos for all to authenticated
  using (puede_editar_proyecto(proyecto_id)) with check (puede_editar_proyecto(proyecto_id));

-- Evidencias: consulta ve solo las compartibles
create policy evidencias_leer on evidencias for select to authenticated
  using (compartible or mi_rol() in ('admin', 'editor'));
create policy evidencias_escribir on evidencias for all to authenticated
  using (puede_editar_proyecto(proyecto_id)) with check (puede_editar_proyecto(proyecto_id));

-- Bitácora: cada usuario registra sus descargas; solo admin consulta
create policy descargas_registrar on descargas for insert to authenticated
  with check (usuario_id = auth.uid());
create policy descargas_leer on descargas for select to authenticated
  using (mi_rol() = 'admin');

-- Almacenamiento privado de evidencias.
-- Estructura de rutas: <proyecto_id>/<archivo>
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidencias', 'evidencias', false, 52428800)
on conflict (id) do nothing;

create policy evidencias_archivos_leer on storage.objects for select to authenticated
  using (
    bucket_id = 'evidencias'
    and exists (
      select 1 from public.evidencias e
      where e.ruta_archivo = storage.objects.name
        and (e.compartible or public.mi_rol() in ('admin', 'editor'))
    )
  );

create policy evidencias_archivos_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidencias'
    and public.puede_editar_proyecto(((storage.foldername(name))[1])::uuid)
  );

create policy evidencias_archivos_eliminar on storage.objects for delete to authenticated
  using (
    bucket_id = 'evidencias'
    and public.puede_editar_proyecto(((storage.foldername(name))[1])::uuid)
  );
