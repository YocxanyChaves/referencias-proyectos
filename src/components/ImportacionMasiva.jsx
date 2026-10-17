import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ESTADOS_PROYECTO } from '../services/catalogosService'
import { crearProyectos } from '../services/proyectosService'

const NOMBRE_ESTADO = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.valor, e.nombre]))

function formatearFecha(fecha) {
  if (!fecha) return '—'
  const [a, m, d] = fecha.split('-')
  return `${d}/${m}/${a}`
}

// Revisión de un Excel con varios proyectos antes de importarlos todos juntos.
export default function ImportacionMasiva({ nombreArchivo, filas, advertencias, onCancelar, onCargarOtro }) {
  const navigate = useNavigate()
  const [guardando, setGuardando] = useState(false)
  const input = useRef(null)
  const [error, setError] = useState(null)

  const conErrores = filas.filter((f) => f.errores.length > 0)
  const listo = conErrores.length === 0

  async function importar() {
    setGuardando(true)
    setError(null)
    try {
      const n = await crearProyectos(filas)
      navigate('/', { state: { mensaje: `Se importaron ${n} proyectos desde ${nombreArchivo}.` } })
    } catch (e) {
      setError(`No se importó ningún proyecto. ${e.message}`)
      setGuardando(false)
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
          {listo ? (
            <span className="chip ok">Todo correcto</span>
          ) : (
            <span className="chip mal">
              {conErrores.length} {conErrores.length === 1 ? 'fila con errores' : 'filas con errores'}
            </span>
          )}
        </div>
      </div>

      {!listo && (
        <p className="error">
          Corrige las filas marcadas en el Excel y vuelve a cargarlo. Se importan todos los proyectos juntos o
          ninguno, para que no queden cargas a medias.
        </p>
      )}
      {advertencias.map((a) => (
        <p key={a} className="advertencia">
          {a}
        </p>
      ))}
      <p className="ayuda">
        El Excel no incluye evidencias. Para un proyecto con evidencias, usa el formulario.
      </p>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fila</th>
              <th>Título</th>
              <th>Cliente</th>
              <th>País</th>
              <th>Estado</th>
              <th>Fin</th>
              <th>Etiquetas</th>
              <th>Revisión</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.fila} className={f.errores.length ? 'con-error' : undefined}>
                <td className="num">{f.fila}</td>
                <td>{f.datos.titulo || '—'}</td>
                <td>{f.datos.cliente || '—'}</td>
                <td>{f.nombres.pais || '—'}</td>
                <td>{NOMBRE_ESTADO[f.datos.estado]}</td>
                <td className="num">{formatearFecha(f.datos.fechaFin)}</td>
                <td>{f.nombres.etiquetas.join(', ') || '—'}</td>
                <td>
                  {f.errores.length === 0 ? (
                    <span className="ok-texto">Correcta</span>
                  ) : (
                    <ul className="errores">
                      {f.errores.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="acciones">
        <button type="button" className="secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button
          type="button"
          className="secundario"
          onClick={() => input.current.click()}
          disabled={guardando}
        >
          Cargar otro archivo
        </button>
        <input
          ref={input}
          type="file"
          accept=".xlsx"
          hidden
          onChange={(e) => {
            if (e.target.files[0]) onCargarOtro(e.target.files[0])
            e.target.value = ''
          }}
        />
        <button type="button" onClick={importar} disabled={!listo || guardando}>
          {guardando ? 'Importando…' : `Importar ${filas.length} proyectos`}
        </button>
      </div>
    </div>
  )
}
