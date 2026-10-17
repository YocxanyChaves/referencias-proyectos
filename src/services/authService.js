import { hashInicial, supabase, unwrap } from './supabaseClient'

// Marca de "falta crear contraseña". Se guarda en sessionStorage para que sobreviva
// a una recarga, ya que el hash del enlace se consume al iniciar.
const CLAVE_PENDIENTE = 'crear-contrasena-pendiente'
const vieneDeEnlace = ['invite', 'recovery'].includes(hashInicial.get('type'))

function marcarPendiente(pendiente) {
  try {
    if (pendiente) sessionStorage.setItem(CLAVE_PENDIENTE, '1')
    else sessionStorage.removeItem(CLAVE_PENDIENTE)
  } catch {
    // sin almacenamiento disponible: solo vale el hash de esta carga
  }
}

function hayPendiente() {
  try {
    return sessionStorage.getItem(CLAVE_PENDIENTE) === '1'
  } catch {
    return vieneDeEnlace
  }
}

if (vieneDeEnlace) marcarPendiente(true)

// Indica si el usuario llegó por un enlace de invitación o recuperación y aún debe
// crear su contraseña, y el error del enlace si lo hubo (p. ej. expirado).
export function estadoEnlaceContrasena() {
  const descripcionError = hashInicial.get('error_description')
  return {
    pendiente: hayPendiente(),
    error: !descripcionError
      ? null
      : hashInicial.get('error_code') === 'otp_expired'
        ? 'El enlace expiró o ya fue usado. Pide uno nuevo desde la pantalla de inicio de sesión.'
        : descripcionError,
  }
}

export async function crearContrasena(password) {
  unwrap(await supabase.auth.updateUser({ password }))
  marcarPendiente(false)
}

// Envía un correo con un enlace para crear una contraseña nueva.
export async function enviarRecuperacion(email) {
  unwrap(
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/crear-contrasena`,
    }),
  )
}

export async function iniciarSesion(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message,
    )
  }
}

export async function cerrarSesion() {
  marcarPendiente(false)
  unwrap(await supabase.auth.signOut())
}

// Devuelve el id del usuario autenticado, o null.
export async function obtenerUsuarioActualId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

// Notifica cambios de sesión con el id del usuario (o null). Devuelve la función para cancelar.
export function escucharSesion(callback) {
  const { data } = supabase.auth.onAuthStateChange((_evento, session) => {
    callback(session?.user.id ?? null)
  })
  return () => data.subscription.unsubscribe()
}

// Perfil de la aplicación (tabla usuarios): rol, país y estado.
export async function obtenerPerfil(usuarioId) {
  const fila = unwrap(
    await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, activo, pais_id, pais:paises(nombre)')
      .eq('id', usuarioId)
      .maybeSingle(),
  )
  if (!fila) return null
  return {
    id: fila.id,
    email: fila.email,
    nombre: fila.nombre,
    rol: fila.rol,
    activo: fila.activo,
    paisId: fila.pais_id,
    paisNombre: fila.pais?.nombre ?? null,
  }
}
