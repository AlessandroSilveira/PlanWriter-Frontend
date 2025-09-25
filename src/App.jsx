// src/App.jsx
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar.jsx";
import LoginPopover from "./components/LoginPopover.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

// Pages já existentes
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewProject from "./pages/NewProject.jsx";
import ProjectDetails from "./pages/ProjectDetails.jsx";

// Novas/Outras páginas usadas nas rotas abaixo
import WordSprint from "./pages/WordSprint.jsx";
import Resources from "./pages/Resources.jsx";
import ProfileMe from "./pages/ProfileMe.jsx";
import QuickLog from "./pages/QuickLog.jsx";
import FocusEditor from "./pages/FocusEditor.jsx";
import Validate from "./pages/Validate.jsx";
import Certificate from "./pages/Certificate.jsx";
import Events from "./pages/Events.jsx";
import WritingDiary from "./pages/WritingDiary.jsx"; // << Diário da Escrita

export default function App() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <AuthProvider>
      <Navbar
        onLoginClick={(el) => {
          setAnchorEl(el);
          setLoginOpen(true);
        }}
      />

      {/* Todas as rotas devem ficar dentro de <Routes> */}
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Landing />} />

        {/* Protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/new"
          element={
            <ProtectedRoute>
              <NewProject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sprint"
          element={
            <ProtectedRoute>
              <WordSprint />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recursos"
          element={
            <ProtectedRoute>
              <Resources />
            </ProtectedRoute>
          }
        />

        <Route
          path="/me"
          element={
            <ProtectedRoute>
              <ProfileMe />
            </ProtectedRoute>
          }
        />

        <Route
          path="/progress/new"
          element={
            <ProtectedRoute>
              <QuickLog />
            </ProtectedRoute>
          }
        />

        <Route
          path="/write"
          element={
            <ProtectedRoute>
              <FocusEditor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/validate"
          element={
            <ProtectedRoute>
              <Validate />
            </ProtectedRoute>
          }
        />

        <Route
          path="/certificate"
          element={
            <ProtectedRoute>
              <Certificate />
            </ProtectedRoute>
          }
        />

        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          }
        />

        {/* NOVA: Diário da Escrita */}
        <Route
          path="/diary"
          element={
            <ProtectedRoute>
              <WritingDiary />
            </ProtectedRoute>
          }
        />

        {/* Opcional: rota 404
        <Route path="*" element={<NotFound />} />
        */}
      </Routes>

      <LoginPopover
        open={loginOpen}
        anchorEl={anchorEl}
        onClose={() => setLoginOpen(false)}
      />
    </AuthProvider>
  );
}
