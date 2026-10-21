// Banderas reales (paquete flag-icons) según el código ISO de 2 letras del catálogo de países.
// `?no-inline` hace que cada bandera sea un archivo aparte: solo se descargan las que se muestran.
const BANDERAS = import.meta.glob('../../node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?no-inline',
  import: 'default',
})

export function urlBandera(codigo) {
  if (!codigo) return null
  return BANDERAS[`../../node_modules/flag-icons/flags/4x3/${codigo.toLowerCase()}.svg`] ?? null
}
