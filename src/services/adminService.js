import { invocar, supabase, unwrap } from './supabaseClient'

export const ROLES = [
  { valor: 'admin', nombre: 'Administrador' },
  { valor: 'editor', nombre: 'Editor' },
  { valor: 'consulta', nombre: 'Consulta' },
]

// Usuarios con su último acceso y si la invitación sigue pendiente (función listar_usuarios, solo admin).
export async function listarUsuarios() {
  const filas = unwrap(await supabase.rpc('listar_usuarios'))
  return filas.map((u) => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    paisId: u.pais_id,
    activo: u.activo,
    creadoEn: u.creado_en,
    ultimoAcceso: u.ultimo_acceso,
    invitacionPendiente: u.invitacion_pendiente,
  }))
}

// La base impide que un admin cambie su propio rol o se desactive, y que quede sin admins activos.
export async function actualizarUsuario(id, { nombre, rol, paisId, activo }) {
  unwrap(
    await supabase
      .from('usuarios')
      .update({ nombre: nombre.trim(), rol, pais_id: paisId, activo })
      .eq('id', id)
      .select('id')
      .single(),
  )
}

// Envía (o reenvía, si sigue pendiente) la invitación por correo. El enlace lleva a /crear-contrasena.
export async function invitarUsuario({ email, nombre, rol, paisId }) {
  return invocar('invitar-usuario', {
    email,
    nombre,
    rol,
    paisId,
    redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}crear-contrasena`,
  })
}

// Bitácora de descargas de evidencias y exportaciones de fichas, de la más reciente a la más antigua.
// `desde` y `hasta` son fechas (AAAA-MM-DD) en hora local; `hasta` incluye todo ese día.
export async function listarDescargas(
  { usuarioId = '', tipo = '', desde = '', hasta = '' } = {},
  { pagina = 0, tamano = 50 } = {},
) {
  let consulta = supabase
    .from('descargas')
    .select(
      `id, fecha, tipo, formato,
       usuario:usuarios(id, nombre, email),
       proyecto:proyectos(id, titulo),
       evidencia:evidencias(id, nombre_original)`,
      { count: 'exact' },
    )
    .order('fecha', { ascending: false })
    .range(pagina * tamano, pagina * tamano + tamano - 1)

  if (usuarioId) consulta = consulta.eq('usuario_id', usuarioId)
  if (tipo) consulta = consulta.eq('tipo', tipo)
  if (desde) consulta = consulta.gte('fecha', new Date(`${desde}T00:00`).toISOString())
  if (hasta) {
    const fin = new Date(`${hasta}T00:00`)
    fin.setDate(fin.getDate() + 1)
    consulta = consulta.lt('fecha', fin.toISOString())
  }

  const { data, error, count } = await consulta
  const filas = unwrap({ data, error })
  return {
    total: count ?? 0,
    hayMas: (pagina + 1) * tamano < (count ?? 0),
    descargas: filas.map((d) => ({
      id: d.id,
      fecha: d.fecha,
      tipo: d.tipo, // 'evidencia' | 'exportacion'
      formato: d.formato, // en exportaciones: 'pdf' | 'excel'
      usuario: d.usuario,
      proyecto: d.proyecto, // null si el proyecto se eliminó
      evidencia: d.evidencia, // null si la evidencia se quitó
    })),
  }
}
