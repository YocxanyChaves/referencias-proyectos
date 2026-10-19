import { useEffect, useState } from 'react'
import {
  eliminarEtiqueta,
  eliminarPais,
  guardarEtiqueta,
  guardarPais,
  listarEtiquetasConUso,
  listarPaisesConUso,
} from '../services/catalogosService'

const CODIGO_PAIS = /^[A-Za-z]{2}$/

function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`
}

// Lista editable de un catálogo: agregar, renombrar y eliminar lo que no está en uso.
function Catalogo({ titulo, ayuda, elementos, conCodigo = false, uso, enUso, guardar, eliminar }) {
  const [edicion, setEdicion] = useState(null) // { id?, nombre, codigo }; sin id = nuevo
  const [porEliminar, setPorEliminar] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(null)

  async function ejecutar(accion) {
    setOcupado(true)
    setError(null)
    try {
      await accion()
      setEdicion(null)
      setPorEliminar(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  function enviar(e) {
    e.preventDefault()
    if (!edicion.nombre.trim()) return setError('El nombre no puede quedar vacío.')
    if (conCodigo && !CODIGO_PAIS.test(edicion.codigo.trim())) {
      return setError('El código debe tener dos letras (por ejemplo, CR).')
    }
    ejecutar(() => guardar(edicion))
  }

  const formulario = (
    <form className="catalogo-form" onSubmit={enviar}>
      <input
        value={edicion?.nombre ?? ''}
        onChange={(e) => setEdicion((d) => ({ ...d, nombre: e.target.value }))}
        placeholder="Nombre"
        aria-label="Nombre"
        autoFocus
      />
      {conCodigo && (
        <input
          className="codigo"
          value={edicion?.codigo ?? ''}
          onChange={(e) => setEdicion((d) => ({ ...d, codigo: e.target.value }))}
          placeholder="Código"
          aria-label="Código de dos letras"
          maxLength={2}
        />
      )}
      <button type="submit" disabled={ocupado}>
        Guardar
      </button>
      <button type="button" className="secundario" onClick={() => setEdicion(null)} disabled={ocupado}>
        Cancelar
      </button>
    </form>
  )

  return (
    <section className="tarjeta catalogo">
      <div className="titulo-seccion">
        <h2>{titulo}</h2>
        {!edicion && (
          <button className="secundario" onClick={() => setEdicion({ nombre: '', codigo: '' })}>
            Agregar
          </button>
        )}
      </div>
      {ayuda && <p className="ayuda">{ayuda}</p>}
      {error && <p className="error">{error}</p>}
      {edicion && !edicion.id && formulario}

      <ul className="catalogo-lista">
        {elementos.map((e) =>
          edicion?.id === e.id ? (
            <li key={e.id}>{formulario}</li>
          ) : (
            <li key={e.id}>
              <span className="catalogo-nombre">
                {e.nombre}
                {conCodigo && <span className="meta"> · {e.codigo}</span>}
              </span>
              <span className="meta">{uso(e)}</span>
              {porEliminar === e.id ? (
                <span className="acciones-evidencia">
                  <span className="meta">¿Eliminar?</span>
                  <button className="peligro" onClick={() => ejecutar(() => eliminar(e.id))} disabled={ocupado}>
                    Sí
                  </button>
                  <button className="secundario" onClick={() => setPorEliminar(null)} disabled={ocupado}>
                    No
                  </button>
                </span>
              ) : (
                <span className="acciones-evidencia">
                  <button
                    className="enlace"
                    onClick={() => {
                      setError(null)
                      setPorEliminar(null)
                      setEdicion({ id: e.id, nombre: e.nombre, codigo: e.codigo ?? '' })
                    }}
                  >
                    Renombrar
                  </button>
                  <button
                    className="enlace"
                    onClick={() => setPorEliminar(e.id)}
                    disabled={enUso(e)}
                    title={enUso(e) ? 'Está en uso: no se puede eliminar.' : undefined}
                  >
                    Eliminar
                  </button>
                </span>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  )
}

export default function CatalogosPage() {
  const [etiquetas, setEtiquetas] = useState(null)
  const [paises, setPaises] = useState(null)
  const [error, setError] = useState(null)

  async function cargar() {
    try {
      const [e, p] = await Promise.all([listarEtiquetasConUso(), listarPaisesConUso()])
      setEtiquetas(e)
      setPaises(p)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  if (error) return <p className="error">No se pudieron cargar los catálogos: {error}</p>
  if (!etiquetas || !paises) return <p className="centrado">Cargando…</p>

  return (
    <div className="catalogos">
      <Catalogo
        titulo="Etiquetas"
        ayuda="Si renombras o agregas etiquetas, descarga de nuevo la plantilla de Excel: las columnas usan estos nombres."
        elementos={etiquetas}
        uso={(e) => plural(e.proyectos, 'proyecto', 'proyectos')}
        enUso={(e) => e.proyectos > 0}
        guardar={async (d) => {
          await guardarEtiqueta(d)
          await cargar()
        }}
        eliminar={async (id) => {
          await eliminarEtiqueta(id)
          await cargar()
        }}
      />
      <Catalogo
        titulo="Países"
        elementos={paises}
        conCodigo
        uso={(p) => `${plural(p.proyectos, 'proyecto', 'proyectos')} · ${plural(p.usuarios, 'usuario', 'usuarios')}`}
        enUso={(p) => p.proyectos > 0 || p.usuarios > 0}
        guardar={async (d) => {
          await guardarPais(d)
          await cargar()
        }}
        eliminar={async (id) => {
          await eliminarPais(id)
          await cargar()
        }}
      />
    </div>
  )
}
