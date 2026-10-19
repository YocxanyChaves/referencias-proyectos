// Lista de etiquetas como chips seleccionables.
export default function SelectorEtiquetas({ etiquetas, seleccionadas, onChange }) {
  function alternar(id) {
    onChange(
      seleccionadas.includes(id) ? seleccionadas.filter((x) => x !== id) : [...seleccionadas, id],
    )
  }

  return (
    <div className="chips">
      {etiquetas.map((e) => (
        <button
          type="button"
          key={e.id}
          className={seleccionadas.includes(e.id) ? 'chip activo' : 'chip'}
          aria-pressed={seleccionadas.includes(e.id)}
          onClick={() => alternar(e.id)}
        >
          {e.nombre}
        </button>
      ))}
    </div>
  )
}
