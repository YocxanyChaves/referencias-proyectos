import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ESTADOS_PROYECTO, TIPOS_EVIDENCIA } from '../services/catalogosService'
import { descargarEvidencia } from '../services/evidenciasService'
import { obtenerProyecto } from '../services/proyectosService'

const NOMBRE_ESTADO = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.valor, e.nombre]))
const NOMBRE_TIPO = Object.fromEntries(TIPOS_EVIDENCIA.map((t) => [t.valor, t.nombre]))

function formatearFecha(fecha) {
  if (!fecha) return '—'
  const [a, m, d] = fecha.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

function formatearTamano(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatearMonto({ valor, moneda }) {
  try {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: moneda }).format(valor)
  } catch {
    return `${moneda} ${valor.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`
  }
}

function extension(nombre) {
  const i = nombre.lastIndexOf('.')
  return i > 0 ? nombre.slice(i + 1, i + 5).toUpperCase() : '—'
}

function Dato({ etiqueta, children }) {
  return (
    <div className="dato">
      <dt>{etiqueta}</dt>
      <dd>{children || '—'}</dd>
    </div>
  )
}

export default function ProyectoDetallePage() {
  const { id } = useParams()
  const { rol, puedeEditarPais } = useAuth()
  const location = useLocation()
  const [proyecto, setProyecto] = useState(undefined) // undefined = cargando; null = no existe
  const [error, setError] = useState(null)
  const [descargando, setDescargando] = useState(null) // id de la evidencia en curso
  const [errorDescarga, setErrorDescarga] = useState(null)

  useEffect(() => {
    let cancelado = false
    setProyecto(undefined)
    setError(null)
    obtenerProyecto(id)
      .then((p) => !cancelado && setProyecto(p))
      .catch((e) => !cancelado && setError(e.message))
    return () => {
      cancelado = true
    }
  }, [id])

  async function descargar(evidencia) {
    setDescargando(evidencia.id)
    setErrorDescarga(null)
    try {
      await descargarEvidencia(evidencia.id)
    } catch (e) {
      setErrorDescarga(`No se pudo descargar "${evidencia.nombre}": ${e.message}`)
    } finally {
      setDescargando(null)
    }
  }

  const volver = (
    <Link to="/" className="volver">
      ← Volver a la búsqueda
    </Link>
  )

  if (error) {
    return (
      <div className="detalle">
        {volver}
        <p className="error">No se pudo cargar el proyecto: {error}</p>
      </div>
    )
  }
  if (proyecto === undefined) return <p className="centrado">Cargando…</p>
  if (proyecto === null) {
    return (
      <div className="detalle">
        {volver}
        <div className="tarjeta vacio">
          <p>Este proyecto no existe o no tienes acceso a él.</p>
        </div>
      </div>
    )
  }

  const puedeVerInternas = rol === 'admin' || rol === 'editor'
  const p = proyecto

  return (
    <div className="detalle">
      {volver}

      <header className="detalle-cabecera">
        <div>
          <p className="meta">
            {p.pais?.nombre} · {p.cliente}
          </p>
          <h1>{p.titulo}</h1>
        </div>
        <div className="detalle-acciones">
          <span className={`estado ${p.estado}`}>{NOMBRE_ESTADO[p.estado]}</span>
          {puedeEditarPais(p.pais?.id) && (
            <Link to={`/proyectos/${p.id}/editar`} className="boton secundario">
              Editar
            </Link>
          )}
        </div>
      </header>
      {location.state?.mensaje && <p className="exito">{location.state.mensaje}</p>}

      <div className="detalle-columnas">
        <div className="detalle-principal">
          <section className="tarjeta">
            <h2>Descripción</h2>
            <p className="texto-largo">{p.descripcion || 'Sin descripción.'}</p>
          </section>

          {p.resultados && (
            <section className="tarjeta">
              <h2>Resultados</h2>
              <p className="texto-largo">{p.resultados}</p>
            </section>
          )}

          <section className="tarjeta">
            <div className="titulo-seccion">
              <h2>Evidencias</h2>
              <span className="meta">
                {p.evidencias.length} {p.evidencias.length === 1 ? 'archivo' : 'archivos'}
              </span>
            </div>
            <p className="ayuda">
              Cada descarga queda registrada. El enlace se genera al momento y vence en un minuto.
            </p>
            {errorDescarga && <p className="error">{errorDescarga}</p>}

            {p.evidencias.length === 0 ? (
              <p className="meta">
                {puedeVerInternas
                  ? 'Este proyecto no tiene evidencias.'
                  : 'Este proyecto no tiene evidencias disponibles para tu perfil.'}
              </p>
            ) : (
              <ul className="lista-descargas">
                {p.evidencias.map((ev) => (
                  <li key={ev.id}>
                    <span className="formato" aria-hidden="true">
                      {extension(ev.nombre)}
                    </span>
                    <div className="descarga-info">
                      <strong title={ev.nombre}>{ev.nombre}</strong>
                      <span className="meta">
                        {NOMBRE_TIPO[ev.tipo]} · {formatearTamano(ev.tamano)} · subida el{' '}
                        {formatearFecha(ev.subidoEn)}
                      </span>
                      {ev.descripcion && <span className="meta">{ev.descripcion}</span>}
                    </div>
                    {!ev.compartible && (
                      <span
                        className="chip interna"
                        title="No la ve el rol consulta ni se incluye en exportaciones"
                      >
                        Uso interno
                      </span>
                    )}
                    <button
                      type="button"
                      className="secundario"
                      onClick={() => descargar(ev)}
                      disabled={descargando !== null}
                      aria-label={`Descargar ${ev.nombre}`}
                    >
                      {descargando === ev.id ? 'Preparando…' : 'Descargar'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="detalle-lateral">
          <section className="tarjeta">
            <h2>Datos del proyecto</h2>
            <dl className="datos">
              <Dato etiqueta="Cliente">{p.cliente}</Dato>
              <Dato etiqueta="País">{p.pais?.nombre}</Dato>
              <Dato etiqueta="Estado">{NOMBRE_ESTADO[p.estado]}</Dato>
              <Dato etiqueta="Inicio">{p.fechaInicio && formatearFecha(p.fechaInicio)}</Dato>
              <Dato etiqueta="Fin">{p.fechaFin && formatearFecha(p.fechaFin)}</Dato>
              <Dato etiqueta="Contacto de referencia">{p.contactoReferencia}</Dato>
            </dl>
          </section>

          <section className="tarjeta">
            <h2>Etiquetas</h2>
            <div className="chips">
              {p.etiquetas.map((e) => (
                <span key={e.id} className="chip">
                  {e.nombre}
                </span>
              ))}
            </div>
          </section>

          {p.monto && (
            <section className="tarjeta interna-seccion">
              <h2>Monto</h2>
              <p className="monto">{formatearMonto(p.monto)}</p>
              <p className="ayuda">Uso interno: no lo ve el rol consulta ni se incluye en exportaciones.</p>
            </section>
          )}

          <p className="meta registro">
            Registrado el {formatearFecha(p.creadoEn)}
            {p.actualizadoEn &&
              p.actualizadoEn.slice(0, 10) !== p.creadoEn.slice(0, 10) &&
              ` · actualizado el ${formatearFecha(p.actualizadoEn)}`}
          </p>
        </aside>
      </div>
    </div>
  )
}
