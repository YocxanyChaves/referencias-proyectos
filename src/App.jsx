import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RutaProtegida from './components/RutaProtegida'
import { AuthProvider } from './context/AuthContext'
import CrearContrasenaPage from './pages/CrearContrasenaPage'
import EditarProyectoPage from './pages/EditarProyectoPage'
import LoginPage from './pages/LoginPage'
import NuevoProyectoPage from './pages/NuevoProyectoPage'
import ProyectoDetallePage from './pages/ProyectoDetallePage'
import ProyectosPage from './pages/ProyectosPage'

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
              <Route element={<RutaProtegida requiereCrear />}>
                <Route path="/proyectos/nuevo" element={<NuevoProyectoPage />} />
                <Route path="/proyectos/:id/editar" element={<EditarProyectoPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
