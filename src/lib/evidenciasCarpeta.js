// Carpeta de evidencias para la carga masiva.
// Cada archivo se nombra "<N.º del proyecto>.<consecutivo> descripción.ext", p. ej. "1.2 Acta.pdf".
// No accede a datos: solo lee archivos del navegador y los asigna a los proyectos del Excel.

export const MAX_ARCHIVOS = 3000

// 1.2, 1.2.pdf, 1.2 Acta.pdf, 1.2-acta.pdf, 1.2_acta.pdf, 1.2(acta).pdf
const PATRON = /^(\d+)\.(\d+)(?=$|[\s._\-–—(])/

// Archivos que crean los sistemas operativos o los programas y no son evidencias.
function esArchivoDeSistema(nombre) {
  return (
    nombre.startsWith('.') ||
    nombre.startsWith('~$') ||
    /^(thumbs\.db|desktop\.ini|ehthumbs\.db)$/i.test(nombre)
  )
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Tipo sugerido según el nombre; se puede cambiar en la revisión.
export function inferirTipo(nombre) {
  const n = normalizar(nombre)
  if (n.includes('contrato')) return 'contrato'
  if (n.includes('acta')) return 'acta_recepcion'
  if (n.includes('carta') || n.includes('referencia')) return 'carta_referencia'
  if (n.includes('informe') || n.includes('reporte')) return 'informe'
  if (/\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)$/.test(n) || n.includes('foto')) return 'foto'
  return 'otro'
}

// Lee los archivos de un arrastre, entrando en carpetas y subcarpetas.
export async function archivosDeArrastre(dataTransfer) {
  const entradas = [...dataTransfer.items]
    .filter((i) => i.kind === 'file')
    .map((i) => i.webkitGetAsEntry?.())
    .filter(Boolean)
  if (entradas.length === 0) return [...dataTransfer.files]

  const archivos = []
  async function recorrer(entrada) {
    if (archivos.length > MAX_ARCHIVOS) return
    if (entrada.isFile) {
      archivos.push(await new Promise((ok, mal) => entrada.file(ok, mal)))
    } else if (entrada.isDirectory) {
      const lector = entrada.createReader()
      // readEntries devuelve los elementos por tandas; se llama hasta que no quede nada.
      for (;;) {
        const tanda = await new Promise((ok, mal) => lector.readEntries(ok, mal))
        if (tanda.length === 0) break
        for (const e of tanda) await recorrer(e)
      }
    }
  }
  for (const e of entradas) await recorrer(e)
  return archivos
}

function enumerar(lista, max = 8) {
  const visibles = lista
    .slice(0, max)
    .map((x) => `"${x}"`)
    .join(', ')
  return lista.length > max ? `${visibles} y ${lista.length - max} más` : visibles
}

/**
 * Asigna los archivos a los proyectos según su código N.M.
 * numeros: N.º de los proyectos del Excel.
 * Devuelve { porProyecto: { [numero]: evidencia[] }, errores, total }.
 * Cada evidencia: { clave, codigo, archivo, tipo, compartible, descripcion }.
 */
export function asignarEvidencias(numeros, archivos, { tamanoMaximo, ignorar = [] }) {
  const errores = []
  const existentes = new Set(numeros)
  const porProyecto = Object.fromEntries(numeros.map((n) => [n, []]))
  const sinPatron = []
  const sinProyecto = []
  const demasiadoGrandes = []
  const vacios = []
  const codigos = new Map()
  const repetidos = []

  const utiles = archivos.filter((a) => !esArchivoDeSistema(a.name) && !ignorar.includes(a.name))
  if (utiles.length === 0) {
    return { porProyecto, errores: ['La carpeta no tiene archivos.'], total: 0 }
  }
  if (utiles.length > MAX_ARCHIVOS) {
    return { porProyecto, errores: [`La carpeta tiene más de ${MAX_ARCHIVOS} archivos.`], total: 0 }
  }

  for (const archivo of utiles) {
    const m = PATRON.exec(archivo.name)
    if (!m) {
      sinPatron.push(archivo.name)
      continue
    }
    const proyecto = Number(m[1])
    const orden = Number(m[2])
    const codigo = `${proyecto}.${orden}`
    if (!existentes.has(proyecto)) {
      sinProyecto.push(archivo.name)
      continue
    }
    if (codigos.has(codigo)) {
      repetidos.push(`${codigo} ("${codigos.get(codigo)}" y "${archivo.name}")`)
      continue
    }
    if (archivo.size === 0) vacios.push(archivo.name)
    if (archivo.size > tamanoMaximo) demasiadoGrandes.push(archivo.name)
    codigos.set(codigo, archivo.name)

    const tipo = inferirTipo(archivo.name)
    porProyecto[proyecto].push({
      clave: `${codigo}|${archivo.name}`,
      codigo,
      orden,
      archivo,
      tipo,
      compartible: tipo !== 'contrato',
      descripcion: '',
    })
  }

  for (const lista of Object.values(porProyecto)) lista.sort((a, b) => a.orden - b.orden)

  if (sinPatron.length) {
    errores.push(
      `${sinPatron.length === 1 ? 'Este archivo no sigue' : 'Estos archivos no siguen'} la guía de nombres ` +
        `(deben empezar con N.º.consecutivo, p. ej. 1.1): ${enumerar(sinPatron)}.`,
    )
  }
  if (sinProyecto.length) {
    errores.push(`Evidencias de proyectos que no están en el Excel: ${enumerar(sinProyecto)}.`)
  }
  if (repetidos.length) errores.push(`Códigos repetidos: ${repetidos.slice(0, 8).join('; ')}.`)
  if (demasiadoGrandes.length) errores.push(`Superan los 50 MB: ${enumerar(demasiadoGrandes)}.`)
  if (vacios.length) errores.push(`Archivos vacíos (0 bytes): ${enumerar(vacios)}.`)

  const sinEvidencias = numeros.filter((n) => porProyecto[n].length === 0)
  if (sinEvidencias.length) {
    errores.push(
      `${sinEvidencias.length === 1 ? 'El proyecto' : 'Los proyectos'} ${sinEvidencias.join(', ')} ` +
        `no ${sinEvidencias.length === 1 ? 'tiene' : 'tienen'} evidencias. No se aceptan proyectos sin evidencias.`,
    )
  }

  return { porProyecto, errores, total: codigos.size }
}
