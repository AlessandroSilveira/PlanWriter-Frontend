import { Link, useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";
import { Moon, Sun } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b shadow-sm">
      <Link to="/" className="font-bold text-xl text-accent">
        PlanWriter
      </Link>
      <div className="flex items-center gap-4">
        <button onClick={toggle} className="text-sm border px-2 py-1 rounded flex items-center gap-2">
          {theme === "sepia" ? <Moon size={16} /> : <Sun size={16} />}
          {theme === "sepia" ? "Escuro" : "Claro"}
        </button>
        <button onClick={logout} className="text-sm border px-2 py-1 rounded">
          Sair
        </button>
      </div>
    </header>
  );
}
