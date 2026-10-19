// Elimina un proyecto con todas sus evidencias y archivos.
// El borrado de la fila se hace como el usuario: las políticas RLS deciden si puede
// (admin, o editor del país del proyecto). Después se borran los archivos con la llave de servicio.
// Orden: primero la base de datos, luego los archivos. Si falla el borrado de archivos, quedan
// archivos huérfanos e inaccesibles (no hay fila que permita descargarlos), nunca evidencias sin archivo.
import {
  BUCKET,
  ErrorHttp,
  clienteServidor,
  clienteUsuario,
  manejar,
  responder,
  usuarioActivo,
} from '../_compartido/comun.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve((req) =>
  manejar(req, async (req) => {
    const { proyectoId } = await req.json().catch(() => ({}))
    if (typeof proyectoId !== 'string' || !UUID.test(proyectoId)) {
      throw new ErrorHttp(400, 'Falta un proyectoId válido.')
    }

    const servidor = clienteServidor()
    await usuarioActivo(req, servidor)

    // Rutas de todos los archivos del proyecto (incluidas las evidencias internas).
    const { data: evidencias, error: errorLectura } = await servidor
      .from('evidencias')
      .select('ruta_archivo')
      .eq('proyecto_id', proyectoId)
    if (errorLectura) throw errorLectura

    const { data: borrados, error: errorBorrado } = await clienteUsuario(req)
      .from('proyectos')
      .delete()
      .eq('id', proyectoId)
      .select('id')
    if (errorBorrado) throw errorBorrado
    if (!borrados?.length) {
      throw new ErrorHttp(403, 'El proyecto no existe o no tienes permiso para eliminarlo.')
    }

    // También se barre la carpeta del proyecto, por si quedaron archivos de cargas fallidas.
    const rutas = new Set((evidencias ?? []).map((e) => e.ruta_archivo))
    const { data: enCarpeta } = await servidor.storage.from(BUCKET).list(proyectoId, { limit: 1000 })
    for (const objeto of enCarpeta ?? []) rutas.add(`${proyectoId}/${objeto.name}`)

    let archivosSinBorrar = 0
    const lista = [...rutas]
    for (let i = 0; i < lista.length; i += 100) {
      const { error } = await servidor.storage.from(BUCKET).remove(lista.slice(i, i + 100))
      if (error) {
        console.error(error)
        archivosSinBorrar += Math.min(100, lista.length - i)
      }
    }

    return responder({ eliminado: true, archivos: lista.length - archivosSinBorrar, archivosSinBorrar })
  }),
)
