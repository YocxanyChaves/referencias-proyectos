// Etiquetas como cápsulas de vidrio, todas del mismo tamaño.
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
      {etiquetas.map((e) => (
        <button
          type="button"
          key={e.id}
          className={seleccionadas.includes(e.id) ? 'capsula activa' : 'capsula'}
          aria-pressed={seleccionadas.includes(e.id)}
          onClick={() => alternar(e.id)}
          onPointerMove={seguirPuntero}
        >
          {e.nombre}
        </button>
      ))}
    </div>
  )
}
