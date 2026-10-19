# Fases del proyecto

Última actualización: 18 de octubre de 2026.

| # | Fase | Estado | Qué incluye |
|---|------|--------|-------------|
| 1 | Captura y búsqueda | ✅ Hecha | Inicio de sesión, crear contraseña (invitación o recuperación), listado y búsqueda por etiquetas, país, texto y fecha, y formulario de proyecto con evidencias. |
| 2 | Endurecimiento de seguridad | ✅ Hecha | Descargas solo por el servidor con bitácora, evidencias internas visibles solo para el país del proyecto, autoría fijada por la base de datos, creación en una transacción y registro público apagado. |
| ➕ | Carga masiva por carpeta | ✅ Hecha | Plantilla Excel con matriz de etiquetas (X) y carpeta de carga con el Excel y la subcarpeta `Evidencias/` (archivos 1.1, 1.2, 2.1…). Incluye guía paso a paso y burbuja de ayuda. Se guarda todo o nada. |
| 3 | Detalle y descargas | ✅ Hecha | Página de cada proyecto con datos, etiquetas, monto (solo quien puede verlo) y descarga de evidencias registrada en la bitácora. |
| 4 | Edición y eliminación | ✅ Hecha | Editar datos, etiquetas, monto y evidencias (agregar, quitar, tipo, compartible) y eliminar un proyecto con confirmación. La base impide quitar la última evidencia. |
| 5 | Administración | ✅ Hecha | Usuarios (invitar, rol, país, desactivar), catálogos (etiquetas y países) y consulta de la bitácora de descargas. Invitar requiere una Edge Function y, para varios correos, un SMTP propio (el plan gratuito limita los envíos). |
| 6 | Exportación de referencias | ✅ Hecha | Elegir proyectos y generar la ficha (PDF, Excel o ambos), con opción de un .zip que incluye las evidencias compartibles por proyecto. Sin montos ni evidencias internas. Cada exportación y cada archivo quedan en la bitácora. |
| 7 | Producción | ⏭️ **Siguiente** | Hosting y dominio, Site URL de producción, correo propio, respaldos, monitoreo y revisión final de seguridad. |

## Reglas que no cambian

- No se aceptan proyectos sin evidencias ni sin al menos una etiqueta.
- El monto y las evidencias internas nunca los ve el rol consulta y nunca se exportan.
- Toda descarga o exportación queda registrada en `descargas`, y solo el servidor escribe ahí.
- Solo un admin crea usuarios: el registro público en Supabase debe seguir apagado.
- `docs/` tiene la lista real de proyectos y no se sube a GitHub.
