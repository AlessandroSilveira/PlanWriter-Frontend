import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPopover from "./LoginPopover";

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isLanding = location.pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  // Login popover
  const [loginOpen, setLoginOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    if (!isLanding) return;

    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLanding]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const navBase =
    "fixed top-0 inset-x-0 z-50 transition-all duration-300";

  const navLanding =
    isLanding && !scrolled
      ? "bg-transparent text-slate-900"
      : "bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm";

  return (
    <header className={`${navBase} ${navLanding}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="text-lg font-semibold tracking-tight">
          PlanWriter
        </Link>

        {/* LANDING (deslogado) */}
        {!isAuthenticated && isLanding && (
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                setAnchorEl(e.currentTarget);
                setLoginOpen(true);
              }}
              className="
                px-4 py-2 rounded-md
                text-sm font-medium
                border border-slate-300
                hover:bg-slate-100
                transition
              "
            >
              Entrar
            </button>

            <LoginPopover
              open={loginOpen}
              anchorEl={anchorEl}
              onClose={() => setLoginOpen(false)}
            />
          </div>
        )}

        {/* APP (logado) */}
        {isAuthenticated && (
          <nav className="flex items-center gap-2">
            <NavLink to="/dashboard" className={navLink}>
              Dashboard
            </NavLink>
            <NavLink to="/projects" className={navLink}>
              Projetos
            </NavLink>
            <NavLink to="/events" className={navLink}>
              Eventos
            </NavLink>
            <NavLink to="/buddies" className={navLink}>
              Buddies
            </NavLink>

            <button
              onClick={handleLogout}
              className="
                ml-3 px-3 py-2 rounded-md
                text-sm text-rose-600
                hover:bg-rose-50
                transition
              "
            >
              Sair
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}

const navLink = ({ isActive }) =>
  `
  px-3 py-2 rounded-md text-sm font-medium
  transition
  ${isActive
    ? "bg-indigo-600 text-white"
    : "text-slate-700 hover:bg-slate-100"}
`;
