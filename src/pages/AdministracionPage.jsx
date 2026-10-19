import { NavLink, Outlet } from 'react-router-dom'

export default function AdministracionPage() {
  return (
    <div className="administracion">
      <nav className="pestanas">
        <NavLink to="usuarios">Usuarios</NavLink>
        <NavLink to="catalogos">Catálogos</NavLink>
        <NavLink to="bitacora">Bitácora</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
