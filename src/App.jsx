// src/App.jsx
import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import LoginPopover from "./components/LoginPopover.jsx";

import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import RequirePasswordChange from "./routes/RequirePasswordChange.jsx";
import AdminRoute from "./routes/AdminRoute.jsx";

import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Projects from "./pages/Projects.jsx";
import NewProject from "./pages/NewProject.jsx";
import ProjectDetails from "./pages/ProjectDetails.jsx";
import WritingDiary from "./pages/WritingDiary.jsx";
import Buddies from "./pages/Buddies.jsx";
import RegionsLeaderboard from "./pages/RegionsLeaderboard.jsx";
import Events from "./pages/Events.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import Validate from "./pages/Validate.jsx";
import WinnerGoodies from "./pages/WinnerGoodies.jsx";
import Certificate from "./pages/Certificate.jsx";
import WordSprint from "./pages/WordSprint.jsx";
import FocusEditor from "./pages/FocusEditor.jsx";
import ProfileMe from "./pages/ProfileMe.jsx";
import PublicProfile from "./pages/PublicProfile.jsx";
import Resources from "./pages/Resources.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";

// ADMIN
import AdminEvents from "./pages/admin/AdminEvents.jsx";
import AdminEventCreate from "./pages/admin/AdminEventCreate.jsx";
import EditEvent from "./pages/admin/EditEvent.jsx";

export default function App() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <>
      <Navbar
        onLoginClick={(e) => {
          setAnchorEl(e?.currentTarget || null);
          setLoginOpen(true);
        }}
      />

      <Routes>
        {/* 🌍 Públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/u/:slug" element={<PublicProfile />} />

        {/* 🔐 Troca obrigatória de senha */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />


        {/* 🔒 Área logada (senha já trocada) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <Dashboard />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <Projects />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/new"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <NewProject />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <ProjectDetails />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/write"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <FocusEditor />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sprint"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <WordSprint />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/diary"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <WritingDiary />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/buddies"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <Buddies />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/regions"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <RegionsLeaderboard />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <Events />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <EventDetails />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/validate"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <Validate />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/winner"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <WinnerGoodies />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/certificate"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <Certificate />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/me"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <ProfileMe />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        {/* 👑 ADMIN */}
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <AdminRoute>
                  <AdminEvents />
                </AdminRoute>
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/new"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <AdminRoute>
                  <AdminEventCreate />
                </AdminRoute>
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
             <ProtectedRoute>
              <RequirePasswordChange>
                <AdminRoute>
              <AdminEvents />
            </AdminRoute>
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/:id/edit"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <AdminRoute>
                  <EditEvent />
                </AdminRoute>
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />



      </Routes>

      <LoginPopover
        open={loginOpen}
        anchorEl={anchorEl}
        onClose={() => setLoginOpen(false)}
      />
    </>
  );
}
