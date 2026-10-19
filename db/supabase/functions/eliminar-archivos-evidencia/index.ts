// Borra archivos del almacenamiento de evidencias. Solo admin, o editores
// en proyectos de su país (misma regla que privado.puede_editar_proyecto).
// Se usa al deshacer una creación fallida y, más adelante, al quitar evidencias.
import { BUCKET, ErrorHttp, clienteServidor, manejar, responder, usuarioActivo } from '../_compartido/comun.ts'

const MAX_RUTAS = 50
// <proyecto_id>/<archivo>, sin subcarpetas ni "..".
const RUTA = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[A-Za-z0-9._-]+$/i

Deno.serve((req) =>
  manejar(req, async (req) => {
    const { rutas } = await req.json().catch(() => ({}))
    if (!Array.isArray(rutas) || rutas.length === 0 || rutas.length > MAX_RUTAS) {
      throw new ErrorHttp(400, `Envía entre 1 y ${MAX_RUTAS} rutas.`)
    }
    const proyectoIds = new Set<string>()
    for (const ruta of rutas) {
      const m = typeof ruta === 'string' ? RUTA.exec(ruta) : null
      if (!m || ruta.includes('..')) throw new ErrorHttp(400, `Ruta no válida: ${ruta}`)
      proyectoIds.add(m[1].toLowerCase())
    }

    const servidor = clienteServidor()
    const usuario = await usuarioActivo(req, servidor)

    if (usuario.rol !== 'admin') {
      if (usuario.rol !== 'editor') throw new ErrorHttp(403, 'No tienes permiso para borrar archivos.')
      const { data: proyectos, error } = await servidor
        .from('proyectos')
        .select('id, pais_id')
        .in('id', [...proyectoIds])
      if (error) throw error
      const permitidos = new Set(
        (proyectos ?? []).filter((p) => p.pais_id === usuario.pais_id).map((p) => p.id),
      )
      if ([...proyectoIds].some((id) => !permitidos.has(id))) {
        throw new ErrorHttp(403, 'Solo puedes borrar archivos de proyectos de tu país.')
      }
    }

    const { error } = await servidor.storage.from(BUCKET).remove(rutas)
    if (error) throw error
    return responder({ eliminados: rutas.length })
  }),
)
