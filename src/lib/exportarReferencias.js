// Fichas de referencia en PDF y Excel para adjuntar a una propuesta.
// Reciben solo lo que entregó el servidor (exportar-referencias): sin montos ni evidencias internas.
// jsPDF y ExcelJS se cargan solo cuando se usan.
import { ESTADOS_PROYECTO, TIPOS_EVIDENCIA } from '../services/catalogosService'

const NOMBRE_ESTADO = Object.fromEntries(ESTADOS_PROYECTO.map((e) => [e.valor, e.nombre]))
const NOMBRE_TIPO = Object.fromEntries(TIPOS_EVIDENCIA.map((t) => [t.valor, t.nombre]))
const AZUL = [31, 95, 168] // --primario
const GRIS = [93, 107, 122] // --suave

function formatearFecha(fecha) {
  if (!fecha) return null
  const [a, m, d] = fecha.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

function periodo(p) {
  const inicio = formatearFecha(p.fechaInicio)
  const fin = formatearFecha(p.fechaFin)
  if (inicio && fin) return `${inicio} – ${fin}`
  if (inicio) return `Desde ${inicio}`
  if (fin) return `Hasta ${fin}`
  return null
}

function hoy() {
  return new Date().toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function evidenciaTexto(e) {
  return `${NOMBRE_TIPO[e.tipo] ?? e.tipo}: ${e.nombre}${e.descripcion ? ` (${e.descripcion})` : ''}`
}

// Filas Campo / Valor de la ficha; se omiten los campos vacíos.
function camposFicha(p) {
  return [
    ['Cliente', p.cliente],
    ['País', p.pais],
    ['Período', periodo(p)],
    ['Estado', NOMBRE_ESTADO[p.estado]],
    ['Áreas temáticas', p.etiquetas.join(', ')],
    ['Descripción', p.descripcion],
    ['Resultados', p.resultados],
    ['Contacto de referencia', p.contacto],
    ['Evidencias disponibles', p.evidencias.map(evidenciaTexto).join('\n')],
    ['Carpeta de evidencias', p.carpeta],
  ].filter(([, valor]) => valor)
}

// Nombre válido para un archivo o carpeta en Windows, macOS y Linux.
function nombreSeguro(texto, maximo = 80) {
  const limpio = texto
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximo)
    .replace(/[. ]+$/, '')
  return limpio || 'sin-nombre'
}

// El archivo se llama como el título (con espacios y tildes), sin caracteres no válidos.
export function nombreArchivo(titulo, extension) {
  return `${nombreSeguro(titulo)}.${extension}`
}

export async function generarPdf({ titulo, proyectos }) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margen = 18
  const ancho = doc.internal.pageSize.getWidth() - margen * 2
  const alto = doc.internal.pageSize.getHeight()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...AZUL)
  doc.text(doc.splitTextToSize(titulo, ancho), margen, 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRIS)
  const cantidad = proyectos.length === 1 ? '1 proyecto' : `${proyectos.length} proyectos`
  doc.text(`${cantidad} · ${hoy()}`, margen, 32)
  let y = 42

  proyectos.forEach((p, i) => {
    // Cada ficha empieza en página nueva si no cabe al menos el encabezado y unas líneas.
    if (y > alto - 60) {
      doc.addPage()
      y = 22
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(29, 37, 48)
    const lineas = doc.splitTextToSize(`${i + 1}. ${p.titulo}`, ancho)
    doc.text(lineas, margen, y)
    y += lineas.length * 5.5 + 1

    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen, top: 18, bottom: 18 },
      body: camposFicha(p),
      theme: 'grid',
      rowPageBreak: 'avoid', // una fila no se parte entre páginas
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 2.2, lineColor: [216, 222, 229], valign: 'top' },
      columnStyles: {
        0: { cellWidth: 42, fontStyle: 'bold', textColor: GRIS, fillColor: [244, 246, 248] },
        1: { textColor: [29, 37, 48] },
      },
    })
    y = doc.lastAutoTable.finalY + 12
  })

  const paginas = doc.getNumberOfPages()
  for (let n = 1; n <= paginas; n++) {
    doc.setPage(n)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRIS)
    doc.text(`Página ${n} de ${paginas}`, doc.internal.pageSize.getWidth() - margen, alto - 8, { align: 'right' })
  }

  return doc.output('blob')
}

