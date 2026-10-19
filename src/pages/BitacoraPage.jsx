import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarDescargas, listarUsuarios } from '../services/adminService'

const FILTROS_VACIOS = { usuarioId: '', tipo: '', desde: '', hasta: '' }
const NOMBRE_FORMATO = { pdf: 'PDF', excel: 'Excel' }

function formatearFechaHora(valor) {
  return new Date(valor).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function BitacoraPage() {
  const [usuarios, setUsuarios] = useState([])
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [descargas, setDescargas] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const solicitud = useRef(0)

  useEffect(() => {
    listarUsuarios()
      .then(setUsuarios)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    cargar(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  async function cargar(nuevaPagina) {
    const id = ++solicitud.current
    setCargando(true)
    setError(null)
    try {
      const r = await listarDescargas(filtros, { pagina: nuevaPagina })
      if (id !== solicitud.current) return // llegó una consulta más reciente
      setDescargas((prev) => (nuevaPagina === 0 ? r.descargas : [...prev, ...r.descargas]))
      setTotal(r.total)
      setHayMas(r.hayMas)
      setPagina(nuevaPagina)
    } catch (e) {
      if (id === solicitud.current) setError(e.message)
    } finally {
      if (id === solicitud.current) setCargando(false)
    }
  }

  const cambiar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }))
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS)

  return (
    <div className="admin-seccion">
      <div className="tarjeta filtros-bitacora">
        <label>
          Usuario
          <select value={filtros.usuarioId} onChange={cambiar('usuarioId')}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.email})
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={filtros.tipo} onChange={cambiar('tipo')}>
            <option value="">Todo</option>
            <option value="evidencia">Descargas de evidencias</option>
            <option value="exportacion">Exportaciones de fichas</option>
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={filtros.desde} onChange={cambiar('desde')} />
        </label>
        <label>
          Hasta
          <input type="date" value={filtros.hasta} onChange={cambiar('hasta')} />
        </label>
        {hayFiltros && (
          <button className="secundario" onClick={() => setFiltros(FILTROS_VACIOS)}>
            Limpiar
          </button>
        )}
      </div>

      <div className="titulo-seccion">
        <h1>Bitácora de descargas y exportaciones</h1>
        {!cargando && <span className="meta">{total === 1 ? '1 registro' : `${total} registros`}</span>}
      </div>
      {error && <p className="error">{error}</p>}

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Proyecto</th>
              <th>Qué se descargó</th>
            </tr>
          </thead>
          <tbody>
            {descargas.map((d) => (
              <tr key={d.id}>
                <td className="num">{formatearFechaHora(d.fecha)}</td>
                <td>
                  {d.usuario?.nombre}
                  <span className="meta bloque">{d.usuario?.email}</span>
                </td>
                <td>
                  {d.proyecto ? (
                    <Link to={`/proyectos/${d.proyecto.id}`}>{d.proyecto.titulo}</Link>
                  ) : (
                    <span className="meta">Proyecto eliminado</span>
                  )}
                </td>
                <td>
                  {d.tipo === 'exportacion' ? (
                    <span className="chip">Ficha exportada · {NOMBRE_FORMATO[d.formato]}</span>
                  ) : (
                    (d.evidencia?.nombre_original ?? <span className="meta">Evidencia eliminada</span>)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && !error && descargas.length === 0 && (
          <p className="vacio">{hayFiltros ? 'Ningún registro coincide con los filtros.' : 'Aún no hay descargas ni exportaciones.'}</p>
        )}
      </div>

      {cargando && <p className="centrado">Cargando…</p>}
      {!cargando && hayMas && (
        <button className="secundario cargar-mas" onClick={() => cargar(pagina + 1)}>
          Cargar más
        </button>
      )}
    </div>
  )
}
