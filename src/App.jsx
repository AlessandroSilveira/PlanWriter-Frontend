// src/App.jsx
import { Suspense, lazy, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import LoginPopover from "./components/LoginPopover.jsx";

import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import RequirePasswordChange from "./routes/RequirePasswordChange.jsx";
import AdminRoute from "./routes/AdminRoute.jsx";

const Landing = lazy(() => import("./pages/Landing.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Projects = lazy(() => import("./pages/Projects.jsx"));
const NewProject = lazy(() => import("./pages/NewProject.jsx"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails.jsx"));
const WritingDiary = lazy(() => import("./pages/WritingDiary.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Buddies = lazy(() => import("./pages/Buddies.jsx"));
const Events = lazy(() => import("./pages/Events.jsx"));
const EventDetails = lazy(() => import("./pages/EventDetails.jsx"));
const Validate = lazy(() => import("./pages/Validate.jsx"));
const WinnerGoodies = lazy(() => import("./pages/WinnerGoodies.jsx"));
const Certificate = lazy(() => import("./pages/Certificate.jsx"));
const FocusEditor = lazy(() => import("./pages/FocusEditor.jsx"));
const ProfileMe = lazy(() => import("./pages/ProfileMe.jsx"));
const PublicProfile = lazy(() => import("./pages/PublicProfile.jsx"));
const Resources = lazy(() => import("./pages/Resources.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const ChangePassword = lazy(() => import("./pages/ChangePassword.jsx"));

// ADMIN
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents.jsx"));
const AdminEventCreate = lazy(() => import("./pages/admin/AdminEventCreate.jsx"));
const EditEvent = lazy(() => import("./pages/admin/EditEvent.jsx"));

function RouteFallback() {
  return (
    <div className="container py-8">
      <div className="panel">
        <p className="text-sm text-gray-600">Carregando...</p>
      </div>
    </div>
  );
}

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

      <Suspense fallback={<RouteFallback />}>
        <Routes>
        {/* 🌍 Públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/?auth=register" replace />} />
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
                <Navigate to="/editor" replace />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sprint"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <Navigate to="/editor?mode=sprint" replace />
              </RequirePasswordChange>
            </ProtectedRoute>
          }
        />

        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <FocusEditor />
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
          path="/reports"
          element={
            <ProtectedRoute>
              <RequirePasswordChange>
                <Reports />
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
      </Suspense>

      <LoginPopover
        open={loginOpen}
        anchorEl={anchorEl}
        onClose={() => setLoginOpen(false)}
      />
    </>
  );
}
