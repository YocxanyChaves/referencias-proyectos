import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { archivosDeArrastre, asignarEvidencias } from '../lib/evidenciasCarpeta'
import { ESTADOS_PROYECTO, TIPOS_EVIDENCIA } from '../services/catalogosService'
import { TAMANO_MAXIMO_BYTES } from '../services/evidenciasService'
import { importarProyectos } from '../services/proyectosService'

const NOMBRE_ESTADO = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.valor, e.nombre]))
const TIPOS_NO_COMPARTIBLES = ['contrato']

function formatearFecha(fecha) {
  if (!fecha) return '—'
  const [a, m, d] = fecha.split('-')
  return `${d}/${m}/${a}`
}

function formatearTamano(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function Paso({ numero, titulo, estado, children }) {
  return (
    <section className={`tarjeta paso paso-${estado}`}>
      <div className="paso-cabecera">
        <span className="paso-numero" aria-hidden="true">
          {estado === 'ok' ? '✓' : numero}
        </span>
        <h2>
          Paso {numero} · {titulo}
        </h2>
      </div>
      {children}
    </section>
  )
}

// Revisión de una carga masiva: Excel con varios proyectos + carpeta de evidencias.
export default function ImportacionMasiva({
  nombreArchivo,
  filas,
  advertencias,
  tieneNumero,
  onCancelar,
  onCargarOtro,
}) {
  const navigate = useNavigate()
  const inputExcel = useRef(null)
  const inputCarpeta = useRef(null)
  const [archivos, setArchivos] = useState(null) // archivos de la carpeta de evidencias
  const [ajustes, setAjustes] = useState({}) // cambios de tipo/compartible por evidencia
  const [leyendoCarpeta, setLeyendoCarpeta] = useState(false)
  const [encima, setEncima] = useState(false)
  const [progreso, setProgreso] = useState(null) // { texto, hechas, total }
  const [error, setError] = useState(null)

  const erroresDeFila = (f) => [...f.erroresNumero, ...f.errores]
  const filasConErrores = filas.filter((f) => erroresDeFila(f).length > 0)
  const excelListo = tieneNumero && filasConErrores.length === 0

  const asignacion = useMemo(() => {
    if (!archivos) return null
    const numeros = filas.map((f) => f.numero).filter((n) => n != null)
    return asignarEvidencias(numeros, archivos, {
      tamanoMaximo: TAMANO_MAXIMO_BYTES,
      ignorar: [nombreArchivo],
    })
  }, [archivos, filas, nombreArchivo])

  const evidenciasDe = (numero) =>
    (asignacion?.porProyecto[numero] ?? []).map((ev) => ({ ...ev, ...ajustes[ev.clave] }))
  const carpetaLista = asignacion && asignacion.errores.length === 0
  const listo = excelListo && carpetaLista
  const importando = progreso !== null

  // Cerrar la pestaña a mitad de la subida dejaría la importación incompleta.
  useEffect(() => {
    if (!importando) return
    const avisar = (e) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [importando])

  async function recibirCarpeta(obtenerArchivos) {
    setLeyendoCarpeta(true)
    setError(null)
    try {
      setArchivos(await obtenerArchivos())
    } catch {
      setError('No se pudo leer la carpeta. Intenta elegirla con el botón.')
    } finally {
      setLeyendoCarpeta(false)
    }
  }

  function cambiarEvidencia(clave, cambios) {
    setAjustes((a) => {
      const nuevo = { ...a[clave], ...cambios }
      if ('tipo' in cambios) nuevo.compartible = !TIPOS_NO_COMPARTIBLES.includes(cambios.tipo)
      return { ...a, [clave]: nuevo }
    })
  }

  async function importar() {
    setError(null)
    setProgreso({ texto: 'Preparando…', hechas: 0, total: 0 })
    try {
      const evidencias = Object.fromEntries(filas.map((f) => [f.numero, evidenciasDe(f.numero)]))
      const r = await importarProyectos(filas, evidencias, (texto, hechas, total) =>
        setProgreso({ texto, hechas, total }),
      )
      navigate('/', {
        state: {
          mensaje: `Se importaron ${r.proyectos} proyectos con ${r.evidencias} evidencias desde ${nombreArchivo}.`,
        },
      })
    } catch (e) {
      setError(`No se importó nada. ${e.message}`)
      setProgreso(null)
    }
  }

  return (
    <div className="importacion">
      <div className="importacion-cabecera">
        <div>
          <h1>Importar proyectos</h1>
          <p className="meta">{nombreArchivo}</p>
        </div>
        <div className="resumen">
          <span className="chip">{filas.length} proyectos</span>
          {asignacion && <span className="chip">{asignacion.total} evidencias</span>}
          {listo && <span className="chip ok">Listo para importar</span>}
        </div>
      </div>

      <Paso numero={1} titulo="Excel de proyectos" estado={excelListo ? 'ok' : 'error'}>
        {!tieneNumero ? (
          <p className="error">
            El Excel no tiene la columna "N.º", que une cada proyecto con sus evidencias. Descarga la
            plantilla nueva desde "Nuevo proyecto", copia ahí tus datos y numera los proyectos 1, 2, 3…
          </p>
        ) : excelListo ? (
          <p className="ok-texto">Las {filas.length} filas están correctas.</p>
        ) : (
          <p className="error">
            {filasConErrores.length === 1
              ? '1 fila tiene errores'
              : `${filasConErrores.length} filas tienen errores`}
            . Corrígelas en el Excel y vuelve a cargarlo (están marcadas en rojo en la tabla de abajo).
          </p>
        )}
        {advertencias.map((a) => (
          <p key={a} className="advertencia">
            {a}
          </p>
        ))}
        <div>
          <button
            type="button"
            className="secundario"
            onClick={() => inputExcel.current.click()}
            disabled={importando}
          >
            Cargar otro Excel
          </button>
          <input
            ref={inputExcel}
            type="file"
            accept=".xlsx"
            hidden
            onChange={(e) => {
              if (e.target.files[0]) onCargarOtro(e.target.files[0])
              e.target.value = ''
            }}
          />
        </div>
      </Paso>

      <Paso
        numero={2}
        titulo="Carpeta de evidencias"
        estado={carpetaLista ? 'ok' : asignacion ? 'error' : 'pendiente'}
      >
        <div className="guia-carpeta">
          <p>
            Cada archivo se nombra con el <strong>N.º del proyecto, un punto y un consecutivo</strong>. Todos
            los proyectos deben tener al menos una evidencia; si la carpeta no sigue la guía, no se importa
            nada.
          </p>
          <pre className="ejemplo-carpeta">
            {
              'Evidencias/\n  1.1 Contrato.pdf\n  1.2 Acta de recepción.pdf\n  2.1 Informe final.docx\n  3.1 Fotos.jpg'
            }
          </pre>
        </div>

        <div
          className={`soltar soltar-carpeta${encima ? ' encima' : ''}${leyendoCarpeta || importando ? ' ocupado' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Adjuntar carpeta de evidencias"
          onClick={() => !importando && inputCarpeta.current.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !importando) {
              e.preventDefault()
              inputCarpeta.current.click()
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            setEncima(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setEncima(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setEncima(false)
            if (importando) return
            const promesa = archivosDeArrastre(e.dataTransfer) // se lee antes de que termine el evento
            recibirCarpeta(() => promesa)
          }}
        >
          <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
            <path
              d="M5 13a3 3 0 0 1 3-3h10l4 5h18a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M24 34v-11M19 27l5-5 5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <strong>
            {leyendoCarpeta
              ? 'Leyendo carpeta…'
              : archivos
                ? 'Arrastra otra carpeta para reemplazarla'
                : 'Arrastra aquí la carpeta de evidencias'}
          </strong>
          {!leyendoCarpeta && <span>o haz clic para elegirla</span>}
          <span className="meta">Cualquier tipo de archivo · hasta 50 MB cada uno</span>
          <input
            ref={inputCarpeta}
            type="file"
            webkitdirectory=""
            multiple
            hidden
            onChange={(e) => {
              const lista = [...e.target.files]
              e.target.value = ''
              if (lista.length) recibirCarpeta(async () => lista)
            }}
          />
        </div>

        {asignacion &&
          (carpetaLista ? (
            <p className="ok-texto">
              {asignacion.total} evidencias asignadas a los {filas.length} proyectos.
            </p>
          ) : (
            <ul className="errores-carpeta">
              {asignacion.errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ))}
      </Paso>

      <Paso numero={3} titulo="Revisar e importar" estado={listo ? 'ok' : 'pendiente'}>
        <p className="ayuda">
          Revisa el tipo de cada evidencia y si es compartible. Las no compartibles (p. ej. contratos con
          precios) son de uso interno: no las ve el rol consulta.
        </p>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>N.º</th>
                <th>Título</th>
                <th>Cliente</th>
                <th>País</th>
                <th>Estado</th>
                <th>Fin</th>
                <th>Etiquetas</th>
                <th>Evidencias</th>
                <th>Revisión</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const errores = erroresDeFila(f)
                const evidencias = f.numero != null ? evidenciasDe(f.numero) : []
                const sinEvidencias = asignacion && evidencias.length === 0
                return (
                  <tr key={f.fila} className={errores.length || sinEvidencias ? 'con-error' : undefined}>
                    <td className="num">{f.numero ?? '—'}</td>
                    <td>{f.datos.titulo || '—'}</td>
                    <td>{f.datos.cliente || '—'}</td>
                    <td>{f.nombres.pais || '—'}</td>
                    <td>{NOMBRE_ESTADO[f.datos.estado]}</td>
                    <td className="num">{formatearFecha(f.datos.fechaFin)}</td>
                    <td>{f.nombres.etiquetas.join(', ') || '—'}</td>
                    <td className="celda-evidencias">
                      {!asignacion ? (
                        <span className="meta">Falta la carpeta</span>
                      ) : sinEvidencias ? (
                        <span className="error">Sin evidencias</span>
                      ) : (
                        <details>
                          <summary>
                            {evidencias.length} {evidencias.length === 1 ? 'evidencia' : 'evidencias'}
                            {evidencias.some((ev) => !ev.compartible) && ' · incluye internas'}
                          </summary>
                          <ul className="lista-evidencias">
                            {evidencias.map((ev) => (
                              <li key={ev.clave}>
                                <span className="evidencia-nombre" title={ev.archivo.name}>
                                  {ev.archivo.name}
                                  <span className="meta"> · {formatearTamano(ev.archivo.size)}</span>
                                </span>
                                <select
                                  value={ev.tipo}
                                  aria-label={`Tipo de ${ev.archivo.name}`}
                                  onChange={(e) => cambiarEvidencia(ev.clave, { tipo: e.target.value })}
                                  disabled={importando}
                                >
                                  {TIPOS_EVIDENCIA.map((t) => (
                                    <option key={t.valor} value={t.valor}>
                                      {t.nombre}
                                    </option>
                                  ))}
                                </select>
                                <label className="check">
                                  <input
                                    type="checkbox"
                                    checked={ev.compartible}
                                    onChange={(e) =>
                                      cambiarEvidencia(ev.clave, { compartible: e.target.checked })
                                    }
                                    disabled={importando}
                                  />
                                  Compartible
                                </label>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td>
                      {errores.length === 0 ? (
                        <span className="ok-texto">Correcta</span>
                      ) : (
                        <ul className="errores">
                          {errores.map((e) => (
                            <li key={e}>
                              Fila {f.fila}: {e}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {progreso && (
          <div className="progreso-importacion" role="status">
            <progress value={progreso.hechas} max={progreso.total || 1} />
            <span>
              {progreso.texto}
              {progreso.total > 0 && ` (${progreso.hechas} de ${progreso.total})`}
            </span>
          </div>
        )}
        {error && <p className="error">{error}</p>}

        <div className="acciones">
          <button type="button" className="secundario" onClick={onCancelar} disabled={importando}>
            Cancelar
          </button>
          <button type="button" onClick={importar} disabled={!listo || importando}>
            {importando
              ? 'Importando…'
              : `Importar ${filas.length} proyectos${asignacion ? ` y ${asignacion.total} evidencias` : ''}`}
          </button>
        </div>
        {!listo && !importando && (
          <p className="ayuda derecha">
            {!excelListo
              ? 'Para importar, corrige primero el Excel (paso 1).'
              : !asignacion
                ? 'Para importar, adjunta la carpeta de evidencias (paso 2).'
                : 'Para importar, corrige la carpeta de evidencias (paso 2).'}
          </p>
        )}
      </Paso>
    </div>
  )
}
