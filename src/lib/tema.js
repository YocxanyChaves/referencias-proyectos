// Tema claro u oscuro. Se recuerda en este navegador (es una preferencia de quien lo usa,
// no del usuario en la base de datos). Se aplica como atributo data-tema en <html>.
import { useSyncExternalStore } from 'react'

const CLAVE = 'tema'
const oyentes = new Set()

function leer() {
  try {
    return localStorage.getItem(CLAVE) === 'oscuro' ? 'oscuro' : 'claro'
  } catch {
    return 'claro'
  }
}

let tema = leer()

// Se llama antes de pintar la app para que no parpadee el tema claro.
export function aplicarTema() {
  document.documentElement.dataset.tema = tema
}

export function cambiarTema(nuevo) {
  tema = nuevo
  try {
    localStorage.setItem(CLAVE, nuevo)
  } catch {
    // sin almacenamiento: el tema dura mientras la página esté abierta
  }
  aplicarTema()
  oyentes.forEach((oyente) => oyente())
}

function suscribir(oyente) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function useTema() {
  return useSyncExternalStore(suscribir, () => tema)
}
