// Entrega una evidencia: valida el permiso, registra la descarga y devuelve
// una URL firmada que vence en 60 segundos. Es la única forma de bajar archivos.
import {
  BUCKET,
  ErrorHttp,
  clienteServidor,
  clienteUsuario,
  manejar,
  responder,
  usuarioActivo,
} from '../_compartido/comun.ts'

const VIGENCIA_SEGUNDOS = 60
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve((req) =>
  manejar(req, async (req) => {
    const { evidenciaId } = await req.json().catch(() => ({}))
    if (typeof evidenciaId !== 'string' || !UUID.test(evidenciaId)) {
      throw new ErrorHttp(400, 'Falta un evidenciaId válido.')
    }

    const servidor = clienteServidor()
    const usuario = await usuarioActivo(req, servidor)

    // La lectura se hace como el usuario: si las políticas RLS no le dejan ver la
    // evidencia (p. ej. consulta y no compartible), aquí no aparece.
    const { data: evidencia } = await clienteUsuario(req)
      .from('evidencias')
      .select('id, proyecto_id, ruta_archivo, nombre_original')
      .eq('id', evidenciaId)
      .maybeSingle()
    if (!evidencia) throw new ErrorHttp(404, 'La evidencia no existe o no tienes acceso a ella.')

    // Primero se registra; si el registro falla, no se entrega el archivo.
    const { error: errorRegistro } = await servidor.from('descargas').insert({
      usuario_id: usuario.id,
      proyecto_id: evidencia.proyecto_id,
      evidencia_id: evidencia.id,
    })
    if (errorRegistro) {
      console.error(errorRegistro)
      throw new ErrorHttp(500, 'No se pudo registrar la descarga.')
    }

    const { data: firmada, error: errorFirma } = await servidor.storage
      .from(BUCKET)
      .createSignedUrl(evidencia.ruta_archivo, VIGENCIA_SEGUNDOS, {
        download: evidencia.nombre_original,
      })
    if (errorFirma || !firmada) {
      console.error(errorFirma)
      throw new ErrorHttp(500, 'No se pudo preparar el archivo.')
    }

    return responder({ url: firmada.signedUrl, nombre: evidencia.nombre_original })
  }),
)
