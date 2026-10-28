import { iconoEtiqueta } from '../lib/iconosEtiquetas'

// Etiquetas como cápsulas del mismo tamaño, cada una con su ícono.
// Al pasar el mouse crecen (y un poco sus vecinas) y una luz sigue al puntero.
export default function SelectorEtiquetas({ etiquetas, seleccionadas, onChange }) {
  function alternar(id) {
    onChange(
      seleccionadas.includes(id) ? seleccionadas.filter((x) => x !== id) : [...seleccionadas, id],
    )
  }

  function seguirPuntero(e) {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--luz-x', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--luz-y', `${e.clientY - r.top}px`)
  }

  return (
    <div className="capsulas">
      {etiquetas.map((e) => {
        const Icono = iconoEtiqueta(e.nombre)
        return (
          <button
            type="button"
            key={e.id}
            className={seleccionadas.includes(e.id) ? 'capsula activa' : 'capsula'}
            aria-pressed={seleccionadas.includes(e.id)}
            title={e.nombre}
            onClick={() => alternar(e.id)}
            onPointerMove={seguirPuntero}
          >
            <Icono className="capsula-icono" aria-hidden="true" />
            <span className="capsula-texto">{e.nombre}</span>
          </button>
        )
      })}
    </div>
  )
}
