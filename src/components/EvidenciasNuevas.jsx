import { TIPOS_EVIDENCIA } from '../services/catalogosService'
import { TAMANO_MAXIMO_BYTES } from '../services/evidenciasService'

// Tipos que por defecto son de uso interno (p. ej. contratos con precios).
export const TIPOS_NO_COMPARTIBLES = ['contrato']

export function formatearTamano(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Aplica cambios a una evidencia; al cambiar el tipo se sugiere si es compartible.
export function conCambios(evidencia, cambios) {
  const nueva = { ...evidencia, ...cambios }
  if ('tipo' in cambios) nueva.compartible = !TIPOS_NO_COMPARTIBLES.includes(cambios.tipo)
  return nueva
}

export function archivoDemasiadoGrande(evidencias) {
  return evidencias.find((ev) => ev.archivo.size > TAMANO_MAXIMO_BYTES) ?? null
}

// Selector de archivos nuevos con tipo, descripción y "compartible" para cada uno.
export default function EvidenciasNuevas({ evidencias, setEvidencias, deshabilitado = false }) {
  function agregar(e) {
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

  const cambiar = (clave, cambios) =>
    setEvidencias((ev) => ev.map((x) => (x.clave === clave ? conCambios(x, cambios) : x)))

  return (
    <>
      <input type="file" multiple onChange={agregar} disabled={deshabilitado} />
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
              <select
                value={ev.tipo}
                onChange={(e) => cambiar(ev.clave, { tipo: e.target.value })}
                disabled={deshabilitado}
                aria-label={`Tipo de ${ev.archivo.name}`}
              >
                {TIPOS_EVIDENCIA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.nombre}
                  </option>
                ))}
              </select>
              <input
                placeholder="Descripción (opcional)"
                value={ev.descripcion}
                onChange={(e) => cambiar(ev.clave, { descripcion: e.target.value })}
                disabled={deshabilitado}
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={ev.compartible}
                  onChange={(e) => cambiar(ev.clave, { compartible: e.target.checked })}
                  disabled={deshabilitado}
                />
                Compartible
              </label>
              <button
                type="button"
                className="secundario"
                onClick={() => setEvidencias((x) => x.filter((y) => y.clave !== ev.clave))}
                disabled={deshabilitado}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
