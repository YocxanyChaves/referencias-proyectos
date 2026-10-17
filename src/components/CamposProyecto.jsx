import SelectorEtiquetas from './SelectorEtiquetas'
import { ESTADOS_PROYECTO } from '../services/catalogosService'

export const DATOS_VACIOS = {
  titulo: '',
  cliente: '',
  paisId: '',
  estado: 'finalizado',
  fechaInicio: '',
  fechaFin: '',
  descripcion: '',
  resultados: '',
  contactoReferencia: '',
  etiquetas: [],
  monto: '',
  moneda: 'USD',
}

// Reglas del formulario (sin evidencias). Devuelve el primer problema o null.
export function validarDatosProyecto(datos) {
  if (!datos.titulo.trim()) return 'Escribe el título del proyecto.'
  if (!datos.cliente.trim()) return 'Escribe el cliente.'
  if (!datos.paisId) return 'Selecciona el país del proyecto.'
  if (datos.fechaInicio && datos.fechaFin && datos.fechaFin < datos.fechaInicio)
    return 'La fecha de fin no puede ser anterior a la de inicio.'
  if (datos.estado === 'finalizado' && !datos.fechaFin)
    return 'Indica la fecha de fin de un proyecto finalizado.'
  if (datos.etiquetas.length === 0) return 'Asigna al menos una etiqueta.'
  if (datos.monto !== '' && !(Number(datos.monto) >= 0)) return 'El monto debe ser un número positivo.'
  if (!/^[A-Z]{3}$/.test(datos.moneda)) return 'La moneda debe ser un código de 3 letras, p. ej. USD.'
  return null
}

// Secciones "Datos generales", "Etiquetas" y "Monto" del formulario de proyecto.
// paises = null: el país no se puede elegir y se muestra nombrePais.
export default function CamposProyecto({ datos, setDatos, paises, etiquetas, nombrePais }) {
  const campo = (nombre) => ({
    value: datos[nombre],
    onChange: (e) => setDatos((d) => ({ ...d, [nombre]: e.target.value })),
  })

  return (
    <>
      <section className="tarjeta">
        <h2>Datos generales</h2>
        <label>
          Título *
          <input {...campo('titulo')} required maxLength={500} />
        </label>
        <label>
          Cliente *
          <input {...campo('cliente')} required maxLength={500} />
        </label>
        <div className="fila">
          <label>
            País *
            {paises ? (
              <select {...campo('paisId')} required>
                <option value="">Seleccionar…</option>
                {paises.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <input value={nombrePais ?? ''} disabled />
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
    </>
  )
}
