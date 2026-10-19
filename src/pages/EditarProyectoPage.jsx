import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import CamposProyecto, { validarDatosProyecto } from '../components/CamposProyecto'
import EvidenciasNuevas, {
  archivoDemasiadoGrande,
  conCambios,
  formatearTamano,
} from '../components/EvidenciasNuevas'
import { useAuth } from '../context/AuthContext'
import { TIPOS_EVIDENCIA, listarEtiquetas, listarPaises } from '../services/catalogosService'
import {
  actualizarEvidencia,
  descargarEvidencia,
  eliminarEvidencia,
  subirEvidencia,
} from '../services/evidenciasService'
import { actualizarProyecto, eliminarProyecto, obtenerProyecto } from '../services/proyectosService'

// Convierte el proyecto cargado a la forma del formulario.
function aDatos(p) {
  return {
    titulo: p.titulo,
    cliente: p.cliente,
    paisId: String(p.pais.id),
    estado: p.estado,
    fechaInicio: p.fechaInicio ?? '',
    fechaFin: p.fechaFin ?? '',
    descripcion: p.descripcion ?? '',
    resultados: p.resultados ?? '',
    contactoReferencia: p.contactoReferencia ?? '',
    etiquetas: p.etiquetas.map((e) => e.id),
    monto: p.monto ? String(p.monto.valor) : '',
    moneda: p.monto?.moneda ?? 'USD',
  }
}

const mismaEvidencia = (a, b) =>
  a.tipo === b.tipo && (a.descripcion ?? '') === (b.descripcion ?? '') && a.compartible === b.compartible

