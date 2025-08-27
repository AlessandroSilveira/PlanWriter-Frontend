import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ProjectDetails from './pages/ProjectDetails.jsx'
import NewProject from './pages/NewProject.jsx' // ✅ IMPORTAÇÃO
import PrivateRoute from './components/PrivateRoute.jsx'
import Layout from './components/Layout.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] font-serif">
      <Routes>
        {/* rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* rotas privadas com Layout */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/projects/new" // ✅ ANTES do :id
          element={
            <PrivateRoute>
              <Layout>
                <NewProject />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/projects/:id"
          element={
            <PrivateRoute>
              <Layout>
                <ProjectDetails />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}
