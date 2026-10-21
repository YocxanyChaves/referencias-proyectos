import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import PantallaAcceso from '../components/PantallaAcceso'
import { useAuth } from '../context/AuthContext'

// Mismos requisitos que la configuración de contraseñas de Supabase (Authentication → Policies).
const REQUISITOS = [
  { texto: 'Al menos 8 caracteres', cumple: (p) => p.length >= 8 },
  { texto: 'Una letra minúscula', cumple: (p) => /[a-z]/.test(p) },
  { texto: 'Una letra mayúscula', cumple: (p) => /[A-Z]/.test(p) },
  { texto: 'Un número', cumple: (p) => /[0-9]/.test(p) },
]

// Pantalla a la que llegan los enlaces de invitación y de recuperación de contraseña.
export default function CrearContrasenaPage() {
  const { usuarioId, cargando, contrasenaPendiente, errorEnlace, crearContrasena } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <p className="centrado">Cargando…</p>

  // Sin sesión: el enlace no es válido (expiró, ya se usó o se abrió en otro navegador).
  if (!usuarioId) {
    return (
      <PantallaAcceso titulo="Crear contraseña">
        <div className="login">
          <p className="error">
            {errorEnlace ?? 'Abre esta página desde el enlace que recibiste por correo.'}
          </p>
          <Link to="/login" className="boton">
            Ir a iniciar sesión
          </Link>
        </div>
      </PantallaAcceso>
    )
  }

  if (!contrasenaPendiente) return <Navigate to="/" replace />

  async function enviar(e) {
    e.preventDefault()
    if (!REQUISITOS.every((r) => r.cumple(password))) {
      setError('La contraseña todavía no cumple todos los requisitos.')
      return
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await crearContrasena(password)
      navigate('/', { replace: true, state: { mensaje: 'Contraseña creada. ¡Bienvenido/a!' } })
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <PantallaAcceso titulo="Crear contraseña" subtitulo="Elige la contraseña con la que vas a iniciar sesión.">
      <form className="login" onSubmit={enviar}>
        <label>
          Nueva contraseña
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Confirmar contraseña
          <input
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            required
          />
        </label>
        <ul className="requisitos" aria-label="Requisitos de la contraseña">
          {REQUISITOS.map((r) => {
            const ok = r.cumple(password)
            return (
              <li key={r.texto} className={ok ? 'cumple' : undefined}>
                <span aria-hidden="true">{ok ? '✓' : '○'}</span> {r.texto}
                <span className="oculto">{ok ? ' (cumplido)' : ' (pendiente)'}</span>
              </li>
            )
          })}
          <li className={confirmacion && confirmacion === password ? 'cumple' : undefined}>
            <span aria-hidden="true">{confirmacion && confirmacion === password ? '✓' : '○'}</span> Las dos
            contraseñas coinciden
          </li>
        </ul>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </PantallaAcceso>
  )
}
