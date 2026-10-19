import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SelectorEtiquetas from '../components/SelectorEtiquetas'
import { useAuth } from '../context/AuthContext'
import { ESTADOS_PROYECTO, listarEtiquetas, listarPaises } from '../services/catalogosService'
import { buscarProyectos } from '../services/proyectosService'

const FILTROS_VACIOS = { etiquetas: [], paises: [], desde: '', hasta: '', texto: '' }
const NOMBRE_ESTADO = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.valor, e.nombre]))

// Los filtros se recuerdan durante la sesión para no perderlos al volver de un proyecto.
const CLAVE_FILTROS = 'filtros-proyectos'

function filtrosGuardados() {
  try {
    return { ...FILTROS_VACIOS, ...JSON.parse(sessionStorage.getItem(CLAVE_FILTROS)) }
  } catch {
    return FILTROS_VACIOS
  }
}

function formatearFecha(fecha) {
  if (!fecha) return '—'
  const [a, m, d] = fecha.split('-')
  return `${d}/${m}/${a}`
}

export default function ProyectosPage() {
  const { puedeCrear } = useAuth()
  const location = useLocation()
  const [etiquetas, setEtiquetas] = useState([])
  const [paises, setPaises] = useState([])
  const [filtros, setFiltros] = useState(filtrosGuardados)
  const [proyectos, setProyectos] = useState([])
  const [pagina, setPagina] = useState(0)
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const solicitud = useRef(0)

  useEffect(() => {
    Promise.all([listarEtiquetas(), listarPaises()])
      .then(([e, p]) => {
        setEtiquetas(e)
        setPaises(p)
      })
      .catch((e) => setError(e.message))
  }, [])

  // Busca de nuevo al cambiar los filtros (con espera breve para el texto).
  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify(filtros))
    } catch {
      // sin almacenamiento: los filtros solo duran mientras la página esté abierta
    }
    const t = setTimeout(() => cargar(0), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  async function cargar(nuevaPagina) {
    const id = ++solicitud.current
    setCargando(true)
    setError(null)
    try {
      const r = await buscarProyectos(filtros, { pagina: nuevaPagina })
      if (id !== solicitud.current) return // llegó una búsqueda más reciente
      setProyectos((prev) => (nuevaPagina === 0 ? r.proyectos : [...prev, ...r.proyectos]))
      setHayMas(r.hayMas)
      setPagina(nuevaPagina)
    } catch (e) {
      if (id === solicitud.current) setError(e.message)
    } finally {
      if (id === solicitud.current) setCargando(false)
    }
  }

  const cambiar = (campo) => (valor) => setFiltros((f) => ({ ...f, [campo]: valor }))
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS)

  return (
    <div className="proyectos">
      <aside className="tarjeta filtros">
        <h2>Buscar</h2>
        <label>
          Texto
          <input
            type="search"
            placeholder="Título, cliente o descripción"
            value={filtros.texto}
            onChange={(e) => cambiar('texto')(e.target.value)}
          />
        </label>

        <fieldset>
          <legend>Etiquetas (debe tener todas)</legend>
          <SelectorEtiquetas
            etiquetas={etiquetas}
            seleccionadas={filtros.etiquetas}
            onChange={cambiar('etiquetas')}
          />
        </fieldset>

        <fieldset>
          <legend>País</legend>
          <SelectorEtiquetas etiquetas={paises} seleccionadas={filtros.paises} onChange={cambiar('paises')} />
        </fieldset>

        <fieldset>
          <legend>Fecha de finalización</legend>
          <div className="fila">
            <label>
              Desde
              <input type="date" value={filtros.desde} onChange={(e) => cambiar('desde')(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={filtros.hasta} onChange={(e) => cambiar('hasta')(e.target.value)} />
            </label>
          </div>
        </fieldset>

        {hayFiltros && (
          <button className="secundario" onClick={() => setFiltros(FILTROS_VACIOS)}>
            Limpiar filtros
          </button>
        )}
      </aside>

      <section className="resultados">
        {location.state?.mensaje && <p className="exito">{location.state.mensaje}</p>}
        {error && <p className="error">{error}</p>}

        {!cargando && !error && proyectos.length === 0 && (
          <div className="tarjeta vacio">
            <p>
              {hayFiltros ? 'Ningún proyecto coincide con los filtros.' : 'Aún no hay proyectos registrados.'}
            </p>
            {puedeCrear && !hayFiltros && <Link to="/proyectos/nuevo">Registrar el primero</Link>}
          </div>
        )}

        <ul className="lista">
          {proyectos.map((p) => (
            <li key={p.id} className="tarjeta proyecto">
              <div className="proyecto-cabecera">
                <h3>
                  <Link to={`/proyectos/${p.id}`} className="enlace-proyecto">
                    {p.titulo}
                  </Link>
                </h3>
                <span className={`estado ${p.estado}`}>{NOMBRE_ESTADO[p.estado]}</span>
              </div>
              <p className="meta">
                {p.cliente} · {p.pais?.nombre} · {formatearFecha(p.fechaInicio)} –{' '}
                {formatearFecha(p.fechaFin)}
                {p.cantidadEvidencias != null &&
                  ` · ${p.cantidadEvidencias} ${p.cantidadEvidencias === 1 ? 'evidencia' : 'evidencias'}`}
              </p>
              {p.descripcion && <p className="descripcion">{p.descripcion}</p>}
              <div className="chips">
                {p.etiquetas.map((e) => (
                  <span key={e.id} className={filtros.etiquetas.includes(e.id) ? 'chip activo' : 'chip'}>
                    {e.nombre}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>

        {cargando && <p className="centrado">Cargando…</p>}
        {!cargando && hayMas && (
          <button className="secundario cargar-mas" onClick={() => cargar(pagina + 1)}>
            Cargar más
          </button>
        )}
      </section>
    </div>
  )
}
