import { invocar, supabase, unwrap } from './supabaseClient'
import { subirEvidencia, eliminarArchivos } from './evidenciasService'

const CAMPOS_LISTADO = `
  id, titulo, cliente, estado, fecha_inicio, fecha_fin, descripcion,
  pais:paises(id, nombre, codigo),
  proyecto_etiquetas(etiqueta:etiquetas(id, nombre)),
  evidencias(count)
`

// Las evidencias y el monto que llegan ya vienen filtrados por las políticas RLS:
// el rol consulta solo recibe evidencias compartibles y nunca recibe el monto.
const CAMPOS_DETALLE = `
  id, titulo, cliente, estado, fecha_inicio, fecha_fin, descripcion, resultados,
  contacto_referencia, creado_en, actualizado_en,
  pais:paises(id, nombre, codigo),
  proyecto_etiquetas(etiqueta:etiquetas(id, nombre)),
  evidencias(id, tipo, descripcion, nombre_original, tamano_bytes, compartible, subido_en),
  monto:proyecto_montos(monto, moneda)
`

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function aProyecto(fila) {
  return {
    id: fila.id,
    titulo: fila.titulo,
    cliente: fila.cliente,
    estado: fila.estado,
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    descripcion: fila.descripcion,
    pais: fila.pais,
    etiquetas: (fila.proyecto_etiquetas ?? [])
      .map((pe) => pe.etiqueta)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    cantidadEvidencias: fila.evidencias?.[0]?.count ?? null,
  }
}

// Devuelve el proyecto con sus evidencias visibles para quien consulta, o null si no existe
// o no tiene acceso. `monto` es null cuando el usuario no puede verlo.
export async function obtenerProyecto(id) {
  if (!UUID.test(id)) return null
  const fila = unwrap(await supabase.from('proyectos').select(CAMPOS_DETALLE).eq('id', id).maybeSingle())
  if (!fila) return null
  const monto = Array.isArray(fila.monto) ? fila.monto[0] : fila.monto
  return {
    ...aProyecto(fila),
    resultados: fila.resultados,
    contactoReferencia: fila.contacto_referencia,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
    monto: monto ? { valor: Number(monto.monto), moneda: monto.moneda } : null,
    evidencias: (fila.evidencias ?? [])
      .map((e) => ({
        id: e.id,
        tipo: e.tipo,
        descripcion: e.descripcion,
        nombre: e.nombre_original,
        tamano: e.tamano_bytes,
        compartible: e.compartible,
        subidoEn: e.subido_en,
      }))
      // Orden natural por nombre: 1.2 antes que 1.10
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true })),
  }
}

// Busca proyectos que tengan TODAS las etiquetas indicadas, más filtros opcionales.
// Usa la función buscar_proyectos del esquema base (orden: fecha de fin descendente).
export async function buscarProyectos(
  { etiquetas = [], paises = [], desde = '', hasta = '', texto = '' } = {},
  { pagina = 0, tamano = 20 } = {},
) {
  const inicio = pagina * tamano
  const filas = unwrap(
    await supabase
      .rpc('buscar_proyectos', {
        p_etiquetas: etiquetas,
        p_paises: paises,
        p_desde: desde || null,
        p_hasta: hasta || null,
        p_texto: texto.trim() || null,
      })
      .select(CAMPOS_LISTADO)
      .range(inicio, inicio + tamano), // pide uno extra para saber si hay más
  )
  return {
    proyectos: filas.slice(0, tamano).map(aProyecto),
    hayMas: filas.length > tamano,
  }
}

// Convierte los datos del formulario a los campos de crear_proyecto (sin el prefijo p_).
function aCamposProyecto(datos) {
  return {
    titulo: datos.titulo.trim(),
    cliente: datos.cliente.trim(),
    pais_id: Number(datos.paisId),
    estado: datos.estado,
    etiquetas: datos.etiquetas,
    fecha_inicio: datos.fechaInicio || null,
    fecha_fin: datos.fechaFin || null,
    descripcion: datos.descripcion.trim() || null,
    resultados: datos.resultados.trim() || null,
    contacto_referencia: datos.contactoReferencia.trim() || null,
    monto: datos.monto === '' ? null : Number(datos.monto),
    moneda: datos.moneda,
  }
}

// Guarda datos, etiquetas y monto en una sola transacción (función actualizar_proyecto).
export async function actualizarProyecto(id, datos) {
  const campos = aCamposProyecto(datos)
  unwrap(
    await supabase.rpc('actualizar_proyecto', {
      p_id: id,
      ...Object.fromEntries(Object.entries(campos).map(([k, v]) => [`p_${k}`, v])),
    }),
  )
}

