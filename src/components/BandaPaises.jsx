import { Globe2 } from 'lucide-react'
import { urlBandera } from '../lib/banderas'
import FondoHero from './FondoHero'

// Franja superior de la lista de proyectos: decoración y filtro por país a la vez.
export default function BandaPaises({ paises, seleccionados, onChange }) {
  function alternar(id) {
    onChange(seleccionados.includes(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id])
  }

  return (
    <section className="banda-paises fondo-hero">
      <FondoHero />
      <div className="banda-contenido">
        <div className="banda-titulo">
          <span className="kicker claro">
            <span className="kicker-punto" />
            Presencia regional
          </span>
          <h1>Referencias de Proyectos</h1>
          <p>Elige uno o varios países para filtrar los proyectos.</p>
        </div>

        <div className={seleccionados.length > 0 ? 'banderas filtrando' : 'banderas'}>
          <button
            type="button"
            className={seleccionados.length === 0 ? 'pais activo' : 'pais'}
            aria-pressed={seleccionados.length === 0}
            onClick={() => onChange([])}
          >
            <span className="bandera bandera-todos">
              <Globe2 />
            </span>
            <span className="pais-nombre">Todos</span>
          </button>
          {paises.map((p, i) => {
            const url = urlBandera(p.codigo)
            const activo = seleccionados.includes(p.id)
            return (
              <button
                type="button"
                key={p.id}
                className={activo ? 'pais activo' : 'pais'}
                aria-pressed={activo}
                onClick={() => alternar(p.id)}
              >
                <span className="bandera" style={{ '--retraso': `${i * -0.7}s` }}>
                  {url ? <img src={url} alt="" draggable={false} /> : <span className="bandera-codigo">{p.codigo}</span>}
                </span>
                <span className="pais-nombre">{p.nombre}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
