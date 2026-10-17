// Plantilla y lectura de Excel para cargar proyectos.
// No accede a datos: recibe los catálogos y devuelve filas validadas con la misma forma
// que el formulario de Nuevo proyecto. ExcelJS se carga solo cuando se usa.

export const MAX_FILAS = 500
export const MAX_BYTES = 5 * 1024 * 1024
const FILAS_PLANTILLA = MAX_FILAS
const NUM_ETIQUETAS = 5

const COLUMNAS = [
  { clave: 'numero', titulo: 'N.º', requerida: true, ancho: 7 },
  { clave: 'titulo', titulo: 'Título', requerida: true, ancho: 42 },
  { clave: 'cliente', titulo: 'Cliente', requerida: true, ancho: 32 },
  { clave: 'pais', titulo: 'País', requerida: true, ancho: 16 },
  { clave: 'estado', titulo: 'Estado', requerida: true, ancho: 14 },
  { clave: 'fechaInicio', titulo: 'Fecha de inicio', ancho: 16 },
  { clave: 'fechaFin', titulo: 'Fecha de fin', ancho: 16 },
  ...Array.from({ length: NUM_ETIQUETAS }, (_, i) => ({
    clave: 'etiqueta',
    titulo: `Etiqueta ${i + 1}`,
    requerida: i === 0,
    ancho: 28,
  })),
  { clave: 'descripcion', titulo: 'Descripción', ancho: 50 },
  { clave: 'resultados', titulo: 'Resultados', ancho: 40 },
  { clave: 'contactoReferencia', titulo: 'Contacto de referencia', ancho: 34 },
  { clave: 'monto', titulo: 'Monto', ancho: 14 },
  { clave: 'moneda', titulo: 'Moneda', ancho: 10 },
]

// Encabezados aceptados (normalizados) para cada campo, por si el Excel no viene de la plantilla.
const ALIAS = {
  numero: ['n.º', 'nº', 'n.°', 'n°', 'n.o', 'no.', 'no', 'n', '#', 'num', 'numero', 'numero de proyecto'],
  titulo: ['titulo', 'titulo del proyecto', 'nombre del proyecto', 'proyecto'],
  cliente: ['cliente', 'contratante'],
  pais: ['pais'],
  estado: ['estado'],
  fechaInicio: ['fecha de inicio', 'fecha inicio', 'inicio'],
  fechaFin: ['fecha de fin', 'fecha fin', 'fecha de finalizacion', 'fin'],
  descripcion: ['descripcion'],
  resultados: ['resultados', 'resultado'],
  contactoReferencia: ['contacto de referencia', 'contacto'],
  monto: ['monto', 'monto del contrato'],
  moneda: ['moneda'],
}

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function campoDeEncabezado(encabezado) {
  const n = normalizar(encabezado)
  if (!n) return null
  if (n.startsWith('etiqueta')) return 'etiqueta'
  return Object.keys(ALIAS).find((campo) => ALIAS[campo].includes(n)) ?? null
}

async function cargarExcelJS() {
  const modulo = await import('exceljs')
  return modulo.default ?? modulo
}

// ---------------------------------------------------------------- Plantilla

