// src/App.jsx
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar.jsx";
import LoginPopover from "./components/LoginPopover.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewProject from "./pages/NewProject.jsx";
import ProjectDetails from "./pages/ProjectDetails.jsx";

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

      <Routes>
        <Route path="/" element={<Landing />} />
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
      </Routes>

      <LoginPopover
        open={loginOpen}
        anchorEl={anchorEl}
        onClose={() => setLoginOpen(false)}
      />
    </AuthProvider>
  );
}
