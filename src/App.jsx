import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RutaProtegida from './components/RutaProtegida'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import ProyectosPage from './pages/ProyectosPage'

// Login y el listado van en el paquete inicial; las demás páginas se descargan al abrirlas.
const AdministracionPage = lazy(() => import('./pages/AdministracionPage'))
const BitacoraPage = lazy(() => import('./pages/BitacoraPage'))
const CatalogosPage = lazy(() => import('./pages/CatalogosPage'))
const CrearContrasenaPage = lazy(() => import('./pages/CrearContrasenaPage'))
const EditarProyectoPage = lazy(() => import('./pages/EditarProyectoPage'))
const ExportarPage = lazy(() => import('./pages/ExportarPage'))
const NuevoProyectoPage = lazy(() => import('./pages/NuevoProyectoPage'))
const ProyectoDetallePage = lazy(() => import('./pages/ProyectoDetallePage'))
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/crear-contrasena"
            element={
              <Suspense fallback={<p className="centrado">Cargando…</p>}>
                <CrearContrasenaPage />
              </Suspense>
            }
          />
          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              <Route index element={<ProyectosPage />} />
              <Route path="/proyectos/:id" element={<ProyectoDetallePage />} />
              <Route path="/exportar" element={<ExportarPage />} />
              <Route element={<RutaProtegida requiereCrear />}>
                <Route path="/proyectos/nuevo" element={<NuevoProyectoPage />} />
                <Route path="/proyectos/:id/editar" element={<EditarProyectoPage />} />
              </Route>
              <Route element={<RutaProtegida requiereAdmin />}>
                <Route path="/admin" element={<AdministracionPage />}>
                  <Route index element={<Navigate to="usuarios" replace />} />
                  <Route path="usuarios" element={<UsuariosPage />} />
                  <Route path="catalogos" element={<CatalogosPage />} />
                  <Route path="bitacora" element={<BitacoraPage />} />
                </Route>
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