// paisFijo: para editores, el único país que pueden usar.
export async function generarPlantilla({ paises, etiquetas, paisFijo = null }) {
  const ExcelJS = await cargarExcelJS()
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Referencias de Proyectos'

  const hoja = libro.addWorksheet('Proyectos', { views: [{ state: 'frozen', ySplit: 1 }] })
  const instrucciones = libro.addWorksheet('Instrucciones')
  const catalogos = libro.addWorksheet('Catálogos')

  // Catálogos para las listas desplegables
  const listaPaises = paisFijo ? paises.filter((p) => p.id === paisFijo) : paises
  catalogos.columns = [
    { header: 'Países', width: 20 },
    { header: 'Etiquetas', width: 38 },
    { header: 'Estados', width: 14 },
  ]
  listaPaises.forEach((p, i) => (catalogos.getCell(i + 2, 1).value = p.nombre))
  etiquetas.forEach((e, i) => (catalogos.getCell(i + 2, 2).value = e.nombre))
  ;['Finalizado', 'En curso'].forEach((e, i) => (catalogos.getCell(i + 2, 3).value = e))
  catalogos.getRow(1).font = { bold: true }

  // Encabezados
  hoja.columns = COLUMNAS.map((c) => ({
    header: c.requerida ? `${c.titulo} *` : c.titulo,
    width: c.ancho,
  }))
  const encabezado = hoja.getRow(1)
  encabezado.height = 30
  COLUMNAS.forEach((c, i) => {
    const celda = encabezado.getCell(i + 1)
    celda.font = { bold: true, color: { argb: 'FF1D2530' } }
    celda.alignment = { vertical: 'middle', wrapText: true }
    celda.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: c.requerida ? 'FFFCE8B2' : 'FFE6EFFA' },
    }
    celda.border = { bottom: { style: 'thin', color: { argb: 'FF8A9AAB' } } }
  })

  // Validaciones y formatos por columna
  const rangoPaises = `'Catálogos'!$A$2:$A$${listaPaises.length + 1}`
  const rangoEtiquetas = `'Catálogos'!$B$2:$B$${etiquetas.length + 1}`
  const validacion = (c) => {
    switch (c.clave) {
      case 'numero':
        return { type: 'whole', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [1], showErrorMessage: true, error: 'Escribe el número del proyecto: 1, 2, 3…' }
      case 'pais':
        return { type: 'list', allowBlank: true, formulae: [rangoPaises], showErrorMessage: true, error: 'Elige un país de la lista.' }
      case 'estado':
        return { type: 'list', allowBlank: true, formulae: ['"Finalizado,En curso"'], showErrorMessage: true, error: 'Elige Finalizado o En curso.' }
      case 'etiqueta':
        return { type: 'list', allowBlank: true, formulae: [rangoEtiquetas], showErrorMessage: true, error: 'Elige una etiqueta de la lista.' }
      case 'fechaInicio':
      case 'fechaFin':
        return { type: 'date', operator: 'greaterThan', allowBlank: true, formulae: [new Date(Date.UTC(1950, 0, 1))], showErrorMessage: true, error: 'Escribe una fecha, por ejemplo 15/03/2024.' }
      case 'monto':
        return { type: 'decimal', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0], showErrorMessage: true, error: 'El monto debe ser un número mayor o igual a 0.' }
      default:
        return null
    }
  }
  COLUMNAS.forEach((c, i) => {
    const v = validacion(c)
    const col = hoja.getColumn(i + 1)
    if (c.clave === 'fechaInicio' || c.clave === 'fechaFin') col.numFmt = 'dd/mm/yyyy'
    if (c.clave === 'monto') col.numFmt = '#,##0.00'
    if (['descripcion', 'resultados'].includes(c.clave)) col.alignment = { wrapText: true, vertical: 'top' }
    if (!v) return
    for (let fila = 2; fila <= FILAS_PLANTILLA + 1; fila++) hoja.getCell(fila, i + 1).dataValidation = v
  })

  // Instrucciones
  instrucciones.getColumn(1).width = 110
  const titulo = { bold: true, size: 14 }
  const subtitulo = { bold: true, size: 12 }
  const alerta = { bold: true, color: { argb: 'FFB42318' } }
  const ejemplo = { name: 'Consolas', color: { argb: 'FF1F5FA8' } }
  const lineas = [
    ['Cómo cargar proyectos desde Excel', titulo],
    [''],
    ['Se entregan dos cosas: este Excel y una carpeta con las evidencias.', { bold: true }],
    [''],
    ['PASO 1 · El Excel (hoja "Proyectos")', subtitulo],
    ['1. Una fila por proyecto. No cambies los encabezados.'],
    ['2. En "N.º" numera los proyectos: 1, 2, 3… Sin repetir. Ese número une el proyecto con sus evidencias.'],
    ['3. Las columnas con * son obligatorias. "Fecha de fin" es obligatoria si el estado es Finalizado.'],
    ['4. País, Estado y Etiquetas se eligen de la lista desplegable de cada celda.'],
    [`5. Cada proyecto necesita al menos una etiqueta. Hay ${NUM_ETIQUETAS} columnas; deja vacías las que no uses.`],
    ['6. Fechas en formato día/mes/año, por ejemplo 15/03/2024.'],
    ['7. Monto: solo el número, sin símbolo. Moneda: código de 3 letras (USD, CRC, GTQ, PAB). Si queda vacía, se usa USD.'],
    ['   El monto es de uso interno: no lo ve el rol consulta ni se incluye en exportaciones.'],
    [`8. Máximo ${MAX_FILAS} proyectos por archivo.`],
    [''],
    ['PASO 2 · La carpeta de evidencias', subtitulo],
    ['Todas las evidencias van en una sola carpeta. Cada archivo se nombra con el N.º del proyecto, un punto y un consecutivo:'],
    [''],
    ['   Evidencias/', ejemplo],
    ['      1.1 Contrato.pdf             → proyecto 1, evidencia 1', ejemplo],
    ['      1.2 Acta de recepción.pdf    → proyecto 1, evidencia 2', ejemplo],
    ['      1.3 Fotos del taller.jpg     → proyecto 1, evidencia 3', ejemplo],
    ['      2.1 Informe final.docx       → proyecto 2, evidencia 1', ejemplo],
    ['      3.1 Carta de referencia.pdf  → proyecto 3, evidencia 1', ejemplo],
    [''],
    ['IMPORTANTE: si la carpeta no sigue esta guía, la carga se rechaza completa.', alerta],
    ['- Todos los proyectos del Excel deben tener al menos una evidencia. No se aceptan proyectos sin evidencias.', alerta],
    ['- El nombre de cada archivo debe empezar con N.º.consecutivo (1.1, 1.2, 2.1…). Después puedes poner una descripción.'],
    ['- No repitas un código: no puede haber dos archivos 1.2.'],
    ['- Cada código debe corresponder a un N.º que exista en el Excel.'],
    ['- Se acepta cualquier tipo de archivo (PDF, Word, Excel, fotos, etc.), hasta 50 MB cada uno.'],
    [''],
    ['PASO 3 · Revisar e importar', subtitulo],
    ['En "Nuevo proyecto", arrastra el Excel al panel "Cargar desde Excel" y después la carpeta de evidencias.'],
    ['Verás una revisión de cada proyecto con sus evidencias. Ahí puedes cambiar el tipo de cada evidencia y si es compartible.'],
    ['Los archivos con "contrato" en el nombre se marcan como de uso interno (no compartibles): no los ve el rol consulta.'],
    ['Se guardan todos los proyectos y evidencias juntos, o ninguno, así que no quedan cargas a medias.'],
    [''],
    ['Si el Excel tiene un solo proyecto, sus datos llenan el formulario y ahí adjuntas las evidencias directamente.'],
  ]
  lineas.forEach(([texto, fuente], i) => {
    const celda = instrucciones.getCell(i + 1, 1)
    celda.value = texto
    if (fuente) celda.font = fuente
  })

  const buffer = await libro.xlsx.writeBuffer()
  return new Blob([buffer], { type: TIPO_XLSX })
}

