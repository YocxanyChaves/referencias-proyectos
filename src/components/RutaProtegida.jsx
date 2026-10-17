import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaProtegida({ requiereCrear = false }) {
  const { usuarioId, perfil, rol, cargando, errorPerfil, puedeCrear, contrasenaPendiente, cerrarSesion } =
    useAuth()

  if (cargando) return <p className="centrado">Cargando…</p>
  if (!usuarioId) return <Navigate to="/login" replace />
  if (contrasenaPendiente) return <Navigate to="/crear-contrasena" replace />

  if (errorPerfil || !rol) {
    return (
      <div className="centrado tarjeta">
        <p>
          {errorPerfil
            ? `No se pudo cargar tu perfil: ${errorPerfil}`
            : perfil
              ? 'Tu usuario está inactivo. Contacta a un administrador.'
              : 'Tu usuario no tiene perfil en el sistema. Contacta a un administrador.'}
        </p>
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </div>
    )
  }

  if (requiereCrear && !puedeCrear) return <Navigate to="/" replace />
  return <Outlet />
}
