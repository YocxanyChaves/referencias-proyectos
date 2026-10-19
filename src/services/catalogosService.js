import { supabase, unwrap } from './supabaseClient'

export async function listarPaises() {
  return unwrap(await supabase.from('paises').select('id, nombre, codigo').order('nombre'))
}

export async function listarEtiquetas() {
  return unwrap(await supabase.from('etiquetas').select('id, nombre').order('nombre'))
}

// Administración de catálogos (solo admin; lo hacen cumplir las políticas RLS).
// Incluyen cuántos registros usan cada elemento, porque lo que está en uso no se puede borrar.
export async function listarEtiquetasConUso() {
  const filas = unwrap(
    await supabase.from('etiquetas').select('id, nombre, proyecto_etiquetas(count)').order('nombre'),
  )
  return filas.map((e) => ({ id: e.id, nombre: e.nombre, proyectos: e.proyecto_etiquetas[0]?.count ?? 0 }))
}

export async function listarPaisesConUso() {
  const filas = unwrap(
    await supabase
      .from('paises')
      .select('id, nombre, codigo, proyectos(count), usuarios(count)')
      .order('nombre'),
  )
  return filas.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo,
    proyectos: p.proyectos[0]?.count ?? 0,
    usuarios: p.usuarios[0]?.count ?? 0,
  }))
}

// Traduce los errores de catálogo más comunes (nombre repetido, elemento en uso).
function unwrapCatalogo(respuesta, mensaje) {
  if (['23505', '23503'].includes(respuesta.error?.code)) throw new Error(mensaje)
  return unwrap(respuesta)
}

export async function guardarEtiqueta({ id, nombre }) {
  const fila = { nombre: nombre.trim() }
  const consulta = id
    ? supabase.from('etiquetas').update(fila).eq('id', id)
    : supabase.from('etiquetas').insert(fila)
  unwrapCatalogo(await consulta.select('id').single(), 'Ya existe una etiqueta con ese nombre.')
}

export async function eliminarEtiqueta(id) {
  unwrapCatalogo(await supabase.from('etiquetas').delete().eq('id', id).select('id').single(), 'No se puede eliminar: hay proyectos con esta etiqueta.')
}

export async function guardarPais({ id, nombre, codigo }) {
  const fila = { nombre: nombre.trim(), codigo: codigo.trim().toUpperCase() }
  const consulta = id ? supabase.from('paises').update(fila).eq('id', id) : supabase.from('paises').insert(fila)
  unwrapCatalogo(await consulta.select('id').single(), 'Ya existe un país con ese nombre o código.')
}

export async function eliminarPais(id) {
  unwrapCatalogo(await supabase.from('paises').delete().eq('id', id).select('id').single(), 'No se puede eliminar: hay proyectos o usuarios de este país.')
}

export const TIPOS_EVIDENCIA = [
  { valor: 'acta_recepcion', nombre: 'Acta de recepción' },
  { valor: 'carta_referencia', nombre: 'Carta de referencia' },
  { valor: 'contrato', nombre: 'Contrato' },
  { valor: 'informe', nombre: 'Informe' },
  { valor: 'foto', nombre: 'Fotografía' },
  { valor: 'otro', nombre: 'Otro' },
]

export const ESTADOS_PROYECTO = [
  { valor: 'finalizado', nombre: 'Finalizado' },
  { valor: 'en_curso', nombre: 'En curso' },
]
