import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSeleccion, vaciar } from '../lib/seleccionExportacion'

const NOMBRES_ROL = { admin: 'Administrador', editor: 'Editor', consulta: 'Consulta' }

export default function Layout() {
  const { perfil, rol, puedeCrear, cerrarSesion } = useAuth()
  const seleccion = useSeleccion()

  return (
    <>
      <header className="encabezado">
        <strong>Referencias de Proyectos</strong>
        <nav>
          <NavLink to="/" end>
            Proyectos
          </NavLink>
          <NavLink to="/exportar">
            Exportar
            {seleccion.length > 0 && <span className="contador">{seleccion.length}</span>}
          </NavLink>
          {puedeCrear && <NavLink to="/proyectos/nuevo">Nuevo proyecto</NavLink>}
          {rol === 'admin' && <NavLink to="/admin">Administración</NavLink>}
        </nav>
        <div className="usuario">
          <span>
            {perfil.nombre} · {NOMBRES_ROL[rol]}
            {perfil.paisNombre && ` · ${perfil.paisNombre}`}
          </span>
          <button
            className="secundario"
            onClick={() => {
              vaciar() // la selección no pasa a la siguiente persona que use el navegador
              cerrarSesion()
            }}
          >
            Salir
          </button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </>
  )
}
