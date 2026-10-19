// Proyectos elegidos para exportar. Se comparte entre la búsqueda, la página de exportación
// y el menú, y se recuerda durante la sesión (sobrevive a recargas y a cambiar de filtros).
import { useSyncExternalStore } from 'react'

export const MAX_SELECCION = 100 // igual al límite de la Edge Function exportar-referencias
const CLAVE = 'seleccion-exportacion'
const oyentes = new Set()

function leer() {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(CLAVE))
    return Array.isArray(guardada) ? guardada : []
  } catch {
    return []
  }
}

let seleccion = leer()

function guardar(nueva) {
  seleccion = nueva
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(nueva))
  } catch {
    // sin almacenamiento: la selección dura mientras la página esté abierta
  }
  oyentes.forEach((oyente) => oyente())
}

function suscribir(oyente) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

// Cada elemento: { id, titulo, cliente, pais } (lo necesario para listarlo sin volver a consultar).
export function useSeleccion() {
  return useSyncExternalStore(suscribir, () => seleccion)
}

const resumen = (p) => ({ id: p.id, titulo: p.titulo, cliente: p.cliente, pais: p.pais?.nombre ?? p.pais ?? null })

// Agrega los que falten, hasta el máximo. Devuelve cuántos quedaron fuera por el límite.
export function agregar(proyectos) {
  const ids = new Set(seleccion.map((p) => p.id))
  const nuevos = proyectos.filter((p) => !ids.has(p.id)).map(resumen)
  const cupo = Math.max(0, MAX_SELECCION - seleccion.length)
  guardar([...seleccion, ...nuevos.slice(0, cupo)])
  return Math.max(0, nuevos.length - cupo)
}

export function quitar(ids) {
  const fuera = new Set(ids)
  guardar(seleccion.filter((p) => !fuera.has(p.id)))
}

export function mover(id, desplazamiento) {
  const i = seleccion.findIndex((p) => p.id === id)
  const j = i + desplazamiento
  if (i < 0 || j < 0 || j >= seleccion.length) return
  const nueva = [...seleccion]
  ;[nueva[i], nueva[j]] = [nueva[j], nueva[i]]
  guardar(nueva)
}

export function vaciar() {
  guardar([])
}
