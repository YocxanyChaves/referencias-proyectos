import { useState } from 'react'
import { Link } from 'react-router-dom'
import { descargarArchivo } from '../lib/excelProyectos'
import { generarExcel, generarPaquete, generarPdf, nombreArchivo } from '../lib/exportarReferencias'
import { mover, quitar, useSeleccion, vaciar } from '../lib/seleccionExportacion'
import { obtenerDatosExportacion } from '../services/exportacionService'

const FORMATOS = [
  {
    valor: 'pdf',
    nombre: 'PDF',
    detalle: 'La ficha de cada proyecto, lista para adjuntar.',
    formatos: ['pdf'],
  },
  {
    valor: 'excel',
    nombre: 'Excel',
    detalle: 'Una fila por proyecto, para filtrar o copiar.',
    formatos: ['excel'],
  },
  {
    valor: 'ambos',
    nombre: 'PDF y Excel',
    detalle: 'Los dos archivos juntos en un .zip.',
    formatos: ['pdf', 'excel'],
  },
]
const TITULO_PREDETERMINADO = 'Proyectos y evidencias'
const GENERADORES = { pdf: [generarPdf, 'pdf'], excel: [generarExcel, 'xlsx'] }

export default function ExportarPage() {
  const seleccion = useSeleccion()
  const [titulo, setTitulo] = useState(TITULO_PREDETERMINADO)
  const [formato, setFormato] = useState('pdf')
  const [incluirContacto, setIncluirContacto] = useState(true)
  const [incluirEvidencias, setIncluirEvidencias] = useState(false)
  const [progreso, setProgreso] = useState(null) // texto mientras se genera
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)

  const elegido = FORMATOS.find((f) => f.valor === formato)
  // Más de un archivo (dos formatos o evidencias) se entrega en un .zip.
  const esPaquete = incluirEvidencias || elegido.formatos.length > 1

  async function exportar() {
    const tituloFinal = titulo.trim() || TITULO_PREDETERMINADO
    setProgreso('Preparando…')
    setError(null)
    setMensaje(null)
    try {
      const proyectos = await obtenerDatosExportacion(
        seleccion.map((p) => p.id),
        { formatos: elegido.formatos, incluirContacto, incluirEvidencias },
      )
      const cantidad = proyectos.length === 1 ? '1 proyecto' : `${proyectos.length} proyectos`
      if (esPaquete) {
        const blob = await generarPaquete({
          titulo: tituloFinal,
          proyectos,
          formatos: elegido.formatos,
          onProgreso: setProgreso,
        })
        descargarArchivo(blob, nombreArchivo(tituloFinal, 'zip'))
        const archivos = proyectos.reduce((n, p) => n + (incluirEvidencias ? p.evidencias.length : 0), 0)
        setMensaje(
          `Se generó el .zip con ${cantidad}` +
            (incluirEvidencias ? ` y ${archivos === 1 ? '1 evidencia' : `${archivos} evidencias`}.` : '.'),
        )
      } else {
        const [generar, extension] = GENERADORES[elegido.formatos[0]]
        descargarArchivo(await generar({ titulo: tituloFinal, proyectos }), nombreArchivo(tituloFinal, extension))
        setMensaje(`Se generó el ${elegido.nombre} con ${cantidad}.`)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setProgreso(null)
    }
  }

  const volver = (
    <Link to="/" className="volver">
      ← Volver a la búsqueda
    </Link>
  )

  if (seleccion.length === 0) {
    return (
      <div className="exportar">
        {volver}
        <h1>Exportar referencias</h1>
        <div className="tarjeta vacio">
          <p>Aún no elegiste proyectos.</p>
          <p className="ayuda">
            En la búsqueda, marca la casilla de cada proyecto que quieras incluir y vuelve aquí.
          </p>
          <Link to="/">Ir a la búsqueda</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="exportar">
      {volver}
      <h1>Exportar referencias</h1>

      <div className="exportar-columnas">
        <section className="tarjeta">
          <div className="titulo-seccion">
            <h2>
              {seleccion.length === 1 ? '1 proyecto' : `${seleccion.length} proyectos`} en este orden
            </h2>
            <button className="enlace" onClick={vaciar}>
              Quitar todos
            </button>
          </div>
          <ol className="lista-exportar">
            {seleccion.map((p, i) => (
              <li key={p.id}>
                <span className="exportar-numero">{i + 1}</span>
                <span className="descarga-info">
                  <Link to={`/proyectos/${p.id}`}>{p.titulo}</Link>
                  <span className="meta">
                    {p.cliente}
                    {p.pais && ` · ${p.pais}`}
                  </span>
                </span>
                <span className="acciones-evidencia">
                  <button
                    className="secundario mini"
                    onClick={() => mover(p.id, -1)}
                    disabled={i === 0}
                    aria-label={`Subir ${p.titulo}`}
                  >
                    ↑
                  </button>
                  <button
                    className="secundario mini"
                    onClick={() => mover(p.id, 1)}
                    disabled={i === seleccion.length - 1}
                    aria-label={`Bajar ${p.titulo}`}
                  >
                    ↓
                  </button>
                  <button className="enlace" onClick={() => quitar([p.id])}>
                    Quitar
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="tarjeta exportar-opciones">
          <h2>Documento</h2>
          <label>
            Título
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={150} />
          </label>
          <fieldset>
            <legend>Formato</legend>
            {FORMATOS.map((f) => (
              <label key={f.valor} className={formato === f.valor ? 'opcion activa' : 'opcion'}>
                <input
                  type="radio"
                  name="formato"
                  value={f.valor}
                  checked={formato === f.valor}
                  onChange={() => setFormato(f.valor)}
                />
                <span>
                  <strong>{f.nombre}</strong>
                  <span className="meta bloque">{f.detalle}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <label className="check">
            <input type="checkbox" checked={incluirContacto} onChange={(e) => setIncluirContacto(e.target.checked)} />
            Incluir contacto de referencia
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={incluirEvidencias}
              onChange={(e) => setIncluirEvidencias(e.target.checked)}
            />
            Incluir los archivos de evidencias
          </label>
          {incluirEvidencias && (
            <p className="ayuda exportar-aviso">
              Se descarga un .zip con la ficha y una carpeta por proyecto con sus evidencias compartibles (máximo
              300 MB en total). Cada archivo queda registrado en la bitácora.
            </p>
          )}
          <p className="ayuda exportar-aviso">
            Nunca incluye montos ni evidencias de uso interno. La exportación queda registrada en la bitácora.
          </p>
          {error && <p className="error">{error}</p>}
          {mensaje && <p className="exito">{mensaje}</p>}
          {progreso && <p className="progreso exportar-progreso">{progreso}</p>}
          <button onClick={exportar} disabled={progreso != null}>
            {progreso ? 'Generando…' : esPaquete ? 'Descargar .zip' : `Descargar ${elegido.nombre}`}
          </button>
        </aside>
      </div>
    </div>
  )
}