export async function generarExcel({ titulo, proyectos }) {
  const modulo = await import('exceljs')
  const ExcelJS = modulo.default ?? modulo
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Referencias de Proyectos'
  libro.title = titulo

  const hoja = libro.addWorksheet('Referencias', { views: [{ state: 'frozen', ySplit: 4 }] })
  const conContacto = proyectos.some((p) => p.contacto)
  const columnas = [
    ['N.º', 6, (p, i) => i + 1],
    ['Proyecto', 36, (p) => p.titulo],
    ['Cliente', 26, (p) => p.cliente],
    ['País', 14, (p) => p.pais],
    ['Inicio', 12, (p) => formatearFecha(p.fechaInicio)],
    ['Fin', 12, (p) => formatearFecha(p.fechaFin)],
    ['Estado', 12, (p) => NOMBRE_ESTADO[p.estado]],
    ['Áreas temáticas', 30, (p) => p.etiquetas.join(', ')],
    ['Descripción', 60, (p) => p.descripcion],
    ['Resultados', 50, (p) => p.resultados],
    conContacto && ['Contacto de referencia', 30, (p) => p.contacto],
    ['Evidencias disponibles', 45, (p) => p.evidencias.map(evidenciaTexto).join('\n')],
    proyectos.some((p) => p.carpeta) && ['Carpeta de evidencias', 40, (p) => p.carpeta],
  ].filter(Boolean)
  hoja.columns = columnas.map(([, width]) => ({ width }))

  hoja.mergeCells(1, 1, 1, columnas.length)
  hoja.getCell('A1').value = titulo
  hoja.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1F5FA8' } }
  hoja.getCell('A2').value = `${proyectos.length === 1 ? '1 proyecto' : `${proyectos.length} proyectos`} · ${hoy()}`
  hoja.getCell('A2').font = { color: { argb: 'FF5D6B7A' } }

  const encabezado = hoja.getRow(4)
  encabezado.values = columnas.map(([nombre]) => nombre)
  encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  encabezado.alignment = { vertical: 'middle', wrapText: true }
  encabezado.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5FA8' } }
  })

  proyectos.forEach((p, i) => {
    const fila = hoja.addRow(columnas.map(([, , valor]) => valor(p, i)))
    fila.alignment = { vertical: 'top', wrapText: true }
  })
  hoja.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columnas.length } }

  const buffer = await libro.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

const DESCARGAS_SIMULTANEAS = 3

// Baja los archivos de las evidencias (URLs firmadas que entregó el servidor).
async function bajarEvidencias(tareas, onProgreso) {
  const archivos = []
  let siguiente = 0
  let hechas = 0
  let fallo = null
  async function trabajador() {
    while (!fallo && siguiente < tareas.length) {
      const tarea = tareas[siguiente++]
      try {
        if (!tarea.url) throw new Error('no se pudo preparar el enlace')
        const respuesta = await fetch(tarea.url)
        if (!respuesta.ok) throw new Error(`el servidor respondió ${respuesta.status}`)
        archivos.push({ ruta: tarea.ruta, datos: new Uint8Array(await respuesta.arrayBuffer()) })
        onProgreso(`Descargando evidencias: ${++hechas} de ${tareas.length}`)
      } catch (e) {
        fallo ??= new Error(`No se pudo descargar "${tarea.nombre}": ${e.message}. Inténtalo de nuevo.`)
      }
    }
  }
  await Promise.all(Array.from({ length: DESCARGAS_SIMULTANEAS }, trabajador))
  if (fallo) throw fallo
  return archivos
}

// .zip con la ficha (PDF, Excel o ambos) y, si vienen URLs, una carpeta por proyecto con sus evidencias:
//   <titulo>/<titulo>.pdf, <titulo>/Evidencias/01 Proyecto/1.1 Acta.pdf
export async function generarPaquete({ titulo, proyectos, formatos, onProgreso = () => {} }) {
  const raiz = nombreSeguro(titulo)
  const digitos = Math.max(2, String(proyectos.length).length) // 01, 02… para que se ordenen bien
  const tareas = []

  const conCarpetas = proyectos.map((p, i) => {
    const conArchivos = p.evidencias.filter((e) => 'url' in e)
    if (conArchivos.length === 0) return p
    const carpeta = `Evidencias/${String(i + 1).padStart(digitos, '0')} ${nombreSeguro(p.titulo, 60)}`
    const usados = new Set()
    for (const e of conArchivos) {
      // Dos evidencias con el mismo nombre en un proyecto: "Acta (2).pdf"
      let nombre = nombreSeguro(e.nombre, 120)
      for (let n = 2; usados.has(nombre.toLowerCase()); n++) {
        const punto = e.nombre.lastIndexOf('.')
        const base = nombreSeguro(punto > 0 ? e.nombre.slice(0, punto) : e.nombre, 110)
        nombre = `${base} (${n})${punto > 0 ? e.nombre.slice(punto) : ''}`
      }
      usados.add(nombre.toLowerCase())
      tareas.push({ url: e.url, nombre: e.nombre, ruta: `${raiz}/${carpeta}/${nombre}` })
    }
    return { ...p, carpeta }
  })

  const archivos = await bajarEvidencias(tareas, onProgreso)

  onProgreso('Generando la ficha…')
  const datos = { titulo, proyectos: conCarpetas }
  const fichas = [
    ['pdf', 'pdf', generarPdf],
    ['excel', 'xlsx', generarExcel],
  ].filter(([formato]) => formatos.includes(formato))
  for (const [, extension, generar] of fichas) {
    const blob = await generar(datos)
    archivos.push({ ruta: `${raiz}/${raiz}.${extension}`, datos: new Uint8Array(await blob.arrayBuffer()) })
  }

  onProgreso('Armando el .zip…')
  const { zip } = await import('fflate')
  // Sin compresión (level 0): PDF, Office e imágenes ya vienen comprimidos y así es mucho más rápido.
  const entrada = Object.fromEntries(archivos.map((a) => [a.ruta, [a.datos, { level: 0 }]]))
  const contenido = await new Promise((resolver, rechazar) =>
    zip(entrada, (error, datos) => (error ? rechazar(error) : resolver(datos))),
  )
  return new Blob([contenido], { type: 'application/zip' })
}
