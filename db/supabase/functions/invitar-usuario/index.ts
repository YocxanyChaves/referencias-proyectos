// Invita a una persona por correo y le asigna rol y país. Solo admin.
// Supabase envía el enlace; al abrirlo, la persona llega a /crear-contrasena.
// Si la invitación sigue pendiente, llamar de nuevo reenvía el correo y actualiza rol y país.
import { ErrorHttp, clienteServidor, manejar, responder, usuarioActivo } from '../_compartido/comun.ts'

const ROLES = ['admin', 'editor', 'consulta']
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve((req) =>
  manejar(req, async (req) => {
    const cuerpo = await req.json().catch(() => ({}))
    const email = typeof cuerpo.email === 'string' ? cuerpo.email.trim().toLowerCase() : ''
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : ''
    const { rol, paisId, redirectTo } = cuerpo

    if (!CORREO.test(email)) throw new ErrorHttp(400, 'El correo no es válido.')
    if (!nombre || nombre.length > 120) throw new ErrorHttp(400, 'Falta el nombre (máximo 120 caracteres).')
    if (!ROLES.includes(rol)) throw new ErrorHttp(400, 'El rol no es válido.')
    if (paisId != null && !Number.isInteger(paisId)) throw new ErrorHttp(400, 'El país no es válido.')
    if (rol === 'editor' && paisId == null) throw new ErrorHttp(400, 'Un editor debe tener país.')

    const servidor = clienteServidor()
    const usuario = await usuarioActivo(req, servidor)
    if (usuario.rol !== 'admin') throw new ErrorHttp(403, 'Solo un administrador puede invitar usuarios.')

    if (paisId != null) {
      const { data: pais } = await servidor.from('paises').select('id').eq('id', paisId).maybeSingle()
      if (!pais) throw new ErrorHttp(400, 'El país no existe.')
    }

    // Supabase solo acepta redirectTo si está en las Redirect URLs del proyecto; si no, usa la Site URL.
    const { data, error } = await servidor.auth.admin.inviteUserByEmail(email, {
      data: { nombre },
      redirectTo: typeof redirectTo === 'string' ? redirectTo : undefined,
    })
    if (error) {
      if (error.code === 'email_exists' || error.status === 422) {
        throw new ErrorHttp(409, 'Ese correo ya tiene una cuenta activa. Si olvidó la contraseña, puede recuperarla desde el inicio de sesión.')
      }
      if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
        throw new ErrorHttp(429, 'Se alcanzó el límite de correos de Supabase. Espera un rato o configura un SMTP propio.')
      }
      console.error(error)
      throw new ErrorHttp(500, 'No se pudo enviar la invitación.')
    }

    // La fila en usuarios la crea el trigger de Auth con rol consulta; aquí se completa.
    const nuevo = data.user
    const { error: errorPerfil } = await servidor
      .from('usuarios')
      .update({ nombre, rol, pais_id: paisId ?? null })
      .eq('id', nuevo.id)
    if (errorPerfil) {
      console.error(errorPerfil)
      // Sin perfil correcto no se deja la cuenta a medias. Nunca abrió el enlace, así que no
      // tiene datos ni descargas: se anula y el admin puede invitarla de nuevo.
      if (!nuevo.email_confirmed_at) {
        await servidor.auth.admin.deleteUser(nuevo.id).catch(console.error)
      }
      throw new ErrorHttp(500, 'No se pudo asignar el rol. La invitación se anuló; inténtalo de nuevo.')
    }

    return responder({ id: nuevo.id, email })
  }),
)
