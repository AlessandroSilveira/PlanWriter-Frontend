// src/App.jsx
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import LoginPopover from "./components/LoginPopover.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Projects from "./pages/Projects.jsx";
import NewProject from "./pages/NewProject.jsx";
import ProjectDetails from "./pages/ProjectDetails.jsx";
import WritingDiary from "./pages/WritingDiary.jsx";
import Buddies from "./pages/Buddies.jsx";
import RegionsLeaderboard from "./pages/RegionsLeaderboard.jsx";
import Events from "./pages/Events.jsx";
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
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
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
          path="/write"
          element={
            <ProtectedRoute>
              <FocusEditor />
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
          path="/diary"
          element={
            <ProtectedRoute>
              <WritingDiary />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buddies"
          element={
            <ProtectedRoute>
              <Buddies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/regions"
          element={
            <ProtectedRoute>
              <RegionsLeaderboard />
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
        <Route
          path="/validate"
          element={
            <ProtectedRoute>
              <Validate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/winner"
          element={
            <ProtectedRoute>
              <WinnerGoodies />
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
          path="/me"
          element={
            <ProtectedRoute>
              <ProfileMe />
            </ProtectedRoute>
          }
        />
        <Route path="/u/:slug" element={<PublicProfile />} />

        <Route path="/resources" element={<Resources />} />
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>

      <LoginPopover
        open={loginOpen}
        anchorEl={anchorEl}
        onClose={() => setLoginOpen(false)}
      />
    </>
  );
}
