import { Globe2 } from 'lucide-react'
import { urlBandera } from '../lib/banderas'

// Encabezado de la lista de proyectos con el filtro por país: un círculo con la bandera de cada país.
// El seleccionado lleva un rayito de luz girando alrededor.
export default function BandaPaises({ paises, seleccionados, onChange }) {
  function alternar(id) {
    onChange(seleccionados.includes(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id])
  }

  return (
    <section className="banda-paises">
      <div className="banda-titulo">
        <h1>Referencias de Proyectos</h1>
        <p>Elige uno o varios países para filtrar los proyectos.</p>
      </div>

      <div className={seleccionados.length > 0 ? 'banderas filtrando' : 'banderas'} role="group" aria-label="Filtrar por país">
        <button
          type="button"
          className={seleccionados.length === 0 ? 'pais pais-todos activo' : 'pais pais-todos'}
          aria-pressed={seleccionados.length === 0}
          aria-label="Todos los países"
          title="Todos los países"
          onClick={() => onChange([])}
        >
          <span className="pais-anillo" aria-hidden="true" />
          <span className="pais-circulo">
            <Globe2 aria-hidden="true" />
          </span>
        </button>
        {paises.map((p) => {
          const url = urlBandera(p.codigo, { cuadrada: true })
          const activo = seleccionados.includes(p.id)
          return (
            <button
              type="button"
              key={p.id}
              className={activo ? 'pais activo' : 'pais'}
              aria-pressed={activo}
              aria-label={p.nombre}
              title={p.nombre}
              onClick={() => alternar(p.id)}
            >
              <span className="pais-anillo" aria-hidden="true" />
              <span className="pais-circulo">
                {url ? (
                  <img src={url} alt="" draggable={false} />
                ) : (
                  <span className="bandera-codigo">{p.codigo}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
