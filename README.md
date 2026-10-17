# Referencias de Proyectos

Repositorio de proyectos ejecutados y sus evidencias, para adjuntar referencias a propuestas comerciales. Los proyectos se clasifican por etiquetas temáticas y se consultan desde todos los países de la organización.

## Roles

| Rol      | Permisos |
|----------|----------|
| admin    | Administra usuarios, catálogos y todos los proyectos. |
| editor   | Crea y edita proyectos y evidencias de su país. Ve montos de su país. |
| consulta | Busca proyectos de todos los países y descarga evidencias compartibles. |

## Reglas de negocio

- Los montos se guardan en `proyecto_montos` y nunca se incluyen en exportaciones ni se muestran al rol consulta.
- Las evidencias marcadas `compartible = false` (por ejemplo, contratos con precios) son de uso interno y no se exportan.
- Toda descarga o exportación se registra en `descargas`.

## Estructura de la base de datos

```
db/
  migrations/              PostgreSQL estándar, independiente de la plataforma
    001_esquema.sql
    002_datos_iniciales.sql
    003_crear_proyecto.sql           proyecto + etiquetas + monto en una transacción
    004_crear_proyectos.sql          importación masiva: todos o ninguno
  supabase/                Adaptador específico de Supabase
    100_auth_y_permisos.sql
    101_funciones_privadas.sql
    102_descargas_por_servidor.sql
    103_evidencias_internas_por_pais.sql
    104_autoria_y_crear_proyecto.sql  creado_por / subido_por los fija la base de datos
    105_crear_proyectos.sql
    functions/             Edge Functions (Deno)
      descargar-evidencia/          valida permiso, registra en descargas y entrega URL firmada (60 s)
      eliminar-archivos-evidencia/  borra archivos del almacenamiento (admin o editor del país)
```

Los archivos de evidencias no se leen ni se borran directamente desde el navegador: pasan por las Edge Functions, que usan la llave de servicio. Así toda descarga queda registrada y la bitácora `descargas` solo la escribe el servidor.

## Configuración obligatoria de Supabase (Authentication)

- **Registro público desactivado** ("Allow new users to sign up" apagado). Solo un admin crea usuarios. Si se activara, cualquier persona podría crearse una cuenta: el trigger le asigna rol consulta activo y vería todos los proyectos.
- **Requisitos de contraseña**: mínimo 8 caracteres, con letras y números (la app exige lo mismo).
- **Site URL y Redirect URLs** apuntando a la dirección de la app (necesario para invitaciones y recuperación de contraseña).

Orden de ejecución: `migrations/` y luego el adaptador de la plataforma.

## Portabilidad

El esquema base no depende de ningún proveedor. Lo específico de Supabase (autenticación, Row Level Security y almacenamiento de archivos) está aislado en `db/supabase/`.

Para migrar a otra plataforma:

1. Ejecutar `db/migrations/` en cualquier PostgreSQL 14+.
2. Reemplazar `db/supabase/` por el mecanismo equivalente:
   - Autenticación: cualquier proveedor que entregue un identificador UUID para `usuarios.id`.
   - Permisos: aplicar las mismas reglas en la capa de API (ver tabla de roles).
   - Archivos: cualquier almacenamiento de objetos (S3, Azure Blob, etc.); `evidencias.ruta_archivo` guarda la ruta relativa `<proyecto_id>/<archivo>`.
3. En el frontend, el acceso a datos debe pasar por una capa de servicios (`src/services/`) para que cambiar de proveedor solo afecte esa capa.

## Frontend

React + Vite. Todo el acceso a datos está en `src/services/`; solo `src/services/supabaseClient.js` importa el SDK de Supabase.

```
cp .env.example .env    # completar URL y publishable key del proyecto
npm install
npm run dev
```

### Carga desde Excel

En **Nuevo proyecto** hay un panel para arrastrar un `.xlsx` y un botón para descargar la plantilla (listas desplegables de país, estado y etiquetas, e instrucciones).

- **Un proyecto** en el Excel: llena el formulario y ahí se adjuntan las evidencias.
- **Varios proyectos**: se pide además la carpeta de evidencias. Cada archivo se nombra `<N.º>.<consecutivo> descripción.ext` (`1.1 Contrato.pdf`, `1.2 Acta.pdf`, `2.1 Informe.docx`), donde N.º es la columna del Excel. Se rechaza la carga si un archivo no sigue la guía, si hay códigos repetidos o de proyectos inexistentes, o si algún proyecto queda sin evidencias.
- Los proyectos se crean en una transacción (`crear_proyectos`) y luego se suben las evidencias; si una falla, se borran archivos y proyectos.

**Regla: no se aceptan proyectos sin evidencias** (formulario y carga masiva). La lógica está en `src/lib/excelProyectos.js` y `src/lib/evidenciasCarpeta.js`.

Fase 1: inicio de sesión, listado y búsqueda de proyectos (por etiquetas, país, texto y fecha de fin) y creación de proyectos con etiquetas, monto y evidencias.
