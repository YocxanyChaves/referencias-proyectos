import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RutaProtegida from './components/RutaProtegida'
import { AuthProvider } from './context/AuthContext'
import AdministracionPage from './pages/AdministracionPage'
import BitacoraPage from './pages/BitacoraPage'
import CatalogosPage from './pages/CatalogosPage'
import CrearContrasenaPage from './pages/CrearContrasenaPage'
import EditarProyectoPage from './pages/EditarProyectoPage'
import ExportarPage from './pages/ExportarPage'
import LoginPage from './pages/LoginPage'
import NuevoProyectoPage from './pages/NuevoProyectoPage'
import ProyectoDetallePage from './pages/ProyectoDetallePage'
import ProyectosPage from './pages/ProyectosPage'
import UsuariosPage from './pages/UsuariosPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/crear-contrasena" element={<CrearContrasenaPage />} />
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
