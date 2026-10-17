import { useEffect, useRef } from 'react'

function IconoCarpeta() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path
        d="M2 5.5A1.5 1.5 0 0 1 3.5 4h4l1.6 2h7.4A1.5 1.5 0 0 1 18 7.5v7A1.5 1.5 0 0 1 16.5 16h-13A1.5 1.5 0 0 1 2 14.5z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconoArchivo() {
  return (
    <svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
      <path
        d="M5 2h6l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}

// Burbuja que explica la carga desde Excel y cómo armar la carpeta de evidencias.
// alturaFlecha: posición vertical (px) del botón que la abrió, para apuntarle con la flecha.
export default function AyudaPlantilla({ descargando, alturaFlecha, onCerrar }) {
  const caja = useRef(null)

  useEffect(() => {
    caja.current?.focus()
    const conTecla = (e) => e.key === 'Escape' && onCerrar()
    const conClic = (e) => {
      if (caja.current && !caja.current.contains(e.target) && !e.target.closest('[data-abre-ayuda]'))
        onCerrar()
    }
    document.addEventListener('keydown', conTecla)
    document.addEventListener('mousedown', conClic)
    return () => {
      document.removeEventListener('keydown', conTecla)
      document.removeEventListener('mousedown', conClic)
    }
  }, [onCerrar])

  return (
    <div
      ref={caja}
      className="ayuda-plantilla"
      role="dialog"
      aria-labelledby="ayuda-plantilla-titulo"
      tabIndex={-1}
      style={{ '--flecha-y': `${alturaFlecha}px` }}
    >
      <span className="ayuda-flecha" aria-hidden="true" />
      <div className="ayuda-contenido">
        <div className="ayuda-cabecera">
          <h3 id="ayuda-plantilla-titulo">Cómo funciona la carga desde Excel</h3>
          <button type="button" className="ayuda-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        {descargando && <p className="ayuda-descarga">La plantilla se está descargando.</p>}

        <ol className="ayuda-pasos">
          <li>
            <strong>Excel:</strong> una fila por proyecto con su <b>N.º</b> (1, 2, 3…). Marca con <b>X</b> sus
            etiquetas, como en la matriz de clasificación; puedes pegarla desde la columna A.
          </li>
          <li>
            <strong>Carpeta de evidencias:</strong> nombra cada archivo con el{' '}
            <b>N.º del proyecto, un punto y un consecutivo</b>.
          </li>
          <li>
            <strong>Sube</strong> el Excel a este panel y después la carpeta. Revisas y se importa todo junto.
          </li>
        </ol>

        <div
          className="ayuda-diagrama"
          aria-label="Ejemplo: el proyecto 1 tiene las evidencias 1.1 y 1.2; el proyecto 2 tiene la 2.1"
        >
          <div className="diagrama-excel">
            <span className="diagrama-rotulo">Excel</span>
            <table>
              <thead>
                <tr>
                  <th>N.º</th>
                  <th>Título</th>
                  <th>MiPYMES</th>
                  <th>Energía</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="insignia p1">1</span>
                  </td>
                  <td>Programa A</td>
                  <td className="x">X</td>
                  <td />
                </tr>
                <tr>
                  <td>
                    <span className="insignia p2">2</span>
                  </td>
                  <td>Estudio B</td>
                  <td className="x">X</td>
                  <td className="x">X</td>
                </tr>
              </tbody>
            </table>
          </div>

          <svg className="diagrama-flecha" viewBox="0 0 16 32" aria-hidden="true">
            <path
              d="M8 2v24M3 20l5 6 5-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="diagrama-carpeta">
            <span className="diagrama-rotulo">Carpeta</span>
            <div className="arbol">
              <div className="arbol-raiz">
                <IconoCarpeta /> Evidencias
              </div>
              <div className="arbol-archivo p1">
                <IconoArchivo /> <b>1.1</b> Contrato.pdf
              </div>
              <div className="arbol-archivo p1">
                <IconoArchivo /> <b>1.2</b> Acta.pdf
              </div>
              <div className="arbol-archivo p2">
                <IconoArchivo /> <b>2.1</b> Informe.docx
              </div>
            </div>
          </div>
        </div>

        <div className="ayuda-reglas">
          <strong>Si algo no cuadra, no se importa nada:</strong>
          <ul>
            <li>Cada proyecto necesita al menos 1 evidencia y 1 etiqueta.</li>
            <li>Un archivo con otro nombre, un código repetido o de un N.º que no existe en el Excel.</li>
          </ul>
          <p>Cualquier tipo de archivo, hasta 50 MB. Los contratos quedan como uso interno.</p>
        </div>

        <button type="button" className="ayuda-entendido" onClick={onCerrar}>
          Entendido
        </button>
      </div>
    </div>
  )
}
