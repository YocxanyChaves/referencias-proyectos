// Entrega los datos para la ficha de referencias de los proyectos elegidos y registra la
// exportación en la bitácora. El navegador arma el PDF, el Excel o el .zip solo con lo que
// devuelve esta función, así que aquí se decide qué sale: nunca montos ni evidencias internas.
// Con incluirEvidencias, cada evidencia compartible trae una URL firmada y su descarga
// queda registrada como cualquier otra.
import { BUCKET, ErrorHttp, clienteServidor, clienteUsuario, manejar, responder, usuarioActivo } from '../_compartido/comun.ts'

const MAX_PROYECTOS = 100
const MAX_BYTES_EVIDENCIAS = 300 * 1024 * 1024 // el .zip se arma en memoria del navegador
const VIGENCIA_SEGUNDOS = 600 // tiempo para bajar todos los archivos del paquete
const FORMATOS = ['pdf', 'excel']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Sin proyecto_montos: el monto no se pide nunca.
const CAMPOS = `
  id, titulo, cliente, estado, fecha_inicio, fecha_fin, descripcion, resultados, contacto_referencia,
  pais:paises(nombre),
  proyecto_etiquetas(etiqueta:etiquetas(nombre)),
  evidencias(id, tipo, descripcion, nombre_original, compartible, ruta_archivo, tamano_bytes)
`

const mb = (bytes: number) => `${Math.ceil(bytes / 1024 / 1024)} MB`

Deno.serve((req) =>
  manejar(req, async (req) => {
    const { proyectoIds, formatos, incluirContacto, incluirEvidencias } = await req.json().catch(() => ({}))
    if (
      !Array.isArray(proyectoIds) ||
      proyectoIds.length === 0 ||
      proyectoIds.length > MAX_PROYECTOS ||
      !proyectoIds.every((id) => typeof id === 'string' && UUID.test(id))
    ) {
      throw new ErrorHttp(400, `Elige entre 1 y ${MAX_PROYECTOS} proyectos.`)
    }
    if (!Array.isArray(formatos) || formatos.length === 0 || !formatos.every((f) => FORMATOS.includes(f))) {
      throw new ErrorHttp(400, 'Los formatos deben ser pdf, excel o ambos.')
    }
    const ids = [...new Set(proyectoIds.map((id: string) => id.toLowerCase()))]
    const formatosUnicos: string[] = [...new Set(formatos)]
    const conEvidencias = incluirEvidencias === true

    const servidor = clienteServidor()
    const usuario = await usuarioActivo(req, servidor)

    // Se lee como el usuario: solo sale lo que las políticas RLS le dejan ver.
    const { data: filas, error } = await clienteUsuario(req).from('proyectos').select(CAMPOS).in('id', ids)
    if (error) throw error
    if ((filas ?? []).length !== ids.length) {
      throw new ErrorHttp(404, 'Algunos proyectos ya no existen. Actualiza la selección e inténtalo de nuevo.')
    }

    // Solo evidencias compartibles, aunque quien exporta (admin o editor) vea las internas.
    const porId = new Map(
      filas!.map((p) => [
        p.id,
        {
          ...p,
          evidencias: (p.evidencias ?? [])
            .filter((e) => e.compartible)
            .sort((a, b) => a.nombre_original.localeCompare(b.nombre_original, 'es', { numeric: true })),
        },
      ]),
    )
    const evidencias = conEvidencias
      ? ids.flatMap((id) => porId.get(id)!.evidencias.map((e) => ({ ...e, proyecto_id: id })))
      : []

    const total = evidencias.reduce((suma, e) => suma + (e.tamano_bytes ?? 0), 0)
    if (total > MAX_BYTES_EVIDENCIAS) {
      throw new ErrorHttp(
        413,
        `Las evidencias suman ${mb(total)} y el máximo por paquete es ${mb(MAX_BYTES_EVIDENCIAS)}. ` +
          'Elige menos proyectos o exporta sin evidencias.',
      )
    }

    // Primero se registra; si el registro falla, no se entrega nada.
    const registros = [
      ...ids.flatMap((id) =>
        formatosUnicos.map((formato) => ({ usuario_id: usuario.id, proyecto_id: id, tipo: 'exportacion', formato })),
      ),
      ...evidencias.map((e) => ({
        usuario_id: usuario.id,
        proyecto_id: e.proyecto_id,
        evidencia_id: e.id,
        tipo: 'evidencia',
      })),
    ]
    const { error: errorRegistro } = await servidor.from('descargas').insert(registros)
    if (errorRegistro) {
      console.error(errorRegistro)
      throw new ErrorHttp(500, 'No se pudo registrar la exportación.')
    }

    const urls = new Map<string, string>()
    if (evidencias.length) {
      const { data: firmadas, error: errorFirma } = await servidor.storage
        .from(BUCKET)
        .createSignedUrls(evidencias.map((e) => e.ruta_archivo), VIGENCIA_SEGUNDOS)
      if (errorFirma || !firmadas) {
        console.error(errorFirma)
        throw new ErrorHttp(500, 'No se pudieron preparar los archivos de evidencias.')
      }
      for (const f of firmadas) if (f.path && f.signedUrl) urls.set(f.path, f.signedUrl)
    }

    const proyectos = ids.map((id) => {
      const p = porId.get(id)!
      return {
        titulo: p.titulo,
        cliente: p.cliente,
        pais: p.pais?.nombre ?? null,
        estado: p.estado,
        fechaInicio: p.fecha_inicio,
        fechaFin: p.fecha_fin,
        descripcion: p.descripcion,
        resultados: p.resultados,
        contacto: incluirContacto === true ? p.contacto_referencia : null,
        etiquetas: (p.proyecto_etiquetas ?? []).map((pe) => pe.etiqueta.nombre).sort(),
        evidencias: p.evidencias.map((e) => ({
          tipo: e.tipo,
          descripcion: e.descripcion,
          nombre: e.nombre_original,
          ...(conEvidencias && { url: urls.get(e.ruta_archivo) ?? null, tamano: e.tamano_bytes }),
        })),
      }
    })

    return responder({ proyectos })
  }),
)
