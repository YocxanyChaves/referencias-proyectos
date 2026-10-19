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
// Devuelve [{ archivo, ruta }], con la ruta relativa a lo que se arrastró ("Carga/Evidencias/1.1.pdf").
// Debe llamarse dentro del evento: el navegador deja de dar acceso a los elementos al terminar.
export async function archivosDeArrastre(dataTransfer) {
  const entradas = [...dataTransfer.items]
    .filter((i) => i.kind === 'file')
    .map((i) => i.webkitGetAsEntry?.())
    .filter(Boolean)
  if (entradas.length === 0)
    return [...dataTransfer.files].map((archivo) => ({ archivo, ruta: archivo.name }))

  const archivos = []
  async function recorrer(entrada) {
    if (archivos.length > MAX_ARCHIVOS) return
    if (entrada.isFile) {
      const archivo = await new Promise((ok, mal) => entrada.file(ok, mal))
      archivos.push({ archivo, ruta: entrada.fullPath.replace(/^\//, '') })
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

// Archivos elegidos con el selector de carpetas (input con webkitdirectory).
export function archivosDeSelector(lista) {
  return [...lista].map((archivo) => ({ archivo, ruta: archivo.webkitRelativePath || archivo.name }))
}

const esExcel = (nombre) => /\.xlsx$/i.test(nombre)
const carpetasDe = (ruta) => ruta.split('/').slice(0, -1)
const estaEnEvidencias = (ruta) => carpetasDe(ruta).some((c) => normalizar(c.trim()) === 'evidencias')

// De lo que se arrastró, se queda con las evidencias: lo que está dentro de una carpeta
// "Evidencias" si existe; si no, todo menos los Excel.
export function soloEvidencias(items) {
  const utiles = items.filter((i) => !esArchivoDeSistema(i.archivo.name))
  const dentro = utiles.filter((i) => estaEnEvidencias(i.ruta))
  return (dentro.length ? dentro : utiles.filter((i) => !esExcel(i.archivo.name))).map((i) => i.archivo)
}

/**
 * Separa una carpeta de carga en su Excel y su carpeta "Evidencias".
 * Estructura esperada:  Carga/  proyectos.xlsx   Evidencias/  1.1 ….pdf  1.2 ….pdf  2.1 …
 * Devuelve { excel, evidencias: File[], nombreCarpeta, errores, advertencias }.
 */
export function separarPaquete(items) {
  const errores = []
  const advertencias = []
  const utiles = items.filter((i) => !esArchivoDeSistema(i.archivo.name))
  const raices = [...new Set(utiles.map((i) => i.ruta.split('/')[0]))]
  const nombreCarpeta = raices.length === 1 && utiles.some((i) => i.ruta.includes('/')) ? raices[0] : null

  const evidencias = utiles.filter((i) => estaEnEvidencias(i.ruta))
  const fuera = utiles.filter((i) => !estaEnEvidencias(i.ruta))
  const excels = fuera.filter((i) => esExcel(i.archivo.name))
  const otros = fuera.filter((i) => !esExcel(i.archivo.name))

  if (excels.length === 0) {
    errores.push(
      'No se encontró el Excel de proyectos (.xlsx) en la carpeta. Guarda la plantilla llena junto a la carpeta "Evidencias", no dentro de ella.',
    )
  } else if (excels.length > 1) {
    errores.push(
      `Hay ${excels.length} archivos de Excel: ${enumerar(excels.map((i) => i.ruta))}. Deja solo la plantilla llena.`,
    )
  }

  if (evidencias.length === 0) {
    const pareceEvidencia = otros.filter((i) => PATRON.test(i.archivo.name))
    errores.push(
      pareceEvidencia.length
        ? `Las evidencias deben ir dentro de una carpeta llamada "Evidencias". Encontré ${pareceEvidencia.length} archivos con nombre de evidencia (p. ej. "${pareceEvidencia[0].archivo.name}") fuera de esa carpeta.`
        : 'No se encontró la carpeta "Evidencias" (o está vacía). Créala junto al Excel y pon ahí los archivos nombrados 1.1, 1.2, 2.1…',
    )
  } else {
    const sueltas = otros.filter((i) => PATRON.test(i.archivo.name))
    if (sueltas.length) {
      errores.push(
        `Estos archivos parecen evidencias pero están fuera de la carpeta "Evidencias": ${enumerar(sueltas.map((i) => i.ruta))}. Muévelos adentro.`,
      )
    }
    const ignorados = otros.filter((i) => !PATRON.test(i.archivo.name))
    if (ignorados.length) {
      advertencias.push(
        `Se ignoraron archivos que no son el Excel ni están en "Evidencias": ${enumerar(ignorados.map((i) => i.ruta))}.`,
      )
    }
  }

  return {
    excel: excels.length === 1 ? excels[0].archivo : null,
    evidencias: evidencias.map((i) => i.archivo),
    nombreCarpeta,
    errores,
    advertencias,
  }
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