// Elimina el proyecto con todas sus evidencias y archivos (Edge Function eliminar-proyecto).
export async function eliminarProyecto(id) {
  return invocar('eliminar-proyecto', { proyectoId: id })
}

// Crea el proyecto con sus etiquetas, monto y evidencias.
// Proyecto, etiquetas y monto se guardan en una sola transacción (función crear_proyecto).
// Las evidencias se suben después, porque el almacenamiento exige que el proyecto exista;
// si una falla, se borran los archivos ya subidos y el proyecto (en cascada, todo lo demás).
// La autoría (creado_por, subido_por) la pone la base de datos con el usuario de la sesión.
export async function crearProyecto(datos, evidencias, onProgreso = () => {}) {
  onProgreso('Guardando proyecto…')
  const campos = aCamposProyecto(datos)
  const id = unwrap(
    await supabase.rpc(
      'crear_proyecto',
      Object.fromEntries(Object.entries(campos).map(([k, v]) => [`p_${k}`, v])),
    ),
  )

  const rutasSubidas = []
  try {
    for (const [i, evidencia] of evidencias.entries()) {
      onProgreso(`Subiendo evidencia ${i + 1} de ${evidencias.length}: ${evidencia.archivo.name}`)
      const { ruta_archivo } = await subirEvidencia(id, evidencia)
      rutasSubidas.push(ruta_archivo)
    }
  } catch (e) {
    onProgreso('Error; deshaciendo cambios…')
    // Los archivos se borran antes que el proyecto: el permiso de borrado depende de su país.
    await eliminarArchivos(rutasSubidas).catch(() => {})
    await supabase.from('proyectos').delete().eq('id', id)
    throw e
  }

  return id
}

const SUBIDAS_SIMULTANEAS = 3

// Importación masiva con evidencias.
// 1. Todos los proyectos se crean en una sola transacción (función crear_proyectos);
//    si uno falla no se guarda ninguno y el error indica la fila del Excel ("Fila 7: …").
// 2. Se suben las evidencias de cada proyecto. Si una falla, se borran los archivos ya
//    subidos y todos los proyectos creados, para no dejar proyectos sin evidencias.
// filas: [{ fila, numero, datos }]; evidenciasPorNumero: { [numero]: evidencia[] }.
// onProgreso(texto, hechas, total)
export async function importarProyectos(filas, evidenciasPorNumero, onProgreso = () => {}) {
  const tareas = []
  onProgreso('Creando proyectos…', 0, 0)
  const ids = unwrap(
    await supabase.rpc('crear_proyectos', {
      p_proyectos: filas.map(({ fila, datos }) => ({ fila, ...aCamposProyecto(datos) })),
    }),
  )
  filas.forEach((f, i) => {
    for (const evidencia of evidenciasPorNumero[f.numero] ?? [])
      tareas.push({ proyectoId: ids[i], evidencia })
  })

  const rutasSubidas = []
  let siguiente = 0
  let hechas = 0
  let fallo = null
  async function trabajador() {
    while (!fallo && siguiente < tareas.length) {
      const { proyectoId, evidencia } = tareas[siguiente++]
      try {
        const { ruta_archivo } = await subirEvidencia(proyectoId, evidencia)
        rutasSubidas.push(ruta_archivo)
        hechas++
        onProgreso(`Subiendo evidencias: ${evidencia.archivo.name}`, hechas, tareas.length)
      } catch (e) {
        fallo ??= new Error(`No se pudo subir "${evidencia.archivo.name}": ${e.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: SUBIDAS_SIMULTANEAS }, trabajador))

  if (fallo) {
    onProgreso('Error; deshaciendo la importación…', hechas, tareas.length)
    // Archivos primero: el permiso de borrado depende del país del proyecto.
    for (let i = 0; i < rutasSubidas.length; i += 50) {
      await eliminarArchivos(rutasSubidas.slice(i, i + 50)).catch(() => {})
    }
    let error = null
    for (let i = 0; i < ids.length && !error; i += 100) {
      ;({ error } = await supabase
        .from('proyectos')
        .delete()
        .in('id', ids.slice(i, i + 100)))
    }
    if (error) {
      throw new Error(
        `${fallo.message} Además no se pudieron borrar los proyectos creados (${error.message}); ` +
          'avisa a un administrador.',
      )
    }
    throw fallo
  }

  return { proyectos: ids.length, evidencias: tareas.length }
}
