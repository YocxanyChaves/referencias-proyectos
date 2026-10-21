import { FileDown, FolderSearch, LogOut, PlusCircle, Settings } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import logoIcap from '../assets/icap-logo-mark.png'
import { useAuth } from '../context/AuthContext'
import { useSeleccion, vaciar } from '../lib/seleccionExportacion'

const NOMBRES_ROL = { admin: 'Administrador', editor: 'Editor', consulta: 'Consulta' }

function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase() || '?'
}

// Cada enlace lleva un texto largo (escritorio) y uno corto (teléfono).
function Enlace({ to, end, icono: Icono, largo, corto, children }) {
  return (
    <NavLink to={to} end={end}>
      <Icono aria-hidden="true" />
      <span className="texto-largo-nav">{largo}</span>
      <span className="texto-corto-nav">{corto ?? largo}</span>
      {children}
    </NavLink>
  )
}

export default function Layout() {
  const { perfil, rol, puedeCrear, cerrarSesion } = useAuth()
  const seleccion = useSeleccion()

  const enlaces = (
    <>
      <Enlace to="/" end icono={FolderSearch} largo="Proyectos" />
      <Enlace to="/exportar" icono={FileDown} largo="Exportar">
        {seleccion.length > 0 && <span className="contador">{seleccion.length}</span>}
      </Enlace>
      {puedeCrear && <Enlace to="/proyectos/nuevo" icono={PlusCircle} largo="Nuevo proyecto" corto="Nuevo" />}
      {rol === 'admin' && <Enlace to="/admin" icono={Settings} largo="Administración" corto="Admin" />}
    </>
  )

  return (
    <>
      <div className="cabecera">
        <header className="barra">
          <Link to="/" className="marca" title="Ir a proyectos">
            <span className="marca-logo">
              <img src={logoIcap} alt="Isotipo ICAP" draggable={false} />
            </span>
            <span className="marca-nombre">ICAP</span>
            <span className="marca-sub">Referencias de Proyectos</span>
          </Link>

          <div className="barra-centro">
            <nav className="segmentos">{enlaces}</nav>
          </div>

          <div className="usuario">
            <span className="usuario-avatar" aria-hidden="true">
              {iniciales(perfil.nombre)}
            </span>
            <span className="usuario-datos">
              <strong>{perfil.nombre}</strong>
              <span>
                {NOMBRES_ROL[rol]}
                {perfil.paisNombre && ` · ${perfil.paisNombre}`}
              </span>
            </span>
            <button
              className="boton-salir"
              title="Cerrar sesión"
              onClick={() => {
                vaciar() // la selección no pasa a la siguiente persona que use el navegador
                cerrarSesion()
              }}
            >
              <LogOut aria-hidden="true" />
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* En tablet y teléfono el menú baja a su propia fila, como en el brochure. */}
        <div className="barra-movil">
          <nav className="segmentos">{enlaces}</nav>
        </div>
      </div>
      <main className="contenido">
        <Outlet />
      </main>
    </>
  )
}
