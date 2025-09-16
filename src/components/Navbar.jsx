import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onLoginClick }) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    try {
      logout(); // limpa token do contexto/localStorage
    } finally {
      // limpa chaves antigas, por garantia
      localStorage.removeItem("access_token");
      localStorage.removeItem("jwt");
      localStorage.removeItem("authToken");
      // agora temos landing como home
      navigate("/", { replace: true });
    }
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    const next = isDark ? "sepia" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("pw_theme", next);
  };

  // garante tema salvo (apenas client)
  useEffect(() => {
    const saved = localStorage.getItem("pw_theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  return (
    <nav className="navbar">
      <div className="container nav-row">
        <Link to="/" className="brand no-underline">
          <div className="logo">PW</div>
          <div className="title">
            <div className="name">PlanWriter</div>
            <div className="tag">foco, consistência e ritmo</div>
          </div>
        </Link>

        <div></div>

        <div className="nav-actions">
          <div className="theme-toggle" id="themeToggle">
            <span>Claro</span>
            <div className="switch" onClick={toggleTheme}>
              <div className="knob"></div>
            </div>
            <span>Escuro</span>
          </div>

          {isAuthenticated ? (
            <button className="btn" onClick={handleLogout}>Sair</button>
          ) : (
            <button
              className="btn"
              onClick={(e) => onLoginClick?.(e.currentTarget)} // abre popover ancorado
            >
              Entrar
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
