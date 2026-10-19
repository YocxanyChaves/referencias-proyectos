import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { enviarRecuperacion, iniciarSesion } from '../services/authService'

export default function LoginPage() {
  const { usuarioId, errorEnlace } = useAuth()
  const [modo, setModo] = useState('ingresar') // 'ingresar' | 'recuperar'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(errorEnlace)
  const [aviso, setAviso] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (usuarioId) return <Navigate to="/" replace />

  function cambiarModo(nuevo) {
    setModo(nuevo)
    setError(null)
    setAviso(null)
  }

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    setEnviando(true)
    try {
      if (modo === 'ingresar') {
        await iniciarSesion(email.trim(), password)
      } else {
        await enviarRecuperacion(email.trim())
        setAviso('Si el correo está registrado, recibirás un enlace para crear una contraseña nueva.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="tarjeta login" onSubmit={enviar}>
      <h1>Referencias de Proyectos</h1>
      {modo === 'recuperar' && (
        <p className="ayuda">Te enviaremos un enlace para crear una contraseña nueva.</p>
      )}
      <label>
        Correo electrónico
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </label>
      {modo === 'ingresar' && (
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
      )}
      {error && <p className="error">{error}</p>}
      {aviso && <p className="exito">{aviso}</p>}
      <button type="submit" disabled={enviando}>
        {modo === 'ingresar'
          ? enviando ? 'Ingresando…' : 'Ingresar'
          : enviando ? 'Enviando…' : 'Enviar enlace'}
      </button>
      <button
        type="button"
        className="enlace"
        onClick={() => cambiarModo(modo === 'ingresar' ? 'recuperar' : 'ingresar')}
      >
        {modo === 'ingresar' ? '¿Olvidaste tu contraseña?' : 'Volver a iniciar sesión'}
      </button>
    </form>
  )
}
