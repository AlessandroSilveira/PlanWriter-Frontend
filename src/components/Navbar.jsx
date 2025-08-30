import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    html.setAttribute("data-theme", isDark ? "sepia" : "dark");
    localStorage.setItem("pw_theme", isDark ? "sepia" : "dark");
  };

  // garante tema salvo
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("pw_theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="navbar">
    <div className="container nav-row">
      <div className="brand">
        <div className="logo">PW</div>
        <div className="title">
          <div className="name">PlanWriter</div>
          <div className="tag">foco, consistência e ritmo</div>
        </div>
      </div>
      <div></div>
      <div className="nav-actions">
        <div className="theme-toggle" id="themeToggle">
          <span>Claro</span>
          <div className="switch"><div className="knob"></div></div>
          <span>Escuro</span>
        </div>
        <button className="btn">Sair</button>
      </div>
    </div>
  </nav>
  );
}
