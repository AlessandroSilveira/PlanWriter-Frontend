import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
