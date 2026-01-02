// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPopover from "../components/LoginPopover"; // <-- IMPORTANTE

export default function Navbar() {

  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // ESTADOS DO POPOVER
  const [loginOpen, setLoginOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // TEMA
  const [theme, setTheme] = useState("light");

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pw_theme", next);
  };

  useEffect(() => {
    const saved = localStorage.getItem("pw_theme") || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const handleLogout = () => {
    logout?.();
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition ${
      isActive
        ? "bg-indigo-600 text-white shadow"
        : "text-gray-700 hover:bg-gray-200"
    }`;

  return (
    <div className="w-full sticky top-0 z-50 shadow-sm bg-white/90 backdrop-blur-md border-b border-gray-200">

      {/* ----------------------- */}
      {/* Linha Superior */}
      {/* ----------------------- */}
      <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 select-none">
          <div className="w-10 h-10 bg-[#004f5d] rounded-full flex items-center justify-center text-white font-bold">
            PW
          </div>
          <div className="text-lg font-semibold tracking-tight">
            PlanWriter
          </div>
        </Link>

        {/* Tema + Botões */}
        <div className="flex items-center gap-6">

          {/* Toggle Tema */}
          <div className="flex items-center gap-2 text-sm">
            <span>Claro</span>
            <label className="relative inline-flex cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={theme === "dark"}
                onChange={toggleTheme}
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 rounded-full peer peer-checked:bg-gray-700 transition"></div>
              <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></span>
            </label>
            <span>Escuro</span>
          </div>

          {/* Entrar / Sair */}
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition"
            >
              Sair
            </button>
          ) : (
            <>
              <button
                onClick={(e) => {
                  setAnchorEl(e.currentTarget);   // botão origem
                  setLoginOpen(true);             // abre popup
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
              >
                Entrar
              </button>

              {/* POPOVER DE LOGIN */}
              <LoginPopover
                open={loginOpen}
                anchorEl={anchorEl}
                onClose={() => setLoginOpen(false)}
              />
            </>
          )}
        </div>
      </div>

      {/* ----------------------- */}
      {/* Submenu – Linha inferior */}
      {/* ----------------------- */}
      {isAuthenticated && (
        <div className="bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto flex items-center gap-2 px-4 py-2 overflow-x-auto">

            <NavLink to="/projects" className={linkClass}>
              Seus Projetos
            </NavLink>

            <NavLink to="/write" className={linkClass}>
              Escrever
            </NavLink>

            <NavLink to="/sprint" className={linkClass}>
              Sprint
            </NavLink>

            <NavLink to="/me" className={linkClass}>
              Meu Perfil
            </NavLink>

            <NavLink to="/events" className={linkClass}>
              Eventos
            </NavLink>

            <NavLink to="/regions" className={linkClass}>
              Regiões
            </NavLink>

            <NavLink to="/buddies" className={linkClass}>
              Buddies
            </NavLink>

            {/* Botão Registrar – lado direito */}
            <button
              className="ml-auto px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
              onClick={() => navigate("/progress/new")}
            >
              + Registrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