// ---------------------------------------------------------------- Lectura

function valorCelda(valor) {
  if (valor == null) return null
  if (valor instanceof Date) return valor
  if (typeof valor === 'object') {
    if ('result' in valor) return valorCelda(valor.result)
    if (Array.isArray(valor.richText)) return valor.richText.map((t) => t.text).join('')
    if ('text' in valor) return valorCelda(valor.text)
    if ('error' in valor) return null
    return null
  }
  return valor
}

function texto(valor) {
  if (valor == null) return ''
  if (valor instanceof Date) return aFechaISO(valor) ?? ''
  return String(valor).trim()
}

function aFechaISO(fecha) {
  if (Number.isNaN(fecha.getTime())) return null
  const a = fecha.getUTCFullYear()
  const m = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  const d = String(fecha.getUTCDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

function fechaValida(a, m, d) {
  const f = new Date(Date.UTC(a, m - 1, d))
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d ? aFechaISO(f) : null
}

// Devuelve 'aaaa-mm-dd', '' si está vacía, o undefined si no se entiende.
function leerFecha(valor) {
  if (valor == null || valor === '') return ''
  if (valor instanceof Date) return aFechaISO(valor) ?? undefined
  if (typeof valor === 'number') return aFechaISO(new Date(Math.round((valor - 25569) * 86400000))) ?? undefined
  const s = String(valor).trim()
  if (!s) return ''
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (m) return fechaValida(+m[1], +m[2], +m[3]) ?? undefined
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s)
  if (m) return fechaValida(+m[3], +m[2], +m[1]) ?? undefined
  return undefined
}

// Devuelve el monto como texto ('' si está vacío) o undefined si no se entiende.
function leerMonto(valor) {
  if (valor == null || valor === '') return ''
  if (typeof valor === 'number') return valor >= 0 ? String(Math.round(valor * 100) / 100) : undefined
  let s = String(valor).replace(/[\s$₡Q€]|USD|CRC|GTQ|PAB/gi, '')
  if (!s) return ''
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.') // 1.234,56
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '') // 1,234.56
  else if (/^\d+,\d+$/.test(s)) s = s.replace(',', '.') // 1234,56
  if (!/^\d+(\.\d+)?$/.test(s)) return undefined
  return String(Math.round(Number(s) * 100) / 100)
}

