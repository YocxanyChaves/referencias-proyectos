// Utilidades compartidas por las Edge Functions de evidencias.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'

export const BUCKET = 'evidencias'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

export class ErrorHttp extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje)
  }
}

// Cliente con privilegios de servidor. Nunca sale de la función.
export function clienteServidor(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Cliente que actúa como el usuario que llama: las políticas RLS se aplican igual que en la app.
export function clienteUsuario(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type Perfil = { id: string; rol: 'admin' | 'editor' | 'consulta'; pais_id: number | null }

// Valida el token de la sesión y devuelve el perfil activo de quien llama.
export async function usuarioActivo(req: Request, servidor: SupabaseClient): Promise<Perfil> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new ErrorHttp(401, 'Falta la sesión.')

  const { data, error } = await servidor.auth.getUser(token)
  if (error || !data.user) throw new ErrorHttp(401, 'La sesión no es válida o expiró.')

  const { data: perfil } = await servidor
    .from('usuarios')
    .select('id, rol, pais_id, activo')
    .eq('id', data.user.id)
    .maybeSingle()
  if (!perfil?.activo) throw new ErrorHttp(403, 'Tu usuario no está activo.')
  return perfil
}

export async function manejar(req: Request, accion: (req: Request) => Promise<Response>) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder({ error: 'Método no permitido.' }, 405)
  try {
    return await accion(req)
  } catch (e) {
    if (e instanceof ErrorHttp) return responder({ error: e.message }, e.estado)
    console.error(e)
    return responder({ error: 'Error interno.' }, 500)
  }
}