export default function EditarProyectoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { rol, puedeEditarPais } = useAuth()

  const [original, setOriginal] = useState(undefined) // undefined = cargando; null = no existe
  const [datos, setDatos] = useState(null)
  const [existentes, setExistentes] = useState([]) // evidencias guardadas, con cambios y marca "quitar"
  const [nuevas, setNuevas] = useState([])
  const [paises, setPaises] = useState([])
  const [etiquetas, setEtiquetas] = useState([])
  const [error, setError] = useState(null)
  const [progreso, setProgreso] = useState(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [textoConfirmacion, setTextoConfirmacion] = useState('')
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    let cancelado = false
    Promise.all([obtenerProyecto(id), listarPaises(), listarEtiquetas()])
      .then(([p, ps, es]) => {
        if (cancelado) return
        setPaises(ps)
        setEtiquetas(es)
        setOriginal(p)
        if (p) {
          setDatos(aDatos(p))
          setExistentes(p.evidencias.map((ev) => ({ ...ev, quitar: false })))
        }
      })
      .catch((e) => !cancelado && setError(e.message))
    return () => {
      cancelado = true
    }
  }, [id])

  const guardando = progreso !== null
  const ocupado = guardando || borrando

  // Avisar si se intenta cerrar la pestaña con un guardado a medias.
  useEffect(() => {
    if (!guardando) return
    const avisar = (e) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [guardando])

  if (error && original === undefined)
    return <p className="error centrado">No se pudo cargar el proyecto: {error}</p>
  if (original === undefined) return <p className="centrado">Cargando…</p>
  if (original === null || !puedeEditarPais(original.pais.id))
    return <Navigate to={`/proyectos/${id}`} replace />

  const quedan = existentes.filter((ev) => !ev.quitar).length + nuevas.length
  const cambiarExistente = (evId, cambios) =>
    setExistentes((lista) => lista.map((ev) => (ev.id === evId ? conCambios(ev, cambios) : ev)))

  function validar() {
    const problema = validarDatosProyecto(datos)
    if (problema) return problema
    if (quedan === 0)
      return 'El proyecto debe conservar al menos una evidencia. Agrega otra antes de quitar la última.'
    const grande = archivoDemasiadoGrande(nuevas)
    if (grande) return `"${grande.archivo.name}" supera el máximo de 50 MB.`
    return null
  }

  // Orden: datos → cambios de evidencias → archivos nuevos → quitar evidencias.
  // Se quitan al final para que el proyecto nunca quede sin evidencias si algo falla antes.
  async function guardar(e) {
    e.preventDefault()
    const problema = validar()
    if (problema) {
      setError(problema)
      return
    }
    setError(null)
    const hechos = []
    try {
      setProgreso('Guardando datos del proyecto…')
      await actualizarProyecto(id, datos)
      hechos.push('los datos del proyecto')

      const modificadas = existentes.filter((ev) => {
        const antes = original.evidencias.find((o) => o.id === ev.id)
        return !ev.quitar && !mismaEvidencia(ev, antes)
      })
      for (const ev of modificadas) {
        setProgreso(`Actualizando "${ev.nombre}"…`)
        await actualizarEvidencia(ev.id, ev)
      }
      if (modificadas.length) hechos.push('los cambios de evidencias')

      for (const [i, ev] of nuevas.entries()) {
        setProgreso(`Subiendo evidencia ${i + 1} de ${nuevas.length}: ${ev.archivo.name}`)
        await subirEvidencia(id, ev)
        hechos.push(`"${ev.archivo.name}"`)
      }

      for (const ev of existentes.filter((x) => x.quitar)) {
        setProgreso(`Quitando "${ev.nombre}"…`)
        await eliminarEvidencia(ev.id)
      }

      navigate(`/proyectos/${id}`, { state: { mensaje: 'Cambios guardados.' } })
    } catch (err) {
      setError(
        `No se pudo terminar de guardar: ${err.message}` +
          (hechos.length ? ` Sí se guardaron: ${hechos.join(', ')}.` : ' No se guardó ningún cambio.'),
      )
      setProgreso(null)
    }
  }

  async function borrarProyecto() {
    setBorrando(true)
    setError(null)
    try {
      await eliminarProyecto(id)
      navigate('/', { state: { mensaje: `Se eliminó el proyecto "${original.titulo}".` } })
    } catch (err) {
      setError(`No se pudo eliminar el proyecto: ${err.message}`)
      setBorrando(false)
    }
  }

  const nombreTipo = Object.fromEntries(TIPOS_EVIDENCIA.map((t) => [t.valor, t.nombre]))

  return (
    <form className="formulario editar" onSubmit={guardar}>
      <Link to={`/proyectos/${id}`} className="volver">
        ← Volver al proyecto
      </Link>
      <h1>Editar proyecto</h1>

      <CamposProyecto
        datos={datos}
        setDatos={setDatos}
        paises={rol === 'admin' ? paises : null}
        etiquetas={etiquetas}
        nombrePais={original.pais.nombre}
      />

      <section className="tarjeta">
        <h2>Evidencias *</h2>
        <p className="ayuda">
          Cambia el tipo, la descripción o si es compartible. Las no compartibles son de uso interno: no las
          ve el rol consulta. El proyecto debe conservar al menos una evidencia.
        </p>

        <ul className="evidencias">
          {existentes.map((ev) => (
            <li key={ev.id} className={ev.quitar ? 'por-quitar' : undefined}>
              <div className="evidencia-archivo">
                <strong title={ev.nombre}>{ev.nombre}</strong>
                <span className="meta">
                  {ev.quitar
                    ? 'Se quitará al guardar'
                    : `${nombreTipo[ev.tipo]} · ${formatearTamano(ev.tamano)}`}
                </span>
              </div>
              <select
                value={ev.tipo}
                onChange={(e) => cambiarExistente(ev.id, { tipo: e.target.value })}
                disabled={ev.quitar || ocupado}
                aria-label={`Tipo de ${ev.nombre}`}
              >
                {TIPOS_EVIDENCIA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.nombre}
                  </option>
                ))}
              </select>
              <input
                placeholder="Descripción (opcional)"
                value={ev.descripcion ?? ''}
                onChange={(e) => cambiarExistente(ev.id, { descripcion: e.target.value })}
                disabled={ev.quitar || ocupado}
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={ev.compartible}
                  onChange={(e) => cambiarExistente(ev.id, { compartible: e.target.checked })}
                  disabled={ev.quitar || ocupado}
                />
                Compartible
              </label>
              <div className="acciones-evidencia">
                <button
                  type="button"
                  className="enlace"
                  onClick={() => descargarEvidencia(ev.id).catch((err) => setError(err.message))}
                  disabled={ev.quitar || ocupado}
                >
                  Ver
                </button>
                <button
                  type="button"
                  className="secundario"
                  onClick={() => cambiarExistente(ev.id, { quitar: !ev.quitar })}
                  disabled={ocupado}
                >
                  {ev.quitar ? 'Deshacer' : 'Quitar'}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <h3 className="subtitulo-evidencias">Agregar evidencias</h3>
        <EvidenciasNuevas evidencias={nuevas} setEvidencias={setNuevas} deshabilitado={ocupado} />
        {quedan === 0 && (
          <p className="error">El proyecto quedaría sin evidencias. Agrega otra antes de quitar la última.</p>
        )}
      </section>

      {error && <p className="error">{error}</p>}
      {progreso && <p className="progreso">{progreso}</p>}

      <div className="acciones">
        <button
          type="button"
          className="secundario"
          onClick={() => navigate(`/proyectos/${id}`)}
          disabled={ocupado}
        >
          Cancelar
        </button>
        <button type="submit" disabled={ocupado}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <section className="tarjeta zona-peligro">
        <h2>Eliminar proyecto</h2>
        <p>
          Se borran el proyecto, su monto y <strong>todas sus evidencias y archivos</strong>. No se puede
          deshacer. El registro de descargas anteriores se conserva.
        </p>
        {!confirmarBorrado ? (
          <button
            type="button"
            className="peligro"
            onClick={() => setConfirmarBorrado(true)}
            disabled={ocupado}
          >
            Eliminar proyecto…
          </button>
        ) : (
          <div className="confirmar-borrado">
            <label>
              Para confirmar, escribe <b>ELIMINAR</b>
              <input
                value={textoConfirmacion}
                onChange={(e) => setTextoConfirmacion(e.target.value)}
                autoFocus
                disabled={borrando}
              />
            </label>
            <div className="acciones">
              <button
                type="button"
                className="secundario"
                onClick={() => {
                  setConfirmarBorrado(false)
                  setTextoConfirmacion('')
                }}
                disabled={borrando}
              >
                No eliminar
              </button>
              <button
                type="button"
                className="peligro"
                onClick={borrarProyecto}
                disabled={textoConfirmacion.trim().toUpperCase() !== 'ELIMINAR' || borrando || guardando}
              >
                {borrando ? 'Eliminando…' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        )}
      </section>
    </form>
  )
}
