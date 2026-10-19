// Único punto de contacto con el SDK de Supabase.
// Ningún archivo fuera de src/services/ debe importar este módulo.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env')
}

// Los enlaces de invitación y recuperación llegan con los datos en el hash de la URL
// (#access_token=...&type=invite). El cliente lo consume y lo borra al iniciar,
// así que se lee antes de crearlo.
export const hashInicial = new URLSearchParams(window.location.hash.slice(1))

export const supabase = createClient(url, key)

// Llama a una Edge Function y devuelve su respuesta, o lanza el mensaje de error que envió.
export async function invocar(funcion, cuerpo) {
  const { data, error } = await supabase.functions.invoke(funcion, { body: cuerpo })
  if (error) {
    const detalle = await error.context?.json?.().catch(() => null)
    throw new Error(detalle?.error ?? error.message)
  }
  return data
}

// Convierte la respuesta de Supabase en datos o en una excepción con mensaje legible.
export function unwrap({ data, error }) {
  if (error) {
    const sinPermiso = error.code === '42501' || /row-level security|row level security/i.test(error.message)
    if (!sinPermiso) throw new Error(error.message)
    const fila = /^Fila \d+: /.exec(error.message)?.[0] ?? '' // importación masiva
    throw new Error(`${fila}No tienes permiso para realizar esta acción.`)
  }
  return data
}
