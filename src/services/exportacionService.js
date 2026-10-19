import { invocar } from './supabaseClient'

// El servidor registra la exportación en la bitácora y devuelve solo lo exportable:
// sin montos y solo evidencias compartibles. El contacto de referencia, solo si se pide.
// Con incluirEvidencias, cada evidencia trae una URL firmada (10 min) y su descarga queda registrada.
export async function obtenerDatosExportacion(proyectoIds, { formatos, incluirContacto, incluirEvidencias }) {
  const { proyectos } = await invocar('exportar-referencias', {
    proyectoIds,
    formatos,
    incluirContacto,
    incluirEvidencias,
  })
  return proyectos
}
