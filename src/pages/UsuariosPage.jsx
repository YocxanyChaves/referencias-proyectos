import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ROLES, actualizarUsuario, invitarUsuario, listarUsuarios } from '../services/adminService'
import { listarPaises } from '../services/catalogosService'

const INVITACION_VACIA = { email: '', nombre: '', rol: 'consulta', paisId: '' }

function formatearFechaHora(valor) {
  if (!valor) return 'Nunca'
  return new Date(valor).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })
}

function SelectorPais({ paises, valor, onChange, disabled }) {
  return (
    <select
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={disabled}
    >
      <option value="">Sin país</option>
      {paises.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nombre}
        </option>
      ))}
    </select>
  )
}

function FormularioInvitacion({ paises, onInvitado }) {
  const [datos, setDatos] = useState(INVITACION_VACIA)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    if (datos.rol === 'editor' && !datos.paisId) {
      setError('Un editor debe tener país: solo edita los proyectos de ese país.')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await invitarUsuario({
        email: datos.email.trim(),
        nombre: datos.nombre.trim(),
        rol: datos.rol,
        paisId: datos.paisId ? Number(datos.paisId) : null,
      })
      onInvitado(`Invitación enviada a ${datos.email.trim()}.`)
      setDatos(INVITACION_VACIA)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="tarjeta invitar" onSubmit={enviar}>
      <h2>Invitar usuario</h2>
      <div className="invitar-campos">
        <label>
          Correo
          <input type="email" value={datos.email} onChange={cambiar('email')} required />
        </label>
        <label>
          Nombre
          <input value={datos.nombre} onChange={cambiar('nombre')} maxLength={120} required />
        </label>
        <label>
          Rol
          <select value={datos.rol} onChange={cambiar('rol')}>
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          País
          <select value={datos.paisId} onChange={cambiar('paisId')} required={datos.rol === 'editor'}>
            <option value="">{datos.rol === 'editor' ? 'Elige un país' : 'Sin país'}</option>
            {paises.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar invitación'}
        </button>
      </div>
      <p className="ayuda">
        Le llega un correo con un enlace para crear su contraseña. El correo integrado de Supabase envía muy
        pocos mensajes por hora; para invitar a varias personas hace falta un SMTP propio.
      </p>
      {error && <p className="error">{error}</p>}
    </form>
  )
}

export default function UsuariosPage() {
  const { usuarioId, recargarPerfil } = useAuth()
  const [usuarios, setUsuarios] = useState(null)
  const [paises, setPaises] = useState([])
  const [borradores, setBorradores] = useState({}) // id → cambios sin guardar
  const [ocupado, setOcupado] = useState(null) // id del usuario en curso
  const [texto, setTexto] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)

  async function cargar() {
    try {
      setUsuarios(await listarUsuarios())
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    cargar()
    listarPaises()
      .then(setPaises)
      .catch((e) => setError(e.message))
  }, [])

  const valores = (u) => ({ ...u, ...borradores[u.id] })
  const editar = (id, campo, valor) =>
    setBorradores((b) => ({ ...b, [id]: { ...b[id], [campo]: valor } }))

  async function guardar(u, cambios = {}) {
    const v = { ...valores(u), ...cambios }
    if (!v.nombre.trim()) return setError(`${u.email}: el nombre no puede quedar vacío.`)
    if (v.rol === 'editor' && v.paisId == null) return setError(`${u.email}: un editor debe tener país.`)
    setOcupado(u.id)
    setError(null)
    setMensaje(null)
    try {
      await actualizarUsuario(u.id, v)
      setBorradores(({ [u.id]: _, ...resto }) => resto)
      setMensaje(`Se guardaron los cambios de ${v.nombre.trim()}.`)
      await cargar()
      if (u.id === usuarioId) await recargarPerfil()
    } catch (e) {
      setError(`${u.email}: ${e.message}`)
    } finally {
      setOcupado(null)
    }
  }

  async function reenviar(u) {
    setOcupado(u.id)
    setError(null)
    setMensaje(null)
    try {
      await invitarUsuario({ email: u.email, nombre: u.nombre, rol: u.rol, paisId: u.paisId })
      setMensaje(`Invitación reenviada a ${u.email}.`)
    } catch (e) {
      setError(`${u.email}: ${e.message}`)
    } finally {
      setOcupado(null)
    }
  }

  async function alInvitar(texto) {
    setError(null)
    setMensaje(texto)
    await cargar()
  }

  const filtro = texto.trim().toLowerCase()
  const visibles = (usuarios ?? []).filter(
    (u) => !filtro || u.nombre.toLowerCase().includes(filtro) || u.email.toLowerCase().includes(filtro),
  )

  return (
    <div className="admin-seccion">
      <FormularioInvitacion paises={paises} onInvitado={alInvitar} />

      {mensaje && <p className="exito">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      <div className="titulo-seccion">
        <h1>Usuarios</h1>
        <input
          type="search"
          className="buscar-admin"
          placeholder="Buscar por nombre o correo"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      {usuarios === null ? (
        <p className="centrado">Cargando…</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla tabla-usuarios">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>País</th>
                <th>Estado</th>
                <th>Último acceso</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => {
                const v = valores(u)
                const propio = u.id === usuarioId
                const conCambios = borradores[u.id] != null
                return (
                  <tr key={u.id} className={u.activo ? undefined : 'inactivo'}>
                    <td>
                      <input
                        value={v.nombre}
                        onChange={(e) => editar(u.id, 'nombre', e.target.value)}
                        maxLength={120}
                        aria-label={`Nombre de ${u.email}`}
                      />
                      <span className="meta">
                        {u.email}
                        {propio && ' · tú'}
                      </span>
                    </td>
                    <td>
                      <select
                        value={v.rol}
                        onChange={(e) => editar(u.id, 'rol', e.target.value)}
                        disabled={propio}
                        title={propio ? 'No puedes cambiar tu propio rol.' : undefined}
                        aria-label={`Rol de ${u.email}`}
                      >
                        {ROLES.map((r) => (
                          <option key={r.valor} value={r.valor}>
                            {r.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <SelectorPais paises={paises} valor={v.paisId} onChange={(p) => editar(u.id, 'paisId', p)} />
                    </td>
                    <td>
                      {!u.activo ? (
                        <span className="chip mal">Inactivo</span>
                      ) : u.invitacionPendiente ? (
                        <span className="chip interna">Invitación pendiente</span>
                      ) : (
                        <span className="chip ok">Activo</span>
                      )}
                    </td>
                    <td className="num">{formatearFechaHora(u.ultimoAcceso)}</td>
                    <td>
                      <div className="acciones-usuario">
                        {conCambios && (
                          <>
                            <button onClick={() => guardar(u)} disabled={ocupado === u.id}>
                              Guardar
                            </button>
                            <button
                              className="secundario"
                              onClick={() => setBorradores(({ [u.id]: _, ...resto }) => resto)}
                              disabled={ocupado === u.id}
                            >
                              Descartar
                            </button>
                          </>
                        )}
                        {!conCambios && u.activo && u.invitacionPendiente && (
                          <button className="secundario" onClick={() => reenviar(u)} disabled={ocupado === u.id}>
                            Reenviar invitación
                          </button>
                        )}
                        {!conCambios && !propio && (
                          <button
                            className={u.activo ? 'secundario' : undefined}
                            onClick={() => guardar(u, { activo: !u.activo })}
                            disabled={ocupado === u.id}
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visibles.length === 0 && <p className="vacio">Ningún usuario coincide con la búsqueda.</p>}
        </div>
      )}
      <p className="ayuda">
        Desactivar quita todo el acceso de inmediato y conserva su historial en la bitácora. Los usuarios no se
        borran.
      </p>
    </div>
  )
}
