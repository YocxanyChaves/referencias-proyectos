import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SelectorEtiquetas from '../components/SelectorEtiquetas'
import { useAuth } from '../context/AuthContext'
import {
  ESTADOS_PROYECTO,
  TIPOS_EVIDENCIA,
  listarEtiquetas,
  listarPaises,
} from '../services/catalogosService'
import { TAMANO_MAXIMO_BYTES } from '../services/evidenciasService'
import { crearProyecto } from '../services/proyectosService'

// Tipos que por defecto son de uso interno (p. ej. contratos con precios).
const TIPOS_NO_COMPARTIBLES = ['contrato']

function formatearTamano(bytes) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function NuevoProyectoPage() {
  const { perfil, rol } = useAuth()
  const navigate = useNavigate()
  const esAdmin = rol === 'admin'

  const [etiquetas, setEtiquetas] = useState([])
  const [paises, setPaises] = useState([])
  const [datos, setDatos] = useState({
    titulo: '',
    cliente: '',
    paisId: esAdmin ? '' : perfil.paisId,
    estado: 'finalizado',
    fechaInicio: '',
    fechaFin: '',
    descripcion: '',
    resultados: '',
    contactoReferencia: '',
    etiquetas: [],
    monto: '',
    moneda: 'USD',
  })
  const [evidencias, setEvidencias] = useState([])
  const [progreso, setProgreso] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([listarEtiquetas(), listarPaises()])
      .then(([e, p]) => {
        setEtiquetas(e)
        setPaises(p)
      })
      .catch((e) => setError(e.message))
  }, [])

  const campo = (nombre) => ({
    value: datos[nombre],
    onChange: (e) => setDatos((d) => ({ ...d, [nombre]: e.target.value })),
  })

  function agregarArchivos(e) {
    const nuevos = [...e.target.files].map((archivo) => ({
      clave: crypto.randomUUID(),
      archivo,
      tipo: 'informe',
      descripcion: '',
      compartible: true,
    }))
    setEvidencias((ev) => [...ev, ...nuevos])
    e.target.value = ''
  }

  function cambiarEvidencia(clave, cambios) {
    setEvidencias((ev) =>
      ev.map((x) => {
        if (x.clave !== clave) return x
        const y = { ...x, ...cambios }
        if ('tipo' in cambios) y.compartible = !TIPOS_NO_COMPARTIBLES.includes(cambios.tipo)
        return y
      }),
    )
  }

  function validar() {
    if (!datos.paisId) return 'Selecciona el país del proyecto.'
    if (datos.fechaInicio && datos.fechaFin && datos.fechaFin < datos.fechaInicio)
      return 'La fecha de fin no puede ser anterior a la de inicio.'
    if (datos.estado === 'finalizado' && !datos.fechaFin)
      return 'Indica la fecha de fin de un proyecto finalizado.'
    if (datos.etiquetas.length === 0) return 'Asigna al menos una etiqueta.'
    if (datos.monto !== '' && !(Number(datos.monto) >= 0)) return 'El monto debe ser un número positivo.'
    const grande = evidencias.find((ev) => ev.archivo.size > TAMANO_MAXIMO_BYTES)
    if (grande) return `"${grande.archivo.name}" supera el máximo de 50 MB.`
    return null
  }

  async function enviar(e) {
    e.preventDefault()
    const problema = validar()
    if (problema) {
      setError(problema)
      return
    }
    setError(null)
    try {
      await crearProyecto({ ...datos, paisId: Number(datos.paisId) }, evidencias, setProgreso)
      navigate('/', { state: { mensaje: `Proyecto "${datos.titulo.trim()}" creado.` } })
    } catch (err) {
      setError(`No se pudo crear el proyecto: ${err.message}`)
      setProgreso(null)
    }
  }

  const guardando = progreso !== null

  return (
    <form className="formulario" onSubmit={enviar}>
      <h1>Nuevo proyecto</h1>

      <section className="tarjeta">
        <h2>Datos generales</h2>
        <label>
          Título *
          <input {...campo('titulo')} required maxLength={300} />
        </label>
        <label>
          Cliente *
          <input {...campo('cliente')} required maxLength={300} />
        </label>
        <div className="fila">
          <label>
            País *
            {esAdmin ? (
              <select {...campo('paisId')} required>
                <option value="">Seleccionar…</option>
                {paises.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <input value={perfil.paisNombre ?? ''} disabled />
            )}
          </label>
          <label>
            Estado
            <select {...campo('estado')}>
              {ESTADOS_PROYECTO.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="fila">
          <label>
            Fecha de inicio
            <input type="date" {...campo('fechaInicio')} />
          </label>
          <label>
            Fecha de fin{datos.estado === 'finalizado' && ' *'}
            <input type="date" {...campo('fechaFin')} min={datos.fechaInicio || undefined} />
          </label>
        </div>
        <label>
          Descripción
          <textarea {...campo('descripcion')} rows={4} />
        </label>
        <label>
          Resultados
          <textarea {...campo('resultados')} rows={3} />
        </label>
        <label>
          Contacto de referencia
          <input {...campo('contactoReferencia')} placeholder="Nombre, cargo, correo o teléfono" />
        </label>
      </section>

      <section className="tarjeta">
        <h2>Etiquetas *</h2>
        <SelectorEtiquetas
          etiquetas={etiquetas}
          seleccionadas={datos.etiquetas}
          onChange={(v) => setDatos((d) => ({ ...d, etiquetas: v }))}
        />
      </section>

      <section className="tarjeta">
        <h2>Monto</h2>
        <p className="ayuda">Uso interno: no se muestra al rol consulta ni se incluye en exportaciones.</p>
        <div className="fila">
          <label>
            Monto
            <input type="number" min="0" step="0.01" {...campo('monto')} />
          </label>
          <label>
            Moneda
            <input
              {...campo('moneda')}
              onChange={(e) => setDatos((d) => ({ ...d, moneda: e.target.value.toUpperCase() }))}
              maxLength={3}
              pattern="[A-Z]{3}"
              title="Código ISO de 3 letras, p. ej. USD"
            />
          </label>
        </div>
      </section>

      <section className="tarjeta">
        <h2>Evidencias</h2>
        <p className="ayuda">
          Máximo 50 MB por archivo. Desmarca “Compartible” para documentos de uso interno (p. ej. contratos
          con precios): no serán visibles para el rol consulta ni se exportarán.
        </p>
        <input type="file" multiple onChange={agregarArchivos} />

        {evidencias.length > 0 && (
          <ul className="evidencias">
            {evidencias.map((ev) => (
              <li key={ev.clave}>
                <div className="evidencia-archivo">
                  <strong>{ev.archivo.name}</strong>
                  <span className={ev.archivo.size > TAMANO_MAXIMO_BYTES ? 'error' : 'meta'}>
                    {formatearTamano(ev.archivo.size)}
                  </span>
                </div>
                <select value={ev.tipo} onChange={(e) => cambiarEvidencia(ev.clave, { tipo: e.target.value })}>
                  {TIPOS_EVIDENCIA.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Descripción (opcional)"
                  value={ev.descripcion}
                  onChange={(e) => cambiarEvidencia(ev.clave, { descripcion: e.target.value })}
                />
                <label className="check">
                  <input
                    type="checkbox"
                    checked={ev.compartible}
                    onChange={(e) => cambiarEvidencia(ev.clave, { compartible: e.target.checked })}
                  />
                  Compartible
                </label>
                <button
                  type="button"
                  className="secundario"
                  onClick={() => setEvidencias((x) => x.filter((y) => y.clave !== ev.clave))}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="error">{error}</p>}
      {progreso && <p className="progreso">{progreso}</p>}

      <div className="acciones">
        <button type="button" className="secundario" onClick={() => navigate('/')} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Crear proyecto'}
        </button>
      </div>
    </form>
  )
}
