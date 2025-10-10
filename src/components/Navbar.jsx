import { useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onLoginClick }) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    try {
      logout?.(); // AuthContext
    } finally {
      // limpeza defensiva
      localStorage.removeItem("access_token");
      localStorage.removeItem("jwt");
      localStorage.removeItem("authToken");
      navigate("/", { replace: true });
    }
  };

  // switch antigo Claro ⇄ Escuro
  const toggleTheme = () => {
    const html = document.documentElement;
    const cur = html.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("pw_theme", next);
  };

  useEffect(() => {
    const saved = localStorage.getItem("pw_theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const goQuickLog = () => navigate("/progress/new");
  const linkClass = ({ isActive }) => `btn ghost ${isActive ? "active" : ""}`.trim();

  return (
    <nav className="navbar">
      <div className="container nav-row">
        {/* Brand */}
        <Link to="/" className="brand no-underline">
          <div className="logo">PW</div>
          <div className="title">
            <div className="name">PlanWriter</div>
            <div className="tag">foco, consistência e ritmo</div>
          </div>
        </Link>

        {/* Centro: navegação principal (quando logado) */}
        <div className="nav-center hidden md:flex items-center gap-2">
          {isAuthenticated && (
            <>
              <NavLink to="/projects" className={linkClass}>Seus Projetos</NavLink>
              <NavLink to="/write" className={linkClass}>Escrever</NavLink>
              <NavLink to="/sprint" className={linkClass}>Sprint</NavLink>
              <NavLink to="/me" className={linkClass}>Meu Perfil</NavLink>
              {/* Se quiser habilitar Recursos, tire o comentário abaixo */}
              {/* <NavLink to="/recursos" className={linkClass}>Recursos</NavLink> */}
              <NavLink to="/events" className={linkClass}>Eventos</NavLink>
              <NavLink to="/regions" className={linkClass}>Regiões</NavLink>

              {/* >>> NOVO LINK */}
              <NavLink to="/buddies" className={linkClass}>Buddies</NavLink>

              <button className="btn-primary" onClick={goQuickLog} type="button">
                + Registrar
              </button>
            </>
          )}
        </div>

        {/* Ações à direita */}
        <div className="nav-actions">
          {/* Switch antigo: Claro ⇄ Escuro */}
          <div className="theme-toggle" id="themeToggle">
            <span>Claro</span>
            <div
              className="switch"
              onClick={toggleTheme}
              role="switch"
              tabIndex={0}
              aria-checked={document.documentElement.getAttribute("data-theme") === "dark"}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTheme();
                }
              }}
              aria-label="Alternar tema claro/escuro"
            >
              <div className="knob"></div>
            </div>
            <span>Escuro</span>
          </div>

          {isAuthenticated ? (
            <button className="btn" onClick={handleLogout} type="button">
              Sair
            </button>
          ) : (
            <button
              className="btn"
              onClick={(e) => onLoginClick?.(e.currentTarget)} // abre popover ancorado
              type="button"
            >
              Entrar
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
