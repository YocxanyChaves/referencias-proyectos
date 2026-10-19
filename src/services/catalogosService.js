import { supabase, unwrap } from './supabaseClient'

export async function listarPaises() {
  return unwrap(await supabase.from('paises').select('id, nombre, codigo').order('nombre'))
}

export async function listarEtiquetas() {
  return unwrap(await supabase.from('etiquetas').select('id, nombre').order('nombre'))
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
