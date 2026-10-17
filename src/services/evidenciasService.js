import { invocar, supabase, unwrap } from './supabaseClient'

const BUCKET = 'evidencias'
export const TAMANO_MAXIMO_BYTES = 50 * 1024 * 1024 // igual al límite del bucket

// Ruta relativa en el almacenamiento: <proyecto_id>/<archivo>.
// Se usa un nombre aleatorio para evitar colisiones; el nombre original se guarda aparte.
function construirRuta(proyectoId, archivo) {
  const punto = archivo.name.lastIndexOf('.')
  const extension =
    punto > 0
      ? archivo.name
          .slice(punto)
          .toLowerCase()
          .replace(/[^.a-z0-9]/g, '')
      : ''
  return `${proyectoId}/${crypto.randomUUID()}${extension}`
}

// Sube el archivo y registra la evidencia. Si el registro falla, elimina el archivo subido.
export async function subirEvidencia(proyectoId, { archivo, tipo, descripcion, compartible }) {
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    throw new Error(`"${archivo.name}" supera el máximo de 50 MB.`)
  }
  const ruta = construirRuta(proyectoId, archivo)

  unwrap(
    await supabase.storage.from(BUCKET).upload(ruta, archivo, {
      contentType: archivo.type || undefined,
      upsert: false,
    }),
  )

  try {
    return unwrap(
      await supabase
        .from('evidencias')
        .insert({
          proyecto_id: proyectoId,
          tipo,
          descripcion: descripcion?.trim() || null,
          ruta_archivo: ruta,
          nombre_original: archivo.name,
          tamano_bytes: archivo.size,
          compartible,
        })
        .select('id, ruta_archivo')
        .single(),
    )
  } catch (e) {
    await eliminarArchivos([ruta]).catch(() => {}) // se informa el error original
    throw e
  }
}

// Cambia el tipo, la descripción o si es compartible.
export async function actualizarEvidencia(id, { tipo, descripcion, compartible }) {
  unwrap(
    await supabase
      .from('evidencias')
      .update({ tipo, descripcion: descripcion?.trim() || null, compartible })
      .eq('id', id)
      .select('id')
      .single(),
  )
}

// Quita una evidencia: primero la fila (la base impide quitar la última del proyecto),
// después el archivo. Si el archivo no se puede borrar queda huérfano e inaccesible.
export async function eliminarEvidencia(id) {
  const { ruta_archivo } = unwrap(
    await supabase.from('evidencias').delete().eq('id', id).select('ruta_archivo').single(),
  )
  await eliminarArchivos([ruta_archivo]).catch(() => {})
}

// Los borrados de archivos pasan por el servidor (el navegador no tiene permiso directo).
export async function eliminarArchivos(rutas) {
  if (rutas.length === 0) return
  await invocar('eliminar-archivos-evidencia', { rutas })
}

// El servidor valida el permiso, registra la descarga en la bitácora y devuelve
// una URL firmada que vence en 60 segundos. Es la única forma de bajar una evidencia.
export async function descargarEvidencia(evidenciaId) {
  const { url } = await invocar('descargar-evidencia', { evidenciaId })
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.rel = 'noopener'
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
}
