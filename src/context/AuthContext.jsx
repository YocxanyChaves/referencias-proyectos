import { createContext, useContext, useEffect, useState } from 'react'
import {
  cerrarSesion,
  crearContrasena,
  escucharSesion,
  estadoEnlaceContrasena,
  obtenerPerfil,
  obtenerUsuarioActualId,
} from '../services/authService'

const AuthContext = createContext(null)
const enlace = estadoEnlaceContrasena()

export function AuthProvider({ children }) {
  const [usuarioId, setUsuarioId] = useState(undefined) // undefined = aún no se sabe
  const [perfil, setPerfil] = useState(null)
  const [perfilDe, setPerfilDe] = useState(null) // usuario al que corresponde el perfil cargado
  const [errorPerfil, setErrorPerfil] = useState(null)
  const [contrasenaPendiente, setContrasenaPendiente] = useState(enlace.pendiente)

  useEffect(() => {
    obtenerUsuarioActualId().then(setUsuarioId)
    return escucharSesion(setUsuarioId)
  }, [])

  // El perfil se carga aparte del listener de sesión para no llamar a la API dentro del callback.
  useEffect(() => {
    if (!usuarioId) {
      setPerfil(null)
      setPerfilDe(null)
      return
    }
    let cancelado = false
    setErrorPerfil(null)
    obtenerPerfil(usuarioId)
      .then((p) => !cancelado && setPerfil(p))
      .catch((e) => !cancelado && setErrorPerfil(e.message))
      .finally(() => !cancelado && setPerfilDe(usuarioId))
    return () => {
      cancelado = true
    }
  }, [usuarioId])

  const rol = perfil?.activo ? perfil.rol : null
  const valor = {
    usuarioId,
    perfil,
    rol,
    cargando: usuarioId === undefined || (usuarioId !== null && perfilDe !== usuarioId),
    errorPerfil,
    puedeCrear: rol === 'admin' || (rol === 'editor' && perfil?.paisId != null),
    // Misma regla que privado.puede_editar_proyecto; la base de datos es quien la hace cumplir.
    puedeEditarPais: (paisId) => rol === 'admin' || (rol === 'editor' && paisId === perfil?.paisId),
    // Tras editar el propio usuario en Administración, para que el encabezado muestre lo nuevo.
    recargarPerfil: () => usuarioId && obtenerPerfil(usuarioId).then(setPerfil),
    contrasenaPendiente,
    errorEnlace: enlace.error,
    crearContrasena: async (password) => {
      await crearContrasena(password)
      setContrasenaPendiente(false)
    },
    cerrarSesion: async () => {
      setContrasenaPendiente(false)
      await cerrarSesion()
    },
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
