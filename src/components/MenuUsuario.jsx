import { KeyRound, Mail, MapPin, Moon, ShieldCheck, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { REQUISITOS_CONTRASENA } from '../lib/contrasena'
import { cambiarTema, useTema } from '../lib/tema'

export const NOMBRES_ROL = { admin: 'Administrador', editor: 'Editor', consulta: 'Consulta' }

function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase() || '?'
}

function CambiarContrasena({ onCerrar }) {
  const { crearContrasena } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState(null)
  const [listo, setListo] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    if (!REQUISITOS_CONTRASENA.every((r) => r.cumple(password))) {
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
      setListo(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (listo) {
    return (
      <div className="menu-contrasena">
        <p className="menu-exito">Contraseña actualizada.</p>
        <button type="button" className="menu-boton" onClick={onCerrar}>
          Listo
        </button>
      </div>
    )
  }

  return (
    <form className="menu-contrasena" onSubmit={enviar}>
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
        {REQUISITOS_CONTRASENA.map((r) => {
          const ok = r.cumple(password)
          return (
            <li key={r.texto} className={ok ? 'cumple' : undefined}>
              <span aria-hidden="true">{ok ? '✓' : '○'}</span> {r.texto}
              <span className="oculto">{ok ? ' (cumplido)' : ' (pendiente)'}</span>
            </li>
          )
        })}
      </ul>
      {error && <p className="menu-error">{error}</p>}
      <div className="menu-acciones">
        <button type="button" className="menu-boton secundario" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="submit" className="menu-boton" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// La bolita con las iniciales abre la configuración de la cuenta: datos, tema y contraseña.
export default function MenuUsuario() {
  const { perfil, rol } = useAuth()
  const tema = useTema()
  const [abierto, setAbierto] = useState(false)
  const [cambiandoContrasena, setCambiandoContrasena] = useState(false)
  const contenedor = useRef(null)
  const boton = useRef(null)

  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => {
      if (!contenedor.current?.contains(e.target)) setAbierto(false)
    }
    const tecla = (e) => {
      if (e.key === 'Escape') {
        setAbierto(false)
        boton.current?.focus()
      }
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  function alternar() {
    setAbierto((a) => !a)
    setCambiandoContrasena(false)
  }

  return (
    <div className="menu-usuario" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className={abierto ? 'usuario-avatar abierto' : 'usuario-avatar'}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        title="Mi cuenta"
        onClick={alternar}
      >
        {iniciales(perfil.nombre)}
      </button>

      {abierto && (
        <div className="menu-desplegable" role="dialog" aria-label="Mi cuenta">
          <div className="menu-perfil">
            <span className="menu-avatar" aria-hidden="true">
              {iniciales(perfil.nombre)}
            </span>
            <div className="menu-perfil-datos">
              <strong>{perfil.nombre}</strong>
              <span className="menu-rol">{NOMBRES_ROL[rol]}</span>
            </div>
          </div>
          <ul className="menu-datos">
            <li>
              <Mail aria-hidden="true" />
              <span>{perfil.email}</span>
            </li>
            <li>
              <MapPin aria-hidden="true" />
              <span>{perfil.paisNombre ?? 'Todos los países'}</span>
            </li>
          </ul>

          <div className="menu-seccion">
            <span className="menu-rotulo">Apariencia</span>
            <div className="menu-segmentos">
              <button type="button" aria-pressed={tema === 'claro'} onClick={() => cambiarTema('claro')}>
                <Sun aria-hidden="true" />
                Claro
              </button>
              <button type="button" aria-pressed={tema === 'oscuro'} onClick={() => cambiarTema('oscuro')}>
                <Moon aria-hidden="true" />
                Oscuro
              </button>
            </div>
          </div>

          <div className="menu-seccion">
            <span className="menu-rotulo">Seguridad</span>
            {cambiandoContrasena ? (
              <CambiarContrasena onCerrar={() => setCambiandoContrasena(false)} />
            ) : (
              <button type="button" className="menu-opcion" onClick={() => setCambiandoContrasena(true)}>
                <KeyRound aria-hidden="true" />
                Cambiar contraseña
              </button>
            )}
          </div>

          <p className="menu-pie">
            <ShieldCheck aria-hidden="true" />
            El rol y el país los asigna un administrador.
          </p>
        </div>
      )}
    </div>
  )
}
