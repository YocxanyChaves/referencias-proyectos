import { useRef, useState } from 'react'
import { MAX_FILAS } from '../lib/excelProyectos'

// Panel para cargar proyectos desde Excel: arrastrar y soltar o elegir archivo, y descargar la plantilla.
export default function ZonaExcel({ onArchivo, onDescargarPlantilla, ocupado, leyendo, estado }) {
  const input = useRef(null)
  const [encima, setEncima] = useState(false)

  function elegir(archivo) {
    if (archivo && !ocupado) onArchivo(archivo)
  }

  return (
    <aside className="tarjeta zona-excel" aria-labelledby="titulo-excel">
      <h2 id="titulo-excel">Cargar desde Excel</h2>
      <p className="ayuda">
        Llena la plantilla y súbela aquí. Con un proyecto se llena este formulario; con varios, se importan
        todos de una vez.
      </p>

      <div
        className={`soltar${encima ? ' encima' : ''}${ocupado ? ' ocupado' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Adjuntar archivo de Excel"
        aria-disabled={ocupado}
        onClick={() => !ocupado && input.current.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !ocupado) {
            e.preventDefault()
            input.current.click()
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
          elegir(e.dataTransfer.files[0])
        }}
      >
        <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
          <rect
            x="9"
            y="5"
            width="30"
            height="38"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path d="M9 15h30M9 25h30M9 35h30M20 5v38" stroke="currentColor" strokeWidth="2" />
          <circle cx="36" cy="36" r="9" fill="var(--superficie)" stroke="currentColor" strokeWidth="2.5" />
          <path
            d="M36 40.5v-9M32 35l4-4 4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <strong>{leyendo ? 'Leyendo archivo…' : 'Arrastra tu Excel aquí'}</strong>
        {!ocupado && <span>o haz clic para elegirlo</span>}
        <span className="meta">.xlsx · hasta {MAX_FILAS} proyectos · 5 MB</span>
        <input
          ref={input}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          onChange={(e) => {
            elegir(e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>

      {estado?.error && <p className="error">{estado.error}</p>}
      {estado?.aviso && <p className="exito">{estado.aviso}</p>}
      {estado?.pendientes?.length > 0 && (
        <div className="pendientes">
          <p>Revisa en el formulario:</p>
          <ul>
            {estado.pendientes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="secundario" onClick={onDescargarPlantilla}>
        Descargar plantilla
      </button>
    </aside>
  )
}
