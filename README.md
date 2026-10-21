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
    005_editar_proyecto.sql          actualizar_proyecto + regla: no quitar la última evidencia
    006_administracion.sql           editor con país, siempre un admin activo, índice de la bitácora
    007_exportaciones.sql            la bitácora distingue descargas de evidencias y exportaciones (pdf/excel)
    008_indices_llaves_foraneas.sql  índices para las llaves foráneas de descargas, evidencias y proyectos
  supabase/                Adaptador específico de Supabase
    100_auth_y_permisos.sql
    101_funciones_privadas.sql
    102_descargas_por_servidor.sql
    103_evidencias_internas_por_pais.sql
    104_autoria_y_crear_proyecto.sql  creado_por / subido_por los fija la base de datos
    105_crear_proyectos.sql
    106_editar_proyecto.sql
    107_administracion.sql           permisos de columnas en usuarios, un admin no se cambia a sí mismo, listar_usuarios
    108_politicas_rls.sql            mismos permisos, una sola política de lectura por tabla
    functions/             Edge Functions (Deno)
      descargar-evidencia/          valida permiso, registra en descargas y entrega URL firmada (60 s)
      eliminar-archivos-evidencia/  borra archivos del almacenamiento (admin o editor del país)
      eliminar-proyecto/            borra el proyecto (permiso por RLS) y después todos sus archivos
      exportar-referencias/         registra la exportación y entrega solo lo exportable (sin montos ni evidencias internas)
      invitar-usuario/              solo admin: envía la invitación por correo y asigna rol y país
```

Los archivos de evidencias no se leen ni se borran directamente desde el navegador: pasan por las Edge Functions, que usan la llave de servicio. Así toda descarga queda registrada y la bitácora `descargas` solo la escribe el servidor.

## Configuración obligatoria de Supabase (Authentication)

- **Registro público desactivado** ("Allow new users to sign up" apagado). Solo un admin crea usuarios. Si se activara, cualquier persona podría crearse una cuenta: el trigger le asigna rol consulta activo y vería todos los proyectos.
- **Requisitos de contraseña**: mínimo 8 caracteres, con minúsculas, mayúsculas y números (la app muestra la misma lista en Crear contraseña).
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

En **Nuevo proyecto**, el panel de la derecha guía paso a paso: descargar la plantilla, llenarla (N.º, etiquetas marcadas con X como en la matriz de clasificación, datos obligatorios), armar la carpeta de carga y arrastrarla.

```
Carga octubre 2026/        ← se arrastra esta carpeta
  proyectos.xlsx           ← la plantilla llena (un solo Excel)
  Evidencias/
    1.1 Contrato.pdf       ← N.º del proyecto . consecutivo
    1.2 Acta.pdf
    2.1 Informe.docx
```

- Se rechaza la carga si falta el Excel o la carpeta Evidencias, si hay más de un Excel, si hay evidencias fuera de Evidencias, si un archivo no sigue la guía, si hay códigos repetidos o de proyectos inexistentes, o si algún proyecto queda sin evidencias. Cada error dice qué corregir.
- Los proyectos se crean en una transacción (`crear_proyectos`) y luego se suben las evidencias; si una falla, se borran archivos y proyectos.
- Para un solo proyecto también se puede subir solo el Excel: llena el formulario y ahí se adjuntan las evidencias.

**Regla: no se aceptan proyectos sin evidencias** (formulario y carga masiva). La lógica está en `src/lib/excelProyectos.js` y `src/lib/evidenciasCarpeta.js`.

Fase 1: inicio de sesión, listado y búsqueda de proyectos (por etiquetas, país, texto y fecha de fin) y creación de proyectos con etiquetas, monto y evidencias.

### Exportación de referencias

En la búsqueda, cada proyecto tiene una casilla para elegirlo (también se pueden elegir todos los que se muestran). La selección se recuerda durante la sesión y se ve en el menú **Exportar**, donde se ordena, se le pone título al documento y se descarga en PDF (una ficha por proyecto), Excel (una fila por proyecto) o ambos.

- El navegador arma el archivo solo con lo que devuelve la Edge Function `exportar-referencias`, que nunca incluye montos ni evidencias internas; el contacto de referencia sale solo si se marca.
- Con **Incluir los archivos de evidencias** (o con ambos formatos) se descarga un .zip:

  ```
  Propuesta X/
    Propuesta X.pdf / .xlsx
    Evidencias/
      01 Nombre del proyecto/
        1.1 Acta.pdf
  ```

  Solo van evidencias compartibles, bajadas con URLs firmadas de 10 minutos. Máximo 300 MB por paquete, porque el .zip se arma en el navegador.
- Cada exportación queda en `descargas`: una fila por proyecto y formato (`tipo = 'exportacion'`) y una por cada evidencia incluida (`tipo = 'evidencia'`). Máximo 100 proyectos por exportación.
- La lógica de los archivos está en `src/lib/exportarReferencias.js`.
