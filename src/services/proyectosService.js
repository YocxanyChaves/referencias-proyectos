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

// Crea el proyecto con sus etiquetas, monto y evidencias.
// Proyecto, etiquetas y monto se guardan en una sola transacción (función crear_proyecto).
// Las evidencias se suben después, porque el almacenamiento exige que el proyecto exista;
// si una falla, se borran los archivos ya subidos y el proyecto (en cascada, todo lo demás).
// La autoría (creado_por, subido_por) la pone la base de datos con el usuario de la sesión.
export async function crearProyecto(datos, evidencias, onProgreso = () => {}) {
  onProgreso('Guardando proyecto…')
  const id = unwrap(
    await supabase.rpc('crear_proyecto', {
      p_titulo: datos.titulo.trim(),
      p_cliente: datos.cliente.trim(),
      p_pais_id: datos.paisId,
      p_estado: datos.estado,
      p_etiquetas: datos.etiquetas,
      p_fecha_inicio: datos.fechaInicio || null,
      p_fecha_fin: datos.fechaFin || null,
      p_descripcion: datos.descripcion.trim() || null,
      p_resultados: datos.resultados.trim() || null,
      p_contacto_referencia: datos.contactoReferencia.trim() || null,
      p_monto: datos.monto === '' ? null : Number(datos.monto),
      p_moneda: datos.moneda,
    }),
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
