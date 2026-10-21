import { Globe2 } from 'lucide-react'
import { urlBandera } from '../lib/banderas'

// Encabezado de la lista de proyectos con el filtro por país: una pastilla con la bandera de cada país.
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
          onClick={() => onChange([])}
        >
          <Globe2 aria-hidden="true" />
          Todos
        </button>
        {paises.map((p) => {
          const url = urlBandera(p.codigo)
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
              {url ? (
                <img src={url} alt="" className="bandera" draggable={false} />
              ) : (
                <span className="bandera-codigo">{p.codigo}</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
