import { ChevronDown, ShieldCheck } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { archivosDeArrastre, archivosDeSelector } from '../lib/evidenciasCarpeta'
import AyudaPlantilla from './AyudaPlantilla'

function Carpeta({ children }) {
  return (
    <span className="arbol-carpeta">
      <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
        <path
          d="M2 5.5A1.5 1.5 0 0 1 3.5 4h4l1.6 2h7.4A1.5 1.5 0 0 1 18 7.5v7A1.5 1.5 0 0 1 16.5 16h-13A1.5 1.5 0 0 1 2 14.5z"
          fill="currentColor"
        />
      </svg>
      {children}
    </span>
  )
}

// Panel de carga masiva: guía paso a paso, plantilla y recuadro para arrastrar la carpeta de carga
// (un Excel + una carpeta "Evidencias"). También acepta solo un Excel de un proyecto para llenar el formulario.
export default function ZonaExcel({ onArchivo, onPaquete, onDescargarPlantilla, ocupado, leyendo, estado }) {
  const inputCarpeta = useRef(null)
  const inputExcel = useRef(null)
  const botonPlantilla = useRef(null)
  const panel = useRef(null)
  const [encima, setEncima] = useState(false)
  const [ayuda, setAyuda] = useState(null) // { descargando, y }
  const cerrarAyuda = useCallback(() => setAyuda(null), [])

  // La burbuja apunta al botón de la plantilla.
  function abrirAyuda(descargando) {
    const b = botonPlantilla.current?.getBoundingClientRect()
    const p = panel.current?.getBoundingClientRect()
    setAyuda({ descargando, y: b && p ? b.top - p.top + b.height / 2 : 0 })
  }

  async function recibirArrastre(promesa) {
    const items = await promesa
    const unSoloExcel =
      items.length === 1 && /\.xlsx$/i.test(items[0].archivo.name) && !items[0].ruta.includes('/')
    if (unSoloExcel) onArchivo(items[0].archivo)
    else if (items.length) onPaquete(items)
  }

  return (
    <aside ref={panel} className="tarjeta zona-excel" aria-labelledby="titulo-excel">
      <div>
        <h2 id="titulo-excel">Cargar varios proyectos con Excel</h2>
        <p className="ayuda">
          Si algo no cumple la guía, el sistema te dice qué corregir.
        </p>
      </div>

      <details className="desplegable-pasos">
        <summary>
          <span className="desplegable-icono" aria-hidden="true">
            <ShieldCheck />
          </span>
          <strong className="desplegable-texto">Pasos para una carga segura</strong>
          <span className="desplegable-ver">
            <span className="ver-mas">Ver más</span>
            <span className="ver-menos">Ver menos</span>
            <ChevronDown aria-hidden="true" />
          </span>
        </summary>
        <ol className="guia-pasos">
          <li>
            <strong>Descarga la plantilla.</strong>
            <div className="acciones-plantilla">
              <button
                ref={botonPlantilla}
                type="button"
                className="secundario"
                data-abre-ayuda
                onClick={() => {
                  onDescargarPlantilla()
                  abrirAyuda(true)
                }}
              >
                Descargar plantilla
              </button>
              <button type="button" className="enlace" data-abre-ayuda onClick={() => abrirAyuda(false)}>
                Ver ejemplo
              </button>
            </div>
          </li>
          <li>
            <strong>Lee la hoja «Instrucciones»</strong> del Excel. Ahí se explica cada columna.
          </li>
          <li>
            <strong>Llena la hoja «Proyectos»</strong>, una fila por proyecto:
            <ul>
              <li>
                En <b>N.º</b> numera los proyectos: 1, 2, 3… sin repetir.
              </li>
              <li>
                Marca con <b>X</b> las etiquetas de cada proyecto (al menos una). Si ya tienes la matriz de
                clasificación, pégala desde la columna A.
              </li>
              <li>
                Completa las columnas con <b>*</b>: título, cliente, país, estado y fecha de fin si está
                finalizado.
              </li>
            </ul>
          </li>
          <li>
            <strong>Crea una carpeta para la carga</strong> (p. ej. «Carga octubre 2026»). Guarda ahí el Excel
            lleno y crea adentro otra carpeta llamada <b>Evidencias</b>.
          </li>
          <li>
            <strong>Pon los archivos en «Evidencias»</strong> nombrados con el N.º del proyecto, un punto y un
            consecutivo: <b>1.1</b>, <b>1.2</b> para el proyecto 1; <b>2.1</b> para el 2… Después del número
            puedes escribir una descripción.
            <ul>
              <li>Cada proyecto necesita al menos una evidencia.</li>
              <li>Cualquier tipo de archivo, hasta 50 MB cada uno.</li>
            </ul>
            <div className="arbol arbol-paquete" aria-label="Ejemplo de carpeta de carga">
              <Carpeta>Carga octubre 2026</Carpeta>
              <div className="arbol-hijos">
                <span className="arbol-excel">proyectos.xlsx</span>
                <Carpeta>Evidencias</Carpeta>
                <div className="arbol-hijos">
                  <span className="arbol-archivo p1">
                    <b>1.1</b> Contrato.pdf
                  </span>
                  <span className="arbol-archivo p1">
                    <b>1.2</b> Acta.pdf
                  </span>
                  <span className="arbol-archivo p2">
                    <b>2.1</b> Informe.docx
                  </span>
                </div>
              </div>
            </div>
          </li>
          <li>
            <strong>Arrastra la carpeta de la carga</strong> completa al recuadro de abajo.
          </li>
          <li>
            <strong>Revisa el resumen</strong>: corrige lo que salga en rojo, decide qué evidencias son
            compartibles e importa. Se guarda todo junto o nada.
          </li>
        </ol>
      </details>

      <div
        className={`soltar${encima ? ' encima' : ''}${ocupado ? ' ocupado' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Adjuntar la carpeta de la carga"
        aria-disabled={ocupado}
        onClick={() => !ocupado && inputCarpeta.current.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !ocupado) {
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
          if (!ocupado) recibirArrastre(archivosDeArrastre(e.dataTransfer)) // se lee dentro del evento
        }}
      >
        <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
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
        <strong>{leyendo ? 'Leyendo carpeta…' : 'Arrastra aquí la carpeta de la carga'}</strong>
        {!ocupado && <span>o haz clic para elegirla</span>}
        <span className="meta">El Excel + la carpeta «Evidencias»</span>
        <input
          ref={inputCarpeta}
          type="file"
          webkitdirectory=""
          multiple
          hidden
          onChange={(e) => {
            const items = archivosDeSelector(e.target.files) // se copia antes de limpiar el input
            e.target.value = ''
            if (items.length) onPaquete(items)
          }}
        />
      </div>

      {estado?.error && (
        <div className="error-carga" role="alert">
          <p>{estado.error}</p>
          {estado.errores?.length > 0 && (
            <ul>
              {estado.errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
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

      <p className="ayuda un-proyecto">
        ¿Es un solo proyecto? Puedes llenar el formulario o{' '}
        <button
          type="button"
          className="enlace en-linea"
          onClick={() => !ocupado && inputExcel.current.click()}
        >
          subir solo el Excel
        </button>{' '}
        para llenarlo y adjuntar ahí las evidencias.
        <input
          ref={inputExcel}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          onChange={(e) => {
            const archivo = e.target.files[0]
            e.target.value = ''
            if (archivo) onArchivo(archivo)
          }}
        />
      </p>

      {ayuda && (
        <AyudaPlantilla descargando={ayuda.descargando} alturaFlecha={ayuda.y} onCerrar={cerrarAyuda} />
      )}
    </aside>
  )
}
