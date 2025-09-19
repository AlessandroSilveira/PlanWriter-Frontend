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
      <Route
        path="/sprint"
        element={
          <ProtectedRoute>
            <WordSprint />
          </ProtectedRoute>
       }
      />
        <Route path="/recursos" element={
     <ProtectedRoute>
       <Resources />
     </ProtectedRoute>
   } />

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
   
      <LoginPopover
        open={loginOpen}
        anchorEl={anchorEl}
        onClose={() => setLoginOpen(false)}
      />
    </AuthProvider>
  );
}
