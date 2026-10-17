import { supabase, unwrap } from './supabaseClient'
import { subirEvidencia, eliminarArchivos } from './evidenciasService'

const CAMPOS_LISTADO = `
  id, titulo, cliente, estado, fecha_inicio, fecha_fin, descripcion,
  pais:paises(id, nombre, codigo),
  proyecto_etiquetas(etiqueta:etiquetas(id, nombre))
`

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

// Importación masiva: todos los proyectos en una sola transacción (función crear_proyectos).
// Si uno falla no se guarda ninguno, y el error indica la fila del Excel ("Fila 7: …").
// filas: [{ fila, datos }] con `datos` en la forma del formulario.
export async function crearProyectos(filas) {
  const ids = unwrap(
    await supabase.rpc('crear_proyectos', {
      p_proyectos: filas.map(({ fila, datos }) => ({ fila, ...aCamposProyecto(datos) })),
    }),
  )
  return ids.length
}
