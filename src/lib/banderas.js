// Banderas reales (paquete flag-icons) según el código ISO de 2 letras del catálogo de países.
// `?no-inline` hace que cada bandera sea un archivo aparte: solo se descargan las que se muestran.
const RECTANGULARES = import.meta.glob('../../node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?no-inline',
  import: 'default',
})
// Versión cuadrada, para mostrarlas en círculo sin que se deformen.
const CUADRADAS = import.meta.glob('../../node_modules/flag-icons/flags/1x1/*.svg', {
  eager: true,
  query: '?no-inline',
  import: 'default',
})

export function urlBandera(codigo, { cuadrada = false } = {}) {
  if (!codigo) return null
  const formato = cuadrada ? '1x1' : '4x3'
  const banderas = cuadrada ? CUADRADAS : RECTANGULARES
  return banderas[`../../node_modules/flag-icons/flags/${formato}/${codigo.toLowerCase()}.svg`] ?? null
}
