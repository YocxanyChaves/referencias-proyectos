import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CamposProyecto, { DATOS_VACIOS, validarDatosProyecto } from '../components/CamposProyecto'
import EvidenciasNuevas, { archivoDemasiadoGrande } from '../components/EvidenciasNuevas'
import ImportacionMasiva from '../components/ImportacionMasiva'
import ZonaExcel from '../components/ZonaExcel'
import { useAuth } from '../context/AuthContext'
import { separarPaquete } from '../lib/evidenciasCarpeta'
import { descargarArchivo, generarPlantilla, leerExcel } from '../lib/excelProyectos'
import { listarEtiquetas, listarPaises } from '../services/catalogosService'
import { crearProyecto } from '../services/proyectosService'

export default function NuevoProyectoPage() {
  const { perfil, rol } = useAuth()
  const navigate = useNavigate()
  const esAdmin = rol === 'admin'

  const [etiquetas, setEtiquetas] = useState([])
  const [paises, setPaises] = useState([])
  const [datos, setDatos] = useState({ ...DATOS_VACIOS, paisId: esAdmin ? '' : perfil.paisId })
  const [evidencias, setEvidencias] = useState([])
  const [progreso, setProgreso] = useState(null)
  const [error, setError] = useState(null)
  const [leyendoExcel, setLeyendoExcel] = useState(false)
  const [estadoExcel, setEstadoExcel] = useState(null) // { error, errores, aviso, pendientes }
  // { id, nombreArchivo, nombreCarpeta, evidenciasIniciales, filas, advertencias, tieneNumero }
  const [importacion, setImportacion] = useState(null)
  const paisFijo = esAdmin ? null : perfil.paisId

  useEffect(() => {
    Promise.all([listarEtiquetas(), listarPaises()])
      .then(([e, p]) => {
        setEtiquetas(e)
        setPaises(p)
      })
      .catch((e) => setError(e.message))
  }, [])

  async function cargarExcel(archivo) {
    setLeyendoExcel(true)
    setEstadoExcel(null)
    try {
      const { filas, advertencias, tieneNumero } = await leerExcel(archivo, { paises, etiquetas, paisFijo })
      if (filas.length === 0) {
        setImportacion(null)
        setEstadoExcel({
          error: 'El archivo no tiene proyectos. Llena al menos una fila debajo de los encabezados.',
        })
      } else if (importacion) {
        // Se reemplazó el Excel desde la revisión: se conservan las evidencias ya cargadas.
        setImportacion((i) => ({ ...i, nombreArchivo: archivo.name, filas, advertencias, tieneNumero }))
      } else if (filas.length === 1) {
        // Un solo proyecto: se llena el formulario para revisarlo y adjuntar evidencias.
        const [fila] = filas
        setImportacion(null)
        setDatos({ ...fila.datos, paisId: esAdmin ? String(fila.datos.paisId) : perfil.paisId })
        setEstadoExcel({
          aviso: `Datos cargados desde ${archivo.name}. Revísalos y adjunta las evidencias.`,
          pendientes: fila.errores,
        })
      } else {
        setImportacion({ id: Date.now(), nombreArchivo: archivo.name, filas, advertencias, tieneNumero })
      }
    } catch (e) {
      setImportacion(null)
      setEstadoExcel({ error: e.message })
    } finally {
      setLeyendoExcel(false)
    }
  }

  // Carpeta de carga completa: el Excel de proyectos + la carpeta "Evidencias".
  async function cargarPaquete(items) {
    setLeyendoExcel(true)
    setEstadoExcel(null)
    try {
      const paquete = separarPaquete(items)
      if (paquete.errores.length) {
        setEstadoExcel({ error: 'La carpeta no tiene la estructura esperada:', errores: paquete.errores })
        return
      }
      const { filas, advertencias, tieneNumero } = await leerExcel(paquete.excel, {
        paises,
        etiquetas,
        paisFijo,
      })
      if (filas.length === 0) {
        setEstadoExcel({
          error: `El Excel "${paquete.excel.name}" no tiene proyectos. Llena al menos una fila debajo de los encabezados.`,
        })
        return
      }
      setImportacion({
        id: Date.now(),
        nombreArchivo: paquete.excel.name,
        nombreCarpeta: paquete.nombreCarpeta,
        evidenciasIniciales: paquete.evidencias,
        filas,
        advertencias: [...paquete.advertencias, ...advertencias],
        tieneNumero,
      })
    } catch (e) {
      setEstadoExcel({ error: e.message })
    } finally {
      setLeyendoExcel(false)
    }
  }

  async function bajarPlantilla() {
    try {
      const blob = await generarPlantilla({ paises, etiquetas, paisFijo })
      descargarArchivo(blob, 'plantilla-proyectos.xlsx')
    } catch (e) {
      setEstadoExcel({ error: `No se pudo generar la plantilla: ${e.message}` })
    }
  }

  function validar() {
    const problema = validarDatosProyecto(datos)
    if (problema) return problema
    if (evidencias.length === 0)
      return 'Adjunta al menos una evidencia. No se aceptan proyectos sin evidencias.'
    const grande = archivoDemasiadoGrande(evidencias)
    if (grande) return `"${grande.archivo.name}" supera el máximo de 50 MB.`
    return null
  }

  async function enviar(e) {
    e.preventDefault()
    const problema = validar()
    if (problema) {
      setError(problema)
      return
    }
    setError(null)
    try {
      await crearProyecto({ ...datos, paisId: Number(datos.paisId) }, evidencias, setProgreso)
      navigate('/', { state: { mensaje: `Proyecto "${datos.titulo.trim()}" creado.` } })
    } catch (err) {
      setError(`No se pudo crear el proyecto: ${err.message}`)
      setProgreso(null)
    }
  }

  const guardando = progreso !== null

  if (importacion) {
    return (
      <ImportacionMasiva
        key={importacion.id}
        {...importacion}
        onCancelar={() => setImportacion(null)}
        onCargarOtro={cargarExcel}
      />
    )
  }

  return (
    <div className="nuevo-proyecto">
      <form className="formulario" onSubmit={enviar}>
        <h1>Nuevo proyecto</h1>

        <CamposProyecto
          datos={datos}
          setDatos={setDatos}
          paises={esAdmin ? paises : null}
          etiquetas={etiquetas}
          nombrePais={perfil.paisNombre}
        />

        <section className="tarjeta">
          <h2>Evidencias *</h2>
          <p className="ayuda">
            Al menos una. Cualquier tipo de archivo, máximo 50 MB cada uno. Desmarca “Compartible” para
            documentos de uso interno (p. ej. contratos con precios): no serán visibles para el rol consulta
            ni se exportarán.
          </p>
          <EvidenciasNuevas evidencias={evidencias} setEvidencias={setEvidencias} deshabilitado={guardando} />
        </section>

        {error && <p className="error">{error}</p>}
        {progreso && <p className="progreso">{progreso}</p>}

        <div className="acciones">
          <button type="button" className="secundario" onClick={() => navigate('/')} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear proyecto'}
          </button>
        </div>
      </form>
      <ZonaExcel
        onArchivo={cargarExcel}
        onPaquete={cargarPaquete}
        onDescargarPlantilla={bajarPlantilla}
        ocupado={leyendoExcel || guardando || etiquetas.length === 0}
        leyendo={leyendoExcel}
        estado={estadoExcel}
      />
    </div>
  )
}
