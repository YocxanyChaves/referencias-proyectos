import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NOMBRES_ROL = { admin: 'Administrador', editor: 'Editor', consulta: 'Consulta' }

export default function Layout() {
  const { perfil, rol, puedeCrear, cerrarSesion } = useAuth()

  return (
    <>
      <header className="encabezado">
        <strong>Referencias de Proyectos</strong>
        <nav>
          <NavLink to="/" end>
            Proyectos
          </NavLink>
          {puedeCrear && <NavLink to="/proyectos/nuevo">Nuevo proyecto</NavLink>}
        </nav>
        <div className="usuario">
          <span>
            {perfil.nombre} · {NOMBRES_ROL[rol]}
            {perfil.paisNombre && ` · ${perfil.paisNombre}`}
          </span>
          <button className="secundario" onClick={cerrarSesion}>
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