function leerEstado(valor) {
  const n = normalizar(valor).replace(/_/g, ' ')
  if (n === 'finalizado') return 'finalizado'
  if (n === 'en curso' || n === 'encurso') return 'en_curso'
  return n ? undefined : ''
}

/**
 * Lee un .xlsx y devuelve { filas, advertencias }.
 * Cada fila: { fila, datos, errores, nombres } donde `datos` tiene la forma del formulario
 * y `nombres` trae país y etiquetas legibles para la revisión.
 * paisFijo: id del país del editor (null para admin).
 */
export async function leerExcel(archivo, { paises, etiquetas, paisFijo = null }) {
  if (!/\.xlsx$/i.test(archivo.name)) {
    throw new Error('El archivo debe ser de Excel (.xlsx). Si es .xls o .csv, ábrelo en Excel y guárdalo como .xlsx.')
  }
  if (archivo.size > MAX_BYTES) throw new Error('El archivo supera el máximo de 5 MB.')

  const ExcelJS = await cargarExcelJS()
  const libro = new ExcelJS.Workbook()
  try {
    await libro.xlsx.load(await archivo.arrayBuffer())
  } catch {
    throw new Error('No se pudo leer el archivo. Verifica que sea un Excel válido y que no tenga contraseña.')
  }

  const hoja =
    libro.worksheets.find((h) => normalizar(h.name) === 'proyectos') ?? libro.worksheets[0]
  if (!hoja) throw new Error('El archivo no tiene hojas.')

  // Encabezados: la primera de las 5 primeras filas que tenga al menos dos columnas conocidas.
  let filaEncabezado = null
  let mapa = []
  for (let r = 1; r <= Math.min(5, hoja.rowCount); r++) {
    const candidatos = []
    hoja.getRow(r).eachCell({ includeEmpty: false }, (celda, col) => {
      const campo = campoDeEncabezado(texto(valorCelda(celda.value)))
      if (campo) candidatos.push({ col, campo })
    })
    if (candidatos.length >= 2) {
      filaEncabezado = r
      mapa = candidatos
      break
    }
  }
  const tiene = (campo) => mapa.some((m) => m.campo === campo)
  if (!filaEncabezado || !tiene('titulo') || !tiene('cliente')) {
    throw new Error('No se encontraron las columnas "Título" y "Cliente". Descarga la plantilla y úsala como base.')
  }

  const paisPorClave = new Map()
  for (const p of paises) {
    paisPorClave.set(normalizar(p.nombre), p)
    paisPorClave.set(normalizar(p.codigo), p)
  }
  const etiquetaPorNombre = new Map(etiquetas.map((e) => [normalizar(e.nombre), e]))
  const paisDelEditor = paisFijo ? paises.find((p) => p.id === paisFijo) : null

  const filas = []
  const advertencias = []
  for (let r = filaEncabezado + 1; r <= hoja.rowCount; r++) {
    const fila = hoja.getRow(r)
    const crudo = { etiqueta: [] }
    for (const { col, campo } of mapa) {
      const v = valorCelda(fila.getCell(col).value)
      if (campo === 'etiqueta') crudo.etiqueta.push(v)
      else crudo[campo] = v
    }
    // Vacía aunque tenga el N.º escrito (por si numeraron filas de más).
    const vacia = Object.entries(crudo).every(([k, v]) =>
      k === 'numero' ? true : k === 'etiqueta' ? v.every((x) => !texto(x)) : !texto(v),
    )
    if (vacia) continue

    if (filas.length === MAX_FILAS) {
      throw new Error(`El archivo tiene más de ${MAX_FILAS} proyectos. Divídelo en varios archivos.`)
    }

    const errores = []
    // El N.º une el proyecto con sus evidencias (1.1, 1.2…). Sus errores van aparte porque
    // solo importan en la carga masiva; con un solo proyecto se usa el formulario.
    const erroresNumero = []
    let numero = null
    if (tiene('numero')) {
      const n = texto(crudo.numero)
      if (!n) erroresNumero.push('Falta el N.º del proyecto.')
      else if (!/^\d+$/.test(n) || Number(n) < 1) erroresNumero.push(`N.º no válido: "${n}". Usa 1, 2, 3…`)
      else numero = Number(n)
    }
    const titulo = texto(crudo.titulo)
    const cliente = texto(crudo.cliente)
    if (!titulo) errores.push('Falta el título.')
    else if (titulo.length > 300) errores.push('El título supera 300 caracteres.')
    if (!cliente) errores.push('Falta el cliente.')
    else if (cliente.length > 300) errores.push('El cliente supera 300 caracteres.')

    // País
    let pais = null
    const paisTexto = texto(crudo.pais)
    if (paisTexto) {
      pais = paisPorClave.get(normalizar(paisTexto)) ?? null
      if (!pais) errores.push(`País desconocido: "${paisTexto}".`)
    }
    if (paisDelEditor) {
      if (!pais && !paisTexto) pais = paisDelEditor
      else if (pais && pais.id !== paisDelEditor.id) {
        errores.push(`Solo puedes crear proyectos de ${paisDelEditor.nombre}.`)
      }
    } else if (!paisTexto) {
      errores.push('Falta el país.')
    }

    // Estado y fechas
    const estado = leerEstado(crudo.estado)
    if (estado === '') errores.push('Falta el estado (Finalizado o En curso).')
    if (estado === undefined) errores.push(`Estado desconocido: "${texto(crudo.estado)}".`)
    const fechaInicio = leerFecha(crudo.fechaInicio)
    const fechaFin = leerFecha(crudo.fechaFin)
    if (fechaInicio === undefined) errores.push(`Fecha de inicio no válida: "${texto(crudo.fechaInicio)}".`)
    if (fechaFin === undefined) errores.push(`Fecha de fin no válida: "${texto(crudo.fechaFin)}".`)
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      errores.push('La fecha de fin es anterior a la de inicio.')
    }
    if (estado === 'finalizado' && fechaFin === '') errores.push('Un proyecto finalizado necesita fecha de fin.')

    // Etiquetas: una por columna, o varias separadas por ";" en una celda
    const nombresEtiquetas = crudo.etiqueta
      .flatMap((v) => texto(v).split(/[;\n]/))
      .map((s) => s.trim())
      .filter(Boolean)
    const etiquetasFila = []
    for (const nombre of nombresEtiquetas) {
      const e = etiquetaPorNombre.get(normalizar(nombre))
      if (!e) errores.push(`Etiqueta desconocida: "${nombre}".`)
      else if (!etiquetasFila.includes(e)) etiquetasFila.push(e)
    }
    if (nombresEtiquetas.length === 0) errores.push('Falta al menos una etiqueta.')

    // Monto y moneda
    const monto = leerMonto(crudo.monto)
    if (monto === undefined) errores.push(`Monto no válido: "${texto(crudo.monto)}".`)
    const moneda = (texto(crudo.moneda) || 'USD').toUpperCase()
    if (!/^[A-Z]{3}$/.test(moneda)) errores.push(`Moneda no válida: "${texto(crudo.moneda)}". Usa 3 letras, p. ej. USD.`)

    filas.push({
      fila: r,
      numero,
      errores,
      erroresNumero,
      nombres: { pais: pais?.nombre ?? paisTexto, etiquetas: etiquetasFila.map((e) => e.nombre) },
      datos: {
        titulo,
        cliente,
        paisId: pais?.id ?? '',
        estado: estado || 'finalizado',
        fechaInicio: fechaInicio || '',
        fechaFin: fechaFin || '',
        descripcion: texto(crudo.descripcion),
        resultados: texto(crudo.resultados),
        contactoReferencia: texto(crudo.contactoReferencia),
        etiquetas: etiquetasFila.map((e) => e.id),
        monto: monto ?? '',
        moneda,
      },
    })
  }

  // Posibles duplicados dentro del mismo archivo
  const vistos = new Map()
  for (const f of filas) {
    const clave = normalizar(f.datos.titulo) + '|' + normalizar(f.datos.cliente)
    if (!f.datos.titulo) continue
    if (vistos.has(clave)) {
      advertencias.push(`Las filas ${vistos.get(clave)} y ${f.fila} parecen el mismo proyecto (mismo título y cliente).`)
    } else vistos.set(clave, f.fila)
  }

  // N.º repetidos
  const porNumero = new Map()
  for (const f of filas) {
    if (f.numero == null) continue
    const previa = porNumero.get(f.numero)
    if (previa) {
      f.erroresNumero.push(`El N.º ${f.numero} ya se usó en la fila ${previa}.`)
    } else porNumero.set(f.numero, f.fila)
  }

  return { filas, advertencias, tieneNumero: tiene('numero') }
}

export function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
